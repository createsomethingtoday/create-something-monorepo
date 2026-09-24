import { DurableObject } from 'cloudflare:workers';
import { Sandbox, getSandbox } from '@cloudflare/sandbox';
import { LIMITS, admit, authorized, stopped } from './policy.mjs';

// No ports/tunnels are exposed. This worker never accepts uploaded code.
export class ValidationSandbox extends Sandbox {
  enableInternet = false;
  sleepAfter = '2m';
  async qualifyOwned(mode) {
    if (!['control', 'restricted', 'isolated', 'memory'].includes(mode)) throw new Error('Owned mode required');
    this.enableInternet = mode === 'control' || mode === 'isolated';
    if (mode === 'memory') return this.exec("sh -c 'timeout --signal=KILL 18s sh /opt/private-isolate.sh memory; status=$?; dmesg | tail -40; exit $status'", { timeout: 22000 });
    if (mode === 'isolated') return this.exec('timeout --signal=KILL 18s sh /opt/private-isolate.sh', { timeout: 22000 });
    return this.exec('timeout --signal=KILL 18s su -s /bin/sh nobody -c "node /opt/private-qualify.mjs"', { timeout: 22000 });
  }
}

const bounded = async (operation, ms = 10000) => {
  let timer;
  try { return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Supervisor operation timed out; reservation retained')), ms); })]); }
  finally { clearTimeout(timer); }
};

const initial = () => ({ issued: 0, active: null, runs: {} });
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export class Coordinator extends DurableObject {
  sandbox(id) {
    return getSandbox(this.env.Sandbox, `private-validation-v3-${id}`, {
      normalizeId: true, sleepAfter: '2m', keepAlive: false, enableDefaultSession: false,
    });
  }

  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/status') return json(await this.ctx.storage.get('ledger') ?? initial());
    if (pathname === '/cleanup') {
      const state = await this.ctx.storage.get('ledger') ?? initial();
      if (state.active) await this.cleanup(state.active, 'operator-reconcile');
      return json(await this.ctx.storage.get('ledger') ?? initial());
    }
    let text;
    // The front door already rejects bodies over this bound while reading.
    try { text = JSON.parse(await request.text()); } catch { return json({ error: 'invalid_json' }, 400); }
    const result = await this.ctx.storage.transaction(async tx => {
      const state = await tx.get('ledger') ?? initial();
      const r = admit(state, text, Date.now());
      if (r.next) {
        await tx.put('ledger', r.next);
        await tx.setAlarm(r.run.deadline);
      }
      return r;
    });
    if (result.status !== 202) return json({ error: result.error, duplicate: result.duplicate, run: result.run }, result.status);
    this.ctx.waitUntil(this.execute(result.run));
    return json({ run: result.run }, 202);
  }

  async update(id, change) {
    return this.ctx.storage.transaction(async tx => {
      const state = await tx.get('ledger');
      if (!state?.runs[id] || state.active !== id) return;
      Object.assign(state.runs[id], change);
      await tx.put('ledger', state);
    });
  }

  async execute(run) {
    const sandbox = this.sandbox(run.id);
    try {
      await this.update(run.id, { status: 'running', dispatchPending: true });
      if (run.mode === 'abandon') {
        await sandbox.startProcess('sleep 300', { processId: 'owned-abandon-fixture' });
        await this.update(run.id, { status: 'awaiting-deadline-reaper', dispatchPending: false });
        return;
      }
      const result = ['control', 'restricted', 'isolated', 'memory'].includes(run.mode) ? await sandbox.qualifyOwned(run.mode) : await sandbox.exec('timeout --signal=KILL 6s su -s /bin/sh nobody -c "node /opt/private-probe.mjs"', { timeout: 10000 });
      const output = result.stdout.slice(0, 8192);
      await this.update(run.id, { dispatchPending: false, execution: { exitCode: result.exitCode, output, stderr: result.stderr.slice(0, 1024) } });
      if (run.mode === 'cleanup-fault') {
        await this.update(run.id, { status: 'injected-cleanup-failure' });
        return; // Deliberately leave cleanup to the independent Durable Object alarm.
      }
    } catch (error) {
      await this.update(run.id, { status: 'execution-error', dispatchPending: false, error: String(error.message).slice(0, 512) });
    }
    await this.cleanup(run.id, 'normal');
  }

  async cleanup(id, reason) {
    // A new job cannot start until destruction has authoritative readback.
    try {
      const sandbox = this.sandbox(id);
      const beforeDestroy = await bounded(sandbox.getState());
      await bounded(sandbox.destroy());
      const observed = await bounded(sandbox.getState());
      if (!stopped(observed)) throw new Error('Container stop not confirmed');
      await this.ctx.storage.transaction(async tx => {
        const state = await tx.get('ledger');
        if (state.active !== id) return;
        if (state.runs[id].dispatchPending) throw new Error('Dispatch remains unresolved; reservation retained');
        Object.assign(state.runs[id], { status: 'cleaned', cleanupReason: reason, beforeDestroy, stoppedState: observed,
          endedAt: Date.now(), elapsedMs: Date.now() - state.runs[id].startedAt });
        state.active = null;
        await tx.put('ledger', state);
        await tx.deleteAlarm();
      });
    } catch (error) {
      await this.ctx.storage.transaction(async tx => {
        const state = await tx.get('ledger');
        if (state.active !== id) return;
        const run = state.runs[id];
        run.status = 'quarantined'; run.cleanupAttempts++;
        run.cleanupError = String(error.message).slice(0, 512);
        await tx.put('ledger', state);
        if (run.cleanupAttempts < LIMITS.cleanupAttempts) await tx.setAlarm(Date.now() + 10000);
        else await tx.deleteAlarm();
      });
    }
  }

  async alarm() {
    const state = await this.ctx.storage.get('ledger');
    if (state?.active) await this.cleanup(state.active, 'deadline-reaper');
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'GET' && new URL(request.url).pathname === '/qualification-canary') return new Response('private-owned-canary-v1', { headers: { 'Cache-Control': 'no-store' } });
    // Ephemeral operator-only acceptance credential, never a customer login or publication authorization.
    if (!await authorized(request.headers.get('Authorization'), env.OPERATOR_TOKEN)) {
      return json({ error: 'unauthorized' }, 401);
    }
    const url = new URL(request.url);
    if (![['GET', '/status'], ['POST', '/run'], ['POST', '/cleanup']].some(([m, p]) => request.method === m && url.pathname === p)) {
      return json({ error: 'not_found' }, 404);
    }
    let body = '';
    if (request.body) {
      const reader = request.body.getReader(); let bytes = 0;
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 512) { await reader.cancel(); return json({ error: 'body_too_large' }, 413); }
        chunks.push(value);
      }
      body = new TextDecoder().decode(Uint8Array.from(chunks.flatMap(c => [...c])));
    }
    const coordinator = env.Coordinator.get(env.Coordinator.idFromName('cre-2094-qualification-v3'));
    return coordinator.fetch(new Request(`https://coordinator${url.pathname}`, {
      method: request.method, ...(request.method === 'POST' ? { body } : {}),
    }));
  },
};
