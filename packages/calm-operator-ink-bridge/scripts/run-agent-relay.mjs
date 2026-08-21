import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';

import { adapterCommand } from '../src/agent-relay.js';
import {
  assertCodexDecisionAuthorized,
  dispatchCodexDecision,
  listCodexTaskProgress
} from '../src/codex-app-server.js';
import { boundedTranscript, voiceTranscriberCommand } from '../src/voice-relay.js';
import { startCodexAppServer } from './codex-app-server-client.mjs';

const origin = (
  process.env.OPERATOR_BRIDGE_ORIGIN ||
  process.env.INK_BRIDGE_ORIGIN ||
  'https://ink.createsomething.agency'
).replace(/\/+$/, '');
const token = process.env.OPERATOR_RELAY_TOKEN?.trim() || process.env.INK_RELAY_TOKEN?.trim() || '';
const relayId = (process.env.OPERATOR_RELAY_ID || process.env.INK_RELAY_ID || hostname())
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
const syncOnly = process.argv.includes('--sync-only');
const agentWorkdir = process.env.INK_AGENT_WORKDIR || process.cwd();
const progressTtlMs = Math.max(30_000, pollMs * 3);

if (!token) throw new Error('OPERATOR_RELAY_TOKEN or INK_RELAY_TOKEN is required.');

const codexClient = providers.includes('codex')
  ? await startCodexAppServer({
      executable: process.env.INK_CODEX_EXECUTABLE,
      cwd: agentWorkdir,
      env: process.env,
      requestTimeoutMs: Math.min(60_000, commandTimeoutMs)
    })
  : null;

async function bridge(path, body) {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ink-token': token },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error || `Operator bridge returned HTTP ${response.status}.`);
  return payload;
}

async function receipt(decision, state, summary = '', error = '') {
  await bridge(`/operator/agent-decisions/${encodeURIComponent(decision.id)}/receipt`, {
    relay_id: relayId,
    state,
    summary,
    error
  });
}

function spawnCapture(command, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd: agentWorkdir,
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
      reject(new Error(`Executable exceeded ${timeoutMs}ms.`));
    }, timeoutMs);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error((stderr || stdout || `Executable exited ${code}.`).trim().slice(0, 500)));
        return;
      }
      resolve(stdout);
    });
  });
}

async function publishCodexProgress(decision, update) {
  const now = Date.now();
  await bridge('/operator/agent-progress', {
    agent_id: `codex:${update.threadId}`,
    provider: 'codex',
    label: decision.message.trim().replace(/\s+/g, ' ').slice(0, 72) || 'Codex task',
    status: 'working',
    phase: update.phase,
    summary: update.summary,
    detail: `Prompted from ${decision.device_id || 'stopwatch'}.`,
    progress_version: Math.max(1, Math.floor(now / 1000)),
    needs_input: false,
    decisions: [],
    expires_at: now + progressTtlMs,
    payload: {
      authority: 'local-codex-app-server',
      thread_id: update.threadId,
      turn_id: update.turnId
    }
  });
}

async function syncCodexTasks() {
  if (!codexClient) return 0;
  const progress = await listCodexTaskProgress(codexClient, {
    cwd: agentWorkdir,
    ttlMs: progressTtlMs,
    limit: 7
  });
  for (const task of progress) await bridge('/operator/agent-progress', task);
  return progress.length;
}

async function execute(decision) {
  if (decision.provider === 'codex') {
    if (!codexClient) throw new Error('Codex app-server is not enabled for this relay.');
    const currentTasks = await listCodexTaskProgress(codexClient, {
      cwd: agentWorkdir,
      ttlMs: progressTtlMs,
      limit: 7
    });
    assertCodexDecisionAuthorized(currentTasks, decision);
    const result = await dispatchCodexDecision(codexClient, decision, {
      cwd: agentWorkdir,
      timeoutMs: commandTimeoutMs,
      onProgress: (update) => publishCodexProgress(decision, update)
    });
    return result.summary;
  }

  const command = adapterCommand(decision, {
    claudeExecutable: process.env.INK_CLAUDE_EXECUTABLE
  });

  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd: agentWorkdir,
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

async function transcribe(command) {
  const directory = await mkdtemp(join(tmpdir(), 'calm-operator-voice-'));
  const audioPath = join(directory, `${command.id}.pcm`);
  try {
    await writeFile(audioPath, Buffer.from(command.audio_base64, 'base64'), { mode: 0o600 });
    const transcriber = voiceTranscriberCommand(audioPath, {
      executable: process.env.OPERATOR_TRANSCRIBE_EXECUTABLE,
      argsJson: process.env.OPERATOR_TRANSCRIBE_ARGS_JSON
    });
    return boundedTranscript(await spawnCapture(transcriber, commandTimeoutMs));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function voiceCycle() {
  if (!process.env.OPERATOR_TRANSCRIBE_EXECUTABLE?.trim()) return 0;
  const leased = await bridge('/operator/voice-commands/lease', {
    relay_id: relayId,
    limit: 1,
    lease_ms: Math.min(5 * 60_000, commandTimeoutMs + 10_000)
  });
  for (const command of leased.commands) {
    try {
      const transcript = await transcribe(command);
      await bridge(`/operator/voice-command/${encodeURIComponent(command.id)}/transcript`, {
        relay_id: relayId,
        transcript
      });
      process.stdout.write(`${command.id} transcribed\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await bridge(`/operator/voice-command/${encodeURIComponent(command.id)}/transcript`, {
        relay_id: relayId,
        error: message.slice(0, 500)
      }).catch(() => undefined);
      process.stderr.write(`${command.id} transcription failed: ${message}\n`);
    }
  }
  return leased.commands.length;
}

async function cycle() {
  const leased = await bridge('/operator/agent-decisions/lease', {
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
  await syncCodexTasks();
  if (!syncOnly) {
    await voiceCycle();
    await cycle();
  }
  if (!once && !stopping) await new Promise((resolve) => setTimeout(resolve, pollMs));
} while (!once && !syncOnly && !stopping);

codexClient?.close();
