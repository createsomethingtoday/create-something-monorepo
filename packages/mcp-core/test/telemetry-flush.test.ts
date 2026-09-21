import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Langfuse } from 'langfuse';
import { enableTelemetry } from '../src/telemetry.ts';

for (const registration of ['tool', 'registerTool'] as const) {
  for (const outcome of ['success', 'error'] as const) {
    test(`${registration} awaits opted-in flush and preserves ${outcome}`, async (t) => {
      let release!: () => void;
      const flushed = new Promise<void>((resolve) => { release = resolve; });
      t.mock.method(Langfuse.prototype, 'trace', () => ({ span: () => ({ end() {} }) }));
      const flush = t.mock.method(Langfuse.prototype, 'flushAsync', () => flushed);
      let handler!: () => Promise<unknown>;
      const server = {
        tool(...args: any[]) { handler = args.at(-1); },
        registerTool(...args: any[]) { handler = args.at(-1); },
      };
      enableTelemetry(server as any, undefined, 'fixture', () => 'test-account', {
        publicKey: 'fixture-public', secretKey: 'fixture-secret', awaitFlush: true,
      });
      const result = { content: [{ type: 'text', text: 'ok' }] };
      const error = new Error('original tool failure');
      server[registration]('fixture', {}, async () => {
        if (outcome === 'error') throw error;
        return result;
      });
      let settled = false;
      const pending = handler().then(
        (value) => { settled = true; return { value }; },
        (reason) => { settled = true; return { reason }; },
      );
      await setImmediate();
      try {
        assert.equal(flush.mock.callCount(), 1);
        assert.equal(settled, false, 'tool must remain pending until flush completes');
      } finally { release(); }
      const actual = await pending;
      if (outcome === 'error') assert.equal((actual as any).reason, error);
      else assert.equal((actual as any).value, result);
    });
  }
}

test('default flush remains nonblocking', async (t) => {
  let release!: () => void;
  const flushed = new Promise<void>((resolve) => { release = resolve; });
  t.mock.method(Langfuse.prototype, 'trace', () => ({ span: () => ({ end() {} }) }));
  t.mock.method(Langfuse.prototype, 'flushAsync', () => flushed);
  let handler!: () => Promise<unknown>;
  const server = { tool(...args: any[]) { handler = args.at(-1); } };
  enableTelemetry(server as any, undefined, 'fixture');
  server.tool('fixture', async () => 'result');
  try { assert.equal(await handler(), 'result'); } finally { release(); }
});

for (const outcome of ['success', 'error'] as const) {
  test(`flush failure preserves tool ${outcome}`, async (t) => {
    t.mock.method(Langfuse.prototype, 'trace', () => ({ span: () => ({ end() {} }) }));
    t.mock.method(Langfuse.prototype, 'flushAsync', async () => { throw new Error('telemetry unavailable'); });
    t.mock.method(console, 'warn', () => {});
    let handler!: () => Promise<unknown>;
    const server = { tool(...args: any[]) { handler = args.at(-1); } };
    enableTelemetry(server as any, undefined, 'fixture', undefined, { awaitFlush: true });
    const error = new Error('tool error');
    server.tool('fixture', async () => { if (outcome === 'error') throw error; return 'result'; });
    if (outcome === 'error') await assert.rejects(handler(), (e) => e === error);
    else assert.equal(await handler(), 'result');
  });
}
