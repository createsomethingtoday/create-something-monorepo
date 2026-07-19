import { spawn, type ChildProcess } from 'node:child_process';
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
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { CODEX_PAGER_FOLLOW_UP, CodexPagerRunner, FileRunnerJournal } from '../src/index.js';

const root = resolve(import.meta.dirname, '../../..');
const evidenceDirectory = resolve(
  root,
  '.tmp',
  'core-ink-codex-runner',
  new Date().toISOString().replace(/[:.]/g, '-')
);
const evidencePath = join(evidenceDirectory, 'software-loop.json');
const children: ChildProcess[] = [];
const disposableHome = mkdtempSync(join(tmpdir(), 'core-ink-codex-home-'));
const bridgeState = mkdtempSync(join(tmpdir(), 'core-ink-bridge-state-'));
const runnerState = mkdtempSync(join(tmpdir(), 'core-ink-runner-state-'));
const evidence: Record<string, unknown> = {
  status: 'running',
  mode: 'software_integration',
  physical_input: false,
  started_at: new Date().toISOString(),
  stages: {}
};

mkdirSync(evidenceDirectory, { recursive: true });
chmodSync(disposableHome, 0o700);

try {
  const [terminalPort, appServerPort, presencePort, bridgePort] = await Promise.all([
    freePort(),
    freePort(),
    freePort(),
    freePort()
  ]);
  const presenceToken = randomUUID();
  const runnerToken = randomUUID();
  const deviceToken = randomUUID();

  symlinkSync(join(homedir(), '.codex', 'auth.json'), join(disposableHome, 'auth.json'));
  writeFileSync(
    join(disposableHome, 'config.toml'),
    'model = "gpt-5.4"\nmodel_reasoning_effort = "low"\n',
    { mode: 0o600 }
  );

  start(
    'even-terminal',
    [
      '--provider',
      'codex',
      '--cwd',
      tmpdir(),
      '--port',
      String(terminalPort),
      '--name',
      'Core Ink disposable verifier'
    ],
    { CODEX_HOME: disposableHome, CODEX_APP_SERVER_PORT: String(appServerPort) }
  );
  const terminal = await waitForTerminalReceipt(terminalPort);
  const first = await jsonFetch(
    `http://127.0.0.1:${terminalPort}/api/prompt`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Reply exactly CORE INK DISPOSABLE READY. Do not use tools.',
        provider: 'codex',
        cwd: tmpdir()
      })
    },
    terminal.token
  );
  assert(typeof first.sessionId === 'string', 'Even Terminal did not create a disposable task.');
  await waitForExactResult(
    terminalPort,
    terminal.token,
    first.sessionId,
    'CORE INK DISPOSABLE READY'
  );
  writeFileSync(
    join(disposableHome, 'session_index.jsonl'),
    `${JSON.stringify({
      id: first.sessionId,
      thread_name: 'Core Ink disposable verifier',
      updated_at: new Date().toISOString()
    })}\n`
  );

  start('pnpm', ['--filter', '@create-something/codex-presence', 'start'], {
    CODEX_HOME: disposableHome,
    CODEX_PRESENCE_TOKEN: presenceToken,
    CODEX_PRESENCE_PORT: String(presencePort)
  });
  const bridgeArgs = [
    '--dir',
    'packages/calm-operator-ink-bridge',
    'exec',
    'wrangler',
    'dev',
    '--local',
    '--port',
    String(bridgePort),
    '--persist-to',
    bridgeState,
    '--var',
    `INK_DEVICE_TOKEN:${deviceToken}`,
    '--var',
    `INK_RUNNER_TOKEN:${runnerToken}`
  ];
  let bridge = start('pnpm', bridgeArgs);
  await waitFor(`http://127.0.0.1:${presencePort}/v1/health`);
  await waitFor(`http://127.0.0.1:${bridgePort}/healthz`);

  const journal = new FileRunnerJournal(join(runnerState, 'runner-journal.json'));
  const makeRunner = () =>
    new CodexPagerRunner({
      bridgeOrigin: `http://127.0.0.1:${bridgePort}`,
      bridgeToken: runnerToken,
      presenceOrigin: `http://127.0.0.1:${presencePort}`,
      presenceToken,
      runnerId: 'runner-live-verifier',
      deviceId: 'core-ink',
      taskId: first.sessionId,
      journal
    });
  let runner = makeRunner();
  const passes: Array<Record<string, unknown>> = [];
  let previousActionId = '';

  for (let pass = 1; pass <= 3; pass += 1) {
    const snapshot = await waitForNewSnapshot(runner, previousActionId);
    previousActionId = snapshot.action.id;
    const readyView = await readDeviceView(bridgePort, deviceToken);
    assertReadyDeviceView(
      readyView,
      snapshot.card.taskId,
      snapshot.action.id,
      `Software pass ${pass}`
    );
    const command = await queueDeviceCommand(
      bridgePort,
      deviceToken,
      snapshot.card.taskId,
      snapshot.action.id,
      `software-live-${pass}`
    );
    const result = await runner.runOnce();
    assert(result.status === 'accepted', `Software pass ${pass} returned ${result.status}.`);
    assert(
      result.request_id === command.request_id,
      `Software pass ${pass} runner request ID did not match.`
    );
    await waitForUserPromptCount(terminalPort, terminal.token, first.sessionId, pass);
    const codexResult = await waitForResultCount(
      terminalPort,
      terminal.token,
      first.sessionId,
      pass + 1
    );
    const deviceView = await readDeviceView(bridgePort, deviceToken);
    assert(
      deviceView.request_id === command.request_id,
      `Software pass ${pass} device request ID did not match.`
    );
    assert(
      deviceView.receipt?.status === 'accepted',
      `Software pass ${pass} device receipt was not accepted.`
    );
    passes.push({
      pass,
      kind: 'consecutive',
      physical_input: false,
      task_id: snapshot.card.taskId,
      action_id: snapshot.action.id,
      request_id: command.request_id,
      device_ready_status: readyView.status,
      runner_status: result.status,
      prompt_count: pass,
      codex_result: codexResult,
      device_status: deviceView.status,
      device_receipt: deviceView.receipt?.status
    });
    stage('passes', passes);
  }

  const recoverySnapshot = await waitForNewSnapshot(runner, previousActionId);
  const recoveryReadyView = await readDeviceView(bridgePort, deviceToken);
  assertReadyDeviceView(
    recoveryReadyView,
    recoverySnapshot.card.taskId,
    recoverySnapshot.action.id,
    'Software recovery pass'
  );
  const recoveryCommand = await queueDeviceCommand(
    bridgePort,
    deviceToken,
    recoverySnapshot.card.taskId,
    recoverySnapshot.action.id,
    'software-recovery'
  );
  stop(bridge);
  await waitForUnavailable(`http://127.0.0.1:${bridgePort}/healthz`);
  runner = makeRunner();
  const offlineFailure = await captureFailure(() => runner.runOnce());
  assert(offlineFailure.length > 0, 'Offline runner attempt unexpectedly succeeded.');

  bridge = start('pnpm', bridgeArgs);
  await waitFor(`http://127.0.0.1:${bridgePort}/healthz`);
  runner = makeRunner();
  const recoveryResult = await runner.runOnce();
  assert(recoveryResult.status === 'accepted', `Recovery pass returned ${recoveryResult.status}.`);
  assert(
    recoveryResult.request_id === recoveryCommand.request_id,
    'Recovery pass runner request ID did not match the queued command.'
  );
  await waitForUserPromptCount(terminalPort, terminal.token, first.sessionId, 4);
  const recoveryCodexResult = await waitForResultCount(
    terminalPort,
    terminal.token,
    first.sessionId,
    5
  );
  const recoveryDeviceView = await readDeviceView(bridgePort, deviceToken);
  assert(
    recoveryDeviceView.request_id === recoveryCommand.request_id,
    'Recovery pass device request ID did not match.'
  );
  assert(
    recoveryDeviceView.receipt?.status === 'accepted',
    'Recovery pass device receipt was not accepted.'
  );
  passes.push({
    pass: 4,
    kind: 'bridge_offline_and_clean_runner_restart',
    physical_input: false,
    task_id: recoverySnapshot.card.taskId,
    action_id: recoverySnapshot.action.id,
    request_id: recoveryCommand.request_id,
    device_ready_status: recoveryReadyView.status,
    offline_failure: offlineFailure,
    runner_status: recoveryResult.status,
    prompt_count: 4,
    codex_result: recoveryCodexResult,
    device_status: recoveryDeviceView.status,
    device_receipt: recoveryDeviceView.receipt?.status
  });
  stage('passes', passes);
  assert(
    new Set(passes.map((pass) => pass.request_id)).size === 4,
    'Verifier request IDs were not unique.'
  );
  evidence.status = 'passed';
  evidence.completed_at = new Date().toISOString();
  writeEvidence();
  console.log(`Core Ink software live verifier passed: ${evidencePath}`);
} catch (error) {
  evidence.status = 'failed';
  evidence.completed_at = new Date().toISOString();
  evidence.error = error instanceof Error ? error.message : String(error);
  writeEvidence();
  console.error(`Core Ink software live verifier failed: ${evidence.error}`);
  console.error(`Evidence: ${evidencePath}`);
  process.exitCode = 1;
} finally {
  for (const child of [...children].reverse()) stop(child);
  rmSync(disposableHome, { recursive: true, force: true });
  rmSync(bridgeState, { recursive: true, force: true });
  rmSync(runnerState, { recursive: true, force: true });
}

function start(executable: string, args: string[], env: Record<string, string> = {}): ChildProcess {
  const child = spawn(executable, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'ignore',
    detached: true
  });
  children.push(child);
  return child;
}

function stop(child: ChildProcess): void {
  if (child.killed || !child.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {}
}

async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string')
        return reject(new Error('Could not allocate a port.'));
      server.close((error) => (error ? reject(error) : resolvePort(address.port)));
    });
  });
}

async function waitFor(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function waitForUnavailable(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      if (!(await fetch(url)).ok) return;
    } catch {
      return;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url} to become unavailable.`);
}

async function waitForNewSnapshot(
  runner: CodexPagerRunner,
  previousActionId: string
): Promise<Awaited<ReturnType<CodexPagerRunner['publishSnapshot']>>> {
  const deadline = Date.now() + 30_000;
  let latestError: unknown;
  while (Date.now() < deadline) {
    try {
      const snapshot = await runner.publishSnapshot();
      if (!previousActionId || snapshot.action.id !== previousActionId) return snapshot;
    } catch (error) {
      latestError = error;
    }
    await delay(250);
  }
  throw latestError instanceof Error
    ? latestError
    : new Error('Timed out waiting for a new disposable Codex follow-up action.');
}

async function queueDeviceCommand(
  bridgePort: number,
  deviceToken: string,
  taskId: string,
  actionId: string,
  label: string
): Promise<Record<string, any>> {
  return jsonFetch(
    `http://127.0.0.1:${bridgePort}/ink/codex/commands`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        device_id: 'core-ink',
        device_nonce: `${label}:${randomUUID()}`,
        task_id: taskId,
        action_id: actionId,
        confirmed: true
      })
    },
    deviceToken
  );
}

async function readDeviceView(
  bridgePort: number,
  deviceToken: string
): Promise<Record<string, any>> {
  return jsonFetch(`http://127.0.0.1:${bridgePort}/ink/codex?device_id=core-ink`, {}, deviceToken);
}

function assertReadyDeviceView(
  view: Record<string, any>,
  taskId: string,
  actionId: string,
  label: string
): void {
  assert(view.status === 'ready', `${label} was not armable from the device view.`);
  assert(view.task_id === taskId, `${label} device task ID did not match Presence.`);
  assert(view.action_id === actionId, `${label} device action ID did not match Presence.`);
}

async function waitForTerminalReceipt(
  port: number
): Promise<{ pid: number; port: number; token: string }> {
  const directory = join(homedir(), '.even-terminal', 'instances');
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    for (const name of readdirSync(directory).filter((value) => value.endsWith('.json'))) {
      try {
        const receipt = JSON.parse(readFileSync(join(directory, name), 'utf8')) as {
          pid: number;
          port: number;
          token: string;
        };
        if (receipt.port === port && alive(receipt.pid)) return receipt;
      } catch {}
    }
    await delay(250);
  }
  throw new Error('Timed out waiting for disposable Even Terminal receipt.');
}

async function waitForExactResult(
  port: number,
  token: string,
  sessionId: string,
  expected: string
): Promise<string> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const value = await messages(port, token, sessionId);
    const result = value.find(
      (message) => message.type === 'result' && normalize(message.text) === normalize(expected)
    );
    if (result) return String(result.text);
    const failure = value.find((message) => message.type === 'error');
    if (failure)
      throw new Error(`Disposable Codex failed: ${failure.message ?? failure.text ?? 'unknown'}`);
    await delay(300);
  }
  throw new Error(`Timed out waiting for result ${expected}.`);
}

async function waitForUserPromptCount(
  port: number,
  token: string,
  sessionId: string,
  count: number
): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const value = await messages(port, token, sessionId);
    const prompts = value.filter(
      (message) =>
        message.type === 'user_prompt' &&
        String(message.text ?? message.message ?? '') === CODEX_PAGER_FOLLOW_UP
    );
    if (prompts.length === count) return;
    if (prompts.length > count)
      throw new Error(`Fixed pager prompt executed more than ${count} times.`);
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${count} fixed pager prompts.`);
}

async function captureFailure(operation: () => Promise<unknown>): Promise<string> {
  try {
    await operation();
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function waitForResultCount(
  port: number,
  token: string,
  sessionId: string,
  count: number
): Promise<string> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const value = await messages(port, token, sessionId);
    const results = value.filter((message) => message.type === 'result');
    if (results.length >= count) return String(results.at(-1)?.text ?? '');
    await delay(300);
  }
  throw new Error(`Timed out waiting for ${count} disposable Codex results.`);
}

async function messages(
  port: number,
  token: string,
  sessionId: string
): Promise<Array<Record<string, unknown>>> {
  const value = await jsonFetch(
    `http://127.0.0.1:${port}/api/messages?sessionId=${encodeURIComponent(sessionId)}&provider=codex`,
    {},
    token
  );
  return Array.isArray(value.messages) ? value.messages : [];
}

async function jsonFetch(
  url: string,
  init: RequestInit = {},
  bearer?: string
): Promise<Record<string, any>> {
  const headers = new Headers(init.headers);
  if (bearer) headers.set('authorization', `Bearer ${bearer}`);
  const response = await fetch(url, { ...init, headers });
  const value = (await response.json()) as Record<string, any>;
  if (!response.ok)
    throw new Error(
      `${new URL(url).pathname} returned ${response.status}: ${value.error ?? 'unknown error'}`
    );
  return value;
}

function stage(name: string, value: unknown): void {
  (evidence.stages as Record<string, unknown>)[name] = value;
  writeEvidence();
}

function writeEvidence(): void {
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/[.!]+$/, '');
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
