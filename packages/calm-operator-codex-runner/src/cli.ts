import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { FileRunnerJournal } from './journal.js';
import { CodexPagerRunner, RunnerSafetyError } from './runner.js';

const command = process.argv[2] || 'start';
const runtimeDir = process.env.CORE_INK_CODEX_RUNNER_RUNTIME_DIR?.trim()
  || join(homedir(), 'Library', 'Application Support', 'CREATE SOMETHING', 'Core Ink Codex Runner');
const processPath = join(runtimeDir, 'process.json');

if (command === 'status') {
  const receipt = await readProcessReceipt();
  console.log(JSON.stringify({ ok: true, running: Boolean(receipt && isAlive(receipt.pid)), receipt }, null, 2));
} else if (command === 'stop') {
  const receipt = await readProcessReceipt();
  if (!receipt || !isAlive(receipt.pid)) {
    console.log(JSON.stringify({ ok: true, stopped: true, already_stopped: true }));
  } else {
    process.kill(receipt.pid, 'SIGTERM');
    console.log(JSON.stringify({ ok: true, stopped: true, pid: receipt.pid }));
  }
} else if (command === 'once') {
  const runner = configuredRunner();
  console.log(JSON.stringify(await runner.runOnce()));
} else if (command === 'start') {
  const previous = await readProcessReceipt();
  if (previous && isAlive(previous.pid)) throw new Error(`Core Ink Codex runner is already running as PID ${previous.pid}.`);
  const runner = configuredRunner();
  const pollIntervalMs = positiveNumber(process.env.CORE_INK_CODEX_RUNNER_POLL_MS, 2_000);
  const receipt = {
    pid: process.pid,
    started_at: new Date().toISOString(),
    runner_id: requiredEnv('CORE_INK_CODEX_RUNNER_ID', 'runner-macbook'),
    device_id: requiredEnv('CORE_INK_CODEX_DEVICE_ID', 'core-ink'),
    task_id: requiredEnv('CORE_INK_CODEX_TASK_ID')
  };
  await mkdir(runtimeDir, { recursive: true, mode: 0o700 });
  await writeFile(processPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ ok: true, service: 'core-ink-codex-runner', ...receipt }));

  let active = true;
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { active = false; });
  }
  try {
    while (active) {
      try {
        const result = await runner.runOnce();
        if (result.status !== 'idle') console.log(JSON.stringify({ service: 'core-ink-codex-runner', ...result }));
      } catch (error) {
        const code = error instanceof RunnerSafetyError ? error.code : 'runner_error';
        console.error(JSON.stringify({ service: 'core-ink-codex-runner', level: 'error', code, message: error instanceof Error ? error.message : String(error) }));
        if (['ambiguous_claim', 'ambiguous_execution', 'invalid_journal'].includes(code)) throw error;
      }
      if (active) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  } finally {
    await unlink(processPath).catch(() => undefined);
  }
} else {
  throw new Error('Usage: cli.ts <start|once|status|stop>');
}

function configuredRunner(): CodexPagerRunner {
  return new CodexPagerRunner({
    bridgeOrigin: requiredEnv('INK_ORIGIN', 'https://ink.createsomething.agency'),
    bridgeToken: requiredEnv('INK_RUNNER_TOKEN'),
    presenceOrigin: requiredEnv('CODEX_PRESENCE_ORIGIN', 'http://127.0.0.1:4782'),
    presenceToken: requiredEnv('CODEX_PRESENCE_TOKEN'),
    runnerId: requiredEnv('CORE_INK_CODEX_RUNNER_ID', 'runner-macbook'),
    deviceId: requiredEnv('CORE_INK_CODEX_DEVICE_ID', 'core-ink'),
    taskId: requiredEnv('CORE_INK_CODEX_TASK_ID'),
    journal: new FileRunnerJournal(join(runtimeDir, 'journal.json'))
  });
}

function requiredEnv(name: string, fallback = ''): string {
  const value = process.env[name]?.trim() || fallback;
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

type ProcessReceipt = {
  pid: number;
  started_at: string;
  runner_id: string;
  device_id: string;
  task_id: string;
};

async function readProcessReceipt(): Promise<ProcessReceipt | null> {
  try {
    const value = JSON.parse(await readFile(processPath, 'utf8')) as Partial<ProcessReceipt>;
    return typeof value.pid === 'number' && typeof value.started_at === 'string'
      ? value as ProcessReceipt
      : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
