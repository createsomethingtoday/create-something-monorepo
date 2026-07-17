#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const ports = { presence: 4792, vite: 5193, simulator: 9908, terminal: 3468, appServer: 8776 };
const token = randomUUID();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const evidenceDirectory = resolve(root, '.tmp', 'codex-presence', timestamp);
const evidencePath = join(evidenceDirectory, 'evidence.json');
const children = [];
const evidence = { status: 'running', startedAt: new Date().toISOString(), stages: {}, artifacts: {} };
let disposableHome;

mkdirSync(evidenceDirectory, { recursive: true });

try {
  stage('preflight', runChecks());

  let service = start('pnpm', ['--filter', '@create-something/codex-presence', 'start'], {
    CODEX_PRESENCE_TOKEN: token,
    CODEX_PRESENCE_PORT: String(ports.presence),
    CODEX_PRESENCE_ORIGIN: `http://127.0.0.1:${ports.vite}`
  });
  start('pnpm', ['--filter', '@create-something/even-codex-presence', 'exec', 'vite', '--host', '127.0.0.1', '--port', String(ports.vite), '--strictPort']);
  await waitFor(`http://127.0.0.1:${ports.presence}/v1/health`);
  await waitFor(`http://127.0.0.1:${ports.vite}/`, 20_000, false);

  const cardsPayload = await jsonFetch(`http://127.0.0.1:${ports.presence}/v1/cards`, {}, token);
  const requestedTaskId = process.env.CODEX_THREAD_ID;
  const card = cardsPayload.cards.find((candidate) => candidate.taskId === requestedTaskId)
    ?? cardsPayload.cards.find((candidate) => candidate.task.includes('Build Codex control app'));
  assert(card, 'The current CRE-1291 task was not present.');
  assert(card.state !== 'available', `Current task was not live; observed ${card.state}.`);
  stage('live_state', { ok: true, card });

  const target = new URL(`http://127.0.0.1:${ports.vite}/`);
  target.searchParams.set('service', `http://127.0.0.1:${ports.presence}`);
  target.searchParams.set('token', token);
  target.searchParams.set('task', card.taskId);
  let simulator = start('pnpm', [
    '--filter', '@create-something/even-codex-presence', 'exec', 'evenhub-simulator',
    target.toString(), '--automation-port', String(ports.simulator), '--no-glow'
  ]);
  await waitFor(`http://127.0.0.1:${ports.simulator}/api/ping`, 30_000, false);
  await delay(2_000);
  await fetch(`http://127.0.0.1:${ports.simulator}/api/console`, { method: 'DELETE' });
  const overviewPath = await screenshot('overview');
  await simulatorInput('click');
  await delay(400);
  const detailPath = await screenshot('detail');
  await simulatorInput('click');
  await delay(400);
  const actionsPath = await screenshot('actions');
  const consolePayload = await jsonFetch(`http://127.0.0.1:${ports.simulator}/api/console`);
  const consoleErrors = consolePayload.entries.filter((entry) => entry.level === 'error' || entry.level === 'warn');
  assert(consoleErrors.length === 0, `Simulator console contained ${consoleErrors.length} warning/error entries.`);
  stage('simulator', { ok: true, taskId: card.taskId, consoleErrors: [], inputs: ['click', 'click'] });
  evidence.artifacts = { overviewPath, detailPath, actionsPath };
  stop(simulator);

  disposableHome = mkdtempSync(join(tmpdir(), 'codex-presence-home-'));
  chmodSync(disposableHome, 0o700);
  symlinkSync(join(process.env.HOME, '.codex', 'auth.json'), join(disposableHome, 'auth.json'));
  writeFileSync(join(disposableHome, 'config.toml'), 'model = "gpt-5.4"\nmodel_reasoning_effort = "low"\n', { mode: 0o600 });
  start('even-terminal', [
    '--provider', 'codex', '--cwd', tmpdir(), '--port', String(ports.terminal), '--name', 'Codex Presence verifier'
  ], { CODEX_HOME: disposableHome, CODEX_APP_SERVER_PORT: String(ports.appServer) });
  const terminal = await waitForTerminalReceipt(ports.terminal);
  const first = await jsonFetch(`http://127.0.0.1:${ports.terminal}/api/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'Reply exactly PRESENCE VERIFIER READY. Do not use tools.', provider: 'codex', cwd: tmpdir() })
  }, terminal.token);
  assert(first.sessionId, 'Even Terminal did not return a disposable session ID.');
  const initialResult = await waitForResult(ports.terminal, terminal.token, first.sessionId, 'PRESENCE VERIFIER READY');
  writeFileSync(join(disposableHome, 'session_index.jsonl'), `${JSON.stringify({
    id: first.sessionId,
    thread_name: 'Codex Presence disposable verifier',
    updated_at: new Date().toISOString()
  })}\n`);

  stop(service);
  await delay(500);
  service = start('pnpm', ['--filter', '@create-something/codex-presence', 'start'], {
    CODEX_HOME: disposableHome,
    CODEX_PRESENCE_TOKEN: token,
    CODEX_PRESENCE_PORT: String(ports.presence),
    CODEX_PRESENCE_ORIGIN: `http://127.0.0.1:${ports.vite}`
  });
  await waitFor(`http://127.0.0.1:${ports.presence}/v1/health`);
  const managedCards = await jsonFetch(`http://127.0.0.1:${ports.presence}/v1/cards`, {}, token);
  const managedCard = managedCards.cards.find((candidate) => candidate.taskId === first.sessionId);
  assert(managedCard?.actions.some((action) => action.type === 'follow_up'), 'Disposable session lacked a follow-up action.');
  const receipt = await jsonFetch(`http://127.0.0.1:${ports.presence}/v1/actions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      requestId: `verify-${randomUUID()}`,
      actionId: managedCard.actions.find((action) => action.type === 'follow_up').id,
      taskId: first.sessionId,
      type: 'follow_up',
      text: 'Reply exactly ACTION RECEIPT VERIFIED. Do not use tools.'
    })
  }, token);
  assert(receipt.status === 'accepted', 'Presence action was not accepted.');
  stage('action_receipt', { ok: true, sessionId: first.sessionId, initialResult, receipt, actionResult: 'pending' });
  const actionResult = await waitForResult(ports.terminal, terminal.token, first.sessionId, 'ACTION RECEIPT VERIFIED');
  stage('action_receipt', { ok: true, sessionId: first.sessionId, initialResult, receipt, actionResult });

  const aiffPath = join(evidenceDirectory, 'voice.aiff');
  const wavPath = join(evidenceDirectory, 'voice.wav');
  command('say', ['-o', aiffPath, 'Continue with the recommended.']);
  command('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiffPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wavPath]);
  const transcriptionResponse = await fetch(`http://127.0.0.1:${ports.presence}/v1/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'audio/wav' },
    body: readFileSync(wavPath)
  });
  const transcription = await transcriptionResponse.json();
  if (!transcriptionResponse.ok) {
    stage('transcription', { ok: false, status: transcriptionResponse.status, code: transcription.code, error: transcription.error });
    throw new Error(`Live transcription failed: ${transcription.code || transcription.error || transcriptionResponse.status}`);
  }
  assert(typeof transcription.text === 'string' && transcription.text.length > 0, 'Live transcription returned no text.');
  stage('transcription', { ok: true, model: transcription.model, text: transcription.text });

  const voiceTarget = new URL(`http://127.0.0.1:${ports.vite}/`);
  voiceTarget.searchParams.set('service', `http://127.0.0.1:${ports.presence}`);
  voiceTarget.searchParams.set('token', token);
  voiceTarget.searchParams.set('task', first.sessionId);
  simulator = start('pnpm', [
    '--filter', '@create-something/even-codex-presence', 'exec', 'evenhub-simulator',
    voiceTarget.toString(), '--automation-port', String(ports.simulator), '--no-glow'
  ]);
  await waitFor(`http://127.0.0.1:${ports.simulator}/api/ping`, 30_000, false);
  await delay(2_000);
  await fetch(`http://127.0.0.1:${ports.simulator}/api/console`, { method: 'DELETE' });
  await simulatorInput('click');
  await simulatorInput('click');
  await simulatorInput('click');
  await delay(500);
  const recordingPath = await screenshot('voice-recording');
  command('say', ['Continue with the recommended.']);
  await delay(300);
  await simulatorInput('click');
  await delay(5_000);
  const reviewPath = await screenshot('voice-review');
  await simulatorInput('click');
  await delay(1_500);
  const receiptPath = await screenshot('voice-receipt');
  const deliveredVoice = await waitForUserPrompt(ports.terminal, terminal.token, first.sessionId, 'Continue');
  const voiceConsole = await jsonFetch(`http://127.0.0.1:${ports.simulator}/api/console`);
  const voiceErrors = voiceConsole.entries.filter((entry) => entry.level === 'error' || entry.level === 'warn');
  assert(voiceErrors.length === 0, `Voice simulator console contained ${voiceErrors.length} warning/error entries.`);
  stage('voice_confirmation', { ok: true, deliveredVoice, consoleErrors: [] });
  evidence.artifacts = { ...evidence.artifacts, recordingPath, reviewPath, receiptPath };

  evidence.status = 'passed';
  evidence.completedAt = new Date().toISOString();
  writeEvidence();
  console.log(`Codex Presence verifier passed: ${evidencePath}`);
} catch (error) {
  evidence.status = 'failed';
  evidence.completedAt = new Date().toISOString();
  evidence.error = error instanceof Error ? error.message : String(error);
  writeEvidence();
  console.error(`Codex Presence verifier failed: ${evidence.error}`);
  console.error(`Evidence: ${evidencePath}`);
  process.exitCode = 1;
} finally {
  for (const child of [...children].reverse()) stop(child);
  if (disposableHome) rmSync(disposableHome, { recursive: true, force: true });
}

function runChecks() {
  command('pnpm', ['--filter', '@create-something/codex-presence', 'test']);
  command('pnpm', ['--filter', '@create-something/codex-presence', 'check']);
  command('pnpm', ['--filter', '@create-something/even-codex-presence', 'test']);
  command('pnpm', ['--filter', '@create-something/even-codex-presence', 'build']);
  command('pnpm', ['--filter', '@create-something/even-codex-presence', 'pack:even']);
  return { ok: true };
}

function command(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.status !== 0) throw new Error(`${executable} ${args.join(' ')} failed with ${result.status}.`);
}

function start(executable, args, env = {}) {
  const child = spawn(executable, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    detached: true
  });
  children.push(child);
  return child;
}

function stop(child) {
  if (!child || child.killed) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  child.killed = true;
}

async function waitFor(url, timeout = 20_000, json = true) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return json ? response.json() : response.text();
    } catch {}
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function jsonFetch(url, init = {}, bearer) {
  const headers = new Headers(init.headers);
  if (bearer) headers.set('authorization', `Bearer ${bearer}`);
  const response = await fetch(url, { ...init, headers });
  const value = await response.json();
  if (!response.ok) throw new Error(`${new URL(url).pathname} returned ${response.status}: ${value.error || 'unknown error'}`);
  return value;
}

async function screenshot(name) {
  const response = await fetch(`http://127.0.0.1:${ports.simulator}/api/screenshot/glasses`);
  assert(response.ok, `Could not capture ${name} screenshot.`);
  const rawPath = join(evidenceDirectory, `${name}.png`);
  writeFileSync(rawPath, Buffer.from(await response.arrayBuffer()));
  const visiblePath = join(evidenceDirectory, `${name}-visible.png`);
  const composited = spawnSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=576x288', '-i', rawPath,
    '-filter_complex', '[0][1]overlay=format=auto', '-frames:v', '1', visiblePath
  ]);
  return composited.status === 0 ? visiblePath : rawPath;
}

async function simulatorInput(action) {
  await jsonFetch(`http://127.0.0.1:${ports.simulator}/api/input`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action })
  });
}

async function waitForTerminalReceipt(port) {
  const directory = join(process.env.HOME, '.even-terminal', 'instances');
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const name of readdirSync(directory).filter((value) => value.endsWith('.json'))) {
      try {
        const receipt = JSON.parse(readFileSync(join(directory, name), 'utf8'));
        if (receipt.port === port && alive(receipt.pid)) return receipt;
      } catch {}
    }
    await delay(250);
  }
  throw new Error('Timed out waiting for the disposable Even Terminal receipt.');
}

async function waitForResult(port, bearer, sessionId, expected) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const value = await jsonFetch(`http://127.0.0.1:${port}/api/messages?sessionId=${sessionId}&provider=codex`, {}, bearer);
    const results = value.messages.filter((message) => message.type === 'result').map((message) => message.text);
    const matched = results.find((result) => normalizeResult(result) === normalizeResult(expected));
    if (matched) return matched;
    const error = value.messages.find((message) => message.type === 'error');
    if (error) throw new Error(`Disposable Codex session failed: ${error.message || error.text}`);
    await delay(300);
  }
  throw new Error(`Timed out waiting for disposable result ${expected}.`);
}

async function waitForUserPrompt(port, bearer, sessionId, fragment) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const value = await jsonFetch(`http://127.0.0.1:${port}/api/messages?sessionId=${sessionId}&provider=codex`, {}, bearer);
    const prompts = value.messages
      .filter((message) => message.type === 'user_prompt')
      .map((message) => String(message.text ?? message.message ?? ''));
    const matched = prompts.find((prompt) => prompt.toLowerCase().includes(fragment.toLowerCase()));
    if (matched) return matched;
    await delay(300);
  }
  throw new Error(`Timed out waiting for confirmed voice delivery containing ${fragment}.`);
}

function normalizeResult(value) {
  return String(value ?? '').trim().replace(/[.!]+$/, '');
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function stage(name, value) {
  evidence.stages[name] = value;
  writeEvidence();
}

function writeEvidence() {
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
