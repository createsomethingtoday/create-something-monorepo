import { spawn } from 'node:child_process';
import { hostname } from 'node:os';

import { adapterCommand } from '../src/agent-relay.js';

const origin = (process.env.INK_BRIDGE_ORIGIN || 'https://ink.createsomething.agency').replace(
  /\/+$/,
  ''
);
const token = process.env.INK_RELAY_TOKEN?.trim() || '';
const relayId = (process.env.INK_RELAY_ID || hostname())
  .replace(/[^A-Za-z0-9_-]/g, '-')
  .slice(0, 96);
const providers = (process.env.INK_RELAY_PROVIDERS || 'claude,codex')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const pollMs = Math.max(1_000, Number(process.env.INK_RELAY_POLL_MS || 5_000));
const commandTimeoutMs = Math.max(
  10_000,
  Number(process.env.INK_RELAY_COMMAND_TIMEOUT_MS || 10 * 60_000)
);
const once = process.argv.includes('--once');

if (!token) throw new Error('INK_RELAY_TOKEN is required.');

async function bridge(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ink-token': token },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || `Ink bridge returned HTTP ${response.status}.`);
  return payload;
}

async function receipt(decision, state, summary = '', error = '') {
  await bridge(`/ink/agent-decisions/${encodeURIComponent(decision.id)}/receipt`, {
    relay_id: relayId,
    state,
    summary,
    error
  });
}

function execute(decision) {
  const command = adapterCommand(decision, {
    claudeExecutable: process.env.INK_CLAUDE_EXECUTABLE,
    codexExecutable: process.env.INK_CODEX_EXECUTABLE
  });

  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd: process.env.INK_AGENT_WORKDIR || process.cwd(),
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const capture = (current, chunk) => (current + chunk.toString('utf8')).slice(-16_000);
    child.stdout.on('data', (chunk) => {
      stdout = capture(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = capture(stderr, chunk);
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Agent adapter exceeded ${commandTimeoutMs}ms.`));
    }, commandTimeoutMs);

    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error((stderr || stdout || `Agent adapter exited ${code}.`).trim().slice(0, 220))
        );
        return;
      }
      resolve((stdout.trim() || 'Agent accepted steering.').slice(0, 220));
    });
  });
}

async function cycle() {
  const leased = await bridge('/ink/agent-decisions/lease', {
    relay_id: relayId,
    providers,
    limit: 4,
    lease_ms: Math.min(15 * 60_000, commandTimeoutMs + 10_000)
  });

  for (const decision of leased.decisions) {
    try {
      await receipt(decision, 'acknowledged', `Delivered to ${decision.provider} adapter.`);
      const summary = await execute({ ...decision, state: 'acknowledged' });
      await receipt(decision, 'completed', summary);
      process.stdout.write(`${decision.id} completed\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await receipt(decision, 'failed', '', message.slice(0, 220)).catch(() => undefined);
      process.stderr.write(`${decision.id} failed: ${message}\n`);
    }
  }
  return leased.decisions.length;
}

let stopping = false;
process.once('SIGINT', () => {
  stopping = true;
});
process.once('SIGTERM', () => {
  stopping = true;
});

do {
  await cycle();
  if (!once && !stopping) await new Promise((resolve) => setTimeout(resolve, pollMs));
} while (!once && !stopping);
