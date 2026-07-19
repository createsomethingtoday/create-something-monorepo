import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const scriptPath = resolve(import.meta.filename);
const tsxCli = resolve(root, 'node_modules/tsx/dist/cli.mjs');
const presenceCli = resolve(root, 'packages/codex-presence/src/cli.ts');
const runnerCli = resolve(root, 'packages/calm-operator-codex-runner/src/cli.ts');
const runtimeDir = process.env.CORE_INK_CODEX_SERVICE_RUNTIME_DIR?.trim()
  || join(homedir(), 'Library', 'Application Support', 'CREATE SOMETHING', 'Core Ink Codex Pager');
const configPath = join(runtimeDir, 'service-config.json');
const runtimePath = join(runtimeDir, 'service-runtime.json');
const logPath = join(runtimeDir, 'service.log');
const recoveryPath = join(runtimeDir, 'runner-recovery.json');
const runnerRuntimeDir = join(runtimeDir, 'runner');
const launchLabel = 'agency.createsomething.core-ink-codex-pager';
const command = process.argv[2] || 'status';

if (!new Set(['start', 'status', 'stop', 'daemon']).has(command)) {
  throw new Error('Usage: service.ts <start|status|stop> [--task-id <disposable-task-id>]');
}

if (command === 'start') await startService();
if (command === 'status') await statusService();
if (command === 'stop') await stopService();
if (command === 'daemon') await daemon();

type ServiceConfig = {
  version: 1;
  task_id: string;
  codex_home: string;
  bridge_origin: string;
  presence_port: number;
  runner_id: string;
  device_id: string;
  infisical_environment: string;
  infisical_path: string;
  runner_secret_name: string;
};

type ServiceRuntime = {
  version: 1;
  status: 'starting' | 'ready' | 'failed';
  started_at: string;
  task_id: string;
  bridge_origin: string;
  presence_origin: string;
  runner_id: string;
  device_id: string;
  daemon_pid: number;
  presence_pid?: number;
  runner_pid?: number;
  detail?: string;
};

type RunnerRecoveryReceipt = {
  schema: 'core-ink-runner-recovery/v1';
  kind: 'runner_restart';
  status: 'stopped' | 'restarted';
  task_id: string;
  stopped_at: string;
  restarted_at?: string;
  last_terminal_request_id_before_stop: string | null;
  no_action_during_outage?: true;
};

async function startService(): Promise<void> {
  if (jobLoaded()) throw new Error('Core Ink Codex pager service is already registered.');
  const taskId = simpleId(option('--task-id') || process.env.CORE_INK_CODEX_TASK_ID || '', 'task ID');
  const bridgeOrigin = secureOrigin(process.env.INK_ORIGIN || 'https://ink.createsomething.agency');
  const presencePort = positivePort(process.env.CODEX_PRESENCE_PORT || '4782');
  const config: ServiceConfig = {
    version: 1,
    task_id: taskId,
    codex_home: process.env.CODEX_HOME?.trim() || join(homedir(), '.codex'),
    bridge_origin: bridgeOrigin,
    presence_port: presencePort,
    runner_id: simpleId(process.env.CORE_INK_CODEX_RUNNER_ID || 'runner-macbook', 'runner ID'),
    device_id: simpleId(process.env.CORE_INK_CODEX_DEVICE_ID || 'core-ink', 'device ID'),
    infisical_environment: process.env.CORE_INK_CODEX_INFISICAL_ENV?.trim() || 'prod',
    infisical_path: process.env.CORE_INK_CODEX_INFISICAL_PATH?.trim() || '/',
    runner_secret_name: process.env.CORE_INK_CODEX_RUNNER_SECRET_NAME?.trim() || 'INK_RUNNER_TOKEN'
  };
  assertSecretAvailable(config);

  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  writePrivate(configPath, config);
  writeFileSync(logPath, '', { flag: 'a', mode: 0o600 });
  chmodSync(logPath, 0o600);
  rmSync(runtimePath, { force: true });

  const submitted = spawnSync(
    'launchctl',
    [
      'submit', '-l', launchLabel, '-o', logPath, '-e', logPath, '--',
      process.execPath, tsxCli, scriptPath, 'daemon'
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  if (submitted.status !== 0) {
    rmSync(configPath, { force: true });
    throw new Error('Could not register the Core Ink Codex pager user service.');
  }
  const runtime = await waitForReady();
  console.log(JSON.stringify({ ok: true, service: launchLabel, ...runtime }, null, 2));
}

async function statusService(): Promise<void> {
  const runtime = readJson<ServiceRuntime>(runtimePath);
  const registered = jobLoaded();
  const healthy = Boolean(
    registered
    && runtime?.status === 'ready'
    && runtime.presence_pid
    && runtime.runner_pid
    && alive(runtime.daemon_pid)
    && alive(runtime.presence_pid)
    && alive(runtime.runner_pid)
    && await health(runtime.presence_origin)
  );
  console.log(JSON.stringify({
    ok: true,
    registered,
    healthy,
    runtime: runtime ? sanitizedRuntime(runtime) : null,
    log_path: logPath
  }, null, 2));
  if (!healthy) process.exitCode = 1;
}

async function stopService(): Promise<void> {
  const registered = jobLoaded();
  const runtime = readJson<ServiceRuntime>(runtimePath);
  if (registered && runtime?.status === 'ready') {
    writePrivate(recoveryPath, {
      schema: 'core-ink-runner-recovery/v1',
      kind: 'runner_restart',
      status: 'stopped',
      task_id: runtime.task_id,
      stopped_at: new Date().toISOString(),
      last_terminal_request_id_before_stop: latestTerminalRequestId()
    } satisfies RunnerRecoveryReceipt);
  }
  if (registered) spawnSync('launchctl', ['remove', launchLabel], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 30 && jobLoaded(); attempt += 1) await delay(100);
  rmSync(configPath, { force: true });
  rmSync(runtimePath, { force: true });
  console.log(JSON.stringify({ ok: true, stopped: true, already_stopped: !registered }));
}

async function daemon(): Promise<void> {
  const config = readJson<ServiceConfig>(configPath);
  if (!config || config.version !== 1) throw new Error('Pager service configuration is missing or invalid.');
  const presenceOrigin = `http://127.0.0.1:${config.presence_port}`;
  const startedAt = new Date().toISOString();
  const baseRuntime: ServiceRuntime = {
    version: 1,
    status: 'starting',
    started_at: startedAt,
    task_id: config.task_id,
    bridge_origin: config.bridge_origin,
    presence_origin: presenceOrigin,
    runner_id: config.runner_id,
    device_id: config.device_id,
    daemon_pid: process.pid
  };
  writePrivate(runtimePath, baseRuntime);

  const children: ChildProcess[] = [];
  let stopping = false;
  try {
    const runnerToken = loadInfisicalSecret(config);
    const recovery = readJson<RunnerRecoveryReceipt>(recoveryPath);
    if (recovery?.status === 'stopped' && recovery.task_id === config.task_id) {
      await assertRecoveryQueueEmpty(config, runnerToken);
    }
    const presenceToken = randomBytes(32).toString('base64url');
    const presence = spawnChild(presenceCli, {
      CODEX_HOME: config.codex_home,
      CODEX_PRESENCE_TOKEN: presenceToken,
      CODEX_PRESENCE_PORT: String(config.presence_port),
      CODEX_PRESENCE_ORIGIN: presenceOrigin
    });
    children.push(presence);
    await waitForHealth(presenceOrigin, presence);
    await assertDisposableTask(presenceOrigin, presenceToken, config.task_id);

    const runner = spawnChild(runnerCli, {
      INK_ORIGIN: config.bridge_origin,
      INK_RUNNER_TOKEN: runnerToken,
      CODEX_PRESENCE_ORIGIN: presenceOrigin,
      CODEX_PRESENCE_TOKEN: presenceToken,
      CORE_INK_CODEX_TASK_ID: config.task_id,
      CORE_INK_CODEX_RUNNER_ID: config.runner_id,
      CORE_INK_CODEX_DEVICE_ID: config.device_id,
      CORE_INK_CODEX_RUNNER_RUNTIME_DIR: runnerRuntimeDir
    }, ['start']);
    children.push(runner);
    await waitForAlive(runner);

    const ready: ServiceRuntime = {
      ...baseRuntime,
      status: 'ready',
      presence_pid: presence.pid,
      runner_pid: runner.pid
    };
    writePrivate(runtimePath, ready);
    if (recovery?.status === 'stopped' && recovery.task_id === config.task_id) {
      writePrivate(recoveryPath, {
        ...recovery,
        status: 'restarted',
        restarted_at: new Date().toISOString(),
        no_action_during_outage: true
      } satisfies RunnerRecoveryReceipt);
    }

    const stopPromise = new Promise<'signal'>((resolveStop) => {
      for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.once(signal, () => {
          stopping = true;
          resolveStop('signal');
        });
      }
    });
    const childExit = Promise.race(children.map((child) => new Promise<'child_exit'>((resolveExit) => {
      child.once('exit', () => resolveExit('child_exit'));
    })));
    const outcome = await Promise.race([stopPromise, childExit]);
    if (outcome === 'child_exit' && !stopping) throw new Error('A pager service child exited unexpectedly.');
  } catch (error) {
    writePrivate(runtimePath, {
      ...baseRuntime,
      status: 'failed',
      detail: bounded(error instanceof Error ? error.message : String(error))
    });
    throw error;
  } finally {
    for (const child of [...children].reverse()) {
      if (child.pid && alive(child.pid)) child.kill('SIGTERM');
    }
  }
}

function spawnChild(entrypoint: string, env: Record<string, string>, args: string[] = []): ChildProcess {
  return spawn(process.execPath, [tsxCli, entrypoint, ...args], {
    cwd: root,
    env: {
      ...process.env,
      ...env,
      PATH: `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`
    },
    stdio: 'inherit'
  });
}

function assertSecretAvailable(config: ServiceConfig): void {
  void loadInfisicalSecret(config);
}

function loadInfisicalSecret(config: ServiceConfig): string {
  const localBinary = resolve(dirname(process.execPath), 'infisical');
  const binary = existsSync('/opt/homebrew/bin/infisical')
    ? '/opt/homebrew/bin/infisical'
    : existsSync(localBinary) ? localBinary : 'infisical';
  const result = spawnSync(binary, [
    'secrets', 'get', config.runner_secret_name,
    `--env=${config.infisical_environment}`,
    `--path=${config.infisical_path}`,
    '--include-imports=true', '--plain', '--silent'
  ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const value = result.stdout.trim();
  if (result.status !== 0 || !value || value.includes('\n')) {
    throw new Error(`Could not load Infisical secret ${config.runner_secret_name}.`);
  }
  return value;
}

async function assertDisposableTask(origin: string, token: string, taskId: string): Promise<void> {
  const response = await fetch(`${origin}/v1/cards`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000)
  });
  const value = await response.json() as { cards?: Array<Record<string, any>> };
  const card = value.cards?.find((candidate) => candidate.taskId === taskId);
  const action = card?.actions?.find((candidate: Record<string, any>) =>
    candidate.type === 'follow_up'
    && candidate.risk === 'safe'
    && candidate.requiresConfirmation === false
  );
  if (!response.ok || !card || !/\bdisposable\b/i.test(String(card.task || '')) || card.freshness !== 'fresh' || !action) {
    throw new Error('Selected task is not a fresh disposable Codex task with a safe follow-up action.');
  }
}

async function assertRecoveryQueueEmpty(config: ServiceConfig, runnerToken: string): Promise<void> {
  const response = await fetch(
    `${config.bridge_origin}/ink/codex/commands/next?runner_id=${encodeURIComponent(config.runner_id)}`,
    {
      headers: { 'x-ink-token': runnerToken },
      signal: AbortSignal.timeout(10_000)
    }
  );
  const value = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error('Could not inspect the recovery queue before runner restart.');
  if (value.value !== null) {
    throw new Error('Recovery queue was not empty; an action may have been created while the runner was unavailable.');
  }
}

async function waitForReady(): Promise<ServiceRuntime> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const runtime = readJson<ServiceRuntime>(runtimePath);
    if (runtime?.status === 'failed') {
      spawnSync('launchctl', ['remove', launchLabel], { stdio: 'ignore' });
      throw new Error(runtime.detail || 'Pager service failed during startup.');
    }
    if (
      runtime?.status === 'ready'
      && runtime.presence_pid
      && runtime.runner_pid
      && await health(runtime.presence_origin)
    ) return sanitizedRuntime(runtime);
    await delay(250);
  }
  spawnSync('launchctl', ['remove', launchLabel], { stdio: 'ignore' });
  throw new Error(`Pager service did not become ready. Inspect ${logPath}.`);
}

async function waitForHealth(origin: string, child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Codex Presence exited during startup.');
    if (await health(origin)) return;
    await delay(250);
  }
  throw new Error('Codex Presence did not become healthy.');
}

async function waitForAlive(child: ChildProcess): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Core Ink Codex runner exited during startup.');
    await delay(100);
  }
}

async function health(origin: string): Promise<boolean> {
  try {
    const response = await fetch(`${origin}/v1/health`, { signal: AbortSignal.timeout(1_000) });
    const value = await response.json() as { ok?: boolean; service?: string };
    return response.ok && value.ok === true && value.service === 'codex-presence';
  } catch {
    return false;
  }
}

function sanitizedRuntime(runtime: ServiceRuntime): ServiceRuntime {
  return {
    version: runtime.version,
    status: runtime.status,
    started_at: runtime.started_at,
    task_id: runtime.task_id,
    bridge_origin: runtime.bridge_origin,
    presence_origin: runtime.presence_origin,
    runner_id: runtime.runner_id,
    device_id: runtime.device_id,
    daemon_pid: runtime.daemon_pid,
    ...(runtime.presence_pid ? { presence_pid: runtime.presence_pid } : {}),
    ...(runtime.runner_pid ? { runner_pid: runtime.runner_pid } : {}),
    ...(runtime.detail ? { detail: bounded(runtime.detail) } : {})
  };
}

function writePrivate(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

function latestTerminalRequestId(): string | null {
  const journal = readJson<Record<string, { request_id?: string; state?: string; updated_at?: string }>>(
    join(runnerRuntimeDir, 'journal.json')
  );
  if (!journal) return null;
  return Object.values(journal)
    .filter((entry) => entry.state === 'terminal' && entry.request_id)
    .sort((left, right) => Date.parse(right.updated_at || '') - Date.parse(left.updated_at || ''))
    .at(0)?.request_id || null;
}

function jobLoaded(): boolean {
  const uid = process.getuid?.();
  if (uid === undefined) return false;
  return spawnSync('launchctl', ['print', `gui/${uid}/${launchLabel}`], { stdio: 'ignore' }).status === 0;
}

function option(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || '') : '';
}

function simpleId(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,239}$/.test(normalized)) throw new Error(`${label} is invalid.`);
  return normalized;
}

function secureOrigin(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') throw new Error('INK_ORIGIN must use HTTPS.');
  return url.origin;
}

function positivePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) throw new Error('CODEX_PRESENCE_PORT is invalid.');
  return port;
}

function bounded(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
