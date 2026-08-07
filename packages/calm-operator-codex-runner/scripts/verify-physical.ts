import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { CODEX_PAGER_FOLLOW_UP, PhysicalPassCollector } from '../src/index.js';

const root = resolve(import.meta.dirname, '../../..');
const serialPort = requiredOption('--port');
const taskId = simpleId(requiredOption('--task-id'), 'task ID');
const pass = passNumber(requiredOption('--pass'));
const kind = requiredOption('--kind');
if (kind !== 'consecutive' && kind !== 'recovery') throw new Error('--kind must be consecutive or recovery.');
if (!serialPort.startsWith('/dev/cu.') || !existsSync(serialPort)) {
  throw new Error('The exact Core Ink /dev/cu.* serial target is required.');
}
const codexHome = process.env.CODEX_HOME?.trim() || join(homedir(), '.codex');
const rolloutPath = findRollout(codexHome, taskId);
const baselinePromptCount = countFixedPrompts(rolloutPath);
const bridgeOrigin = secureOrigin(process.env.INK_ORIGIN || 'https://ink.createsomething.agency');
const deviceId = simpleId(process.env.CORE_INK_CODEX_DEVICE_ID || 'core-ink', 'device ID');
const deviceToken = loadInfisicalSecret(
  process.env.CORE_INK_CODEX_DEVICE_SECRET_NAME || 'INK_DEVICE_TOKEN'
);
const evidenceDirectory = resolve(
  root,
  '.tmp',
  'core-ink-codex-physical',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-pass-${pass}`
);
const evidencePath = join(evidenceDirectory, 'physical-pass.json');
const evidence: Record<string, unknown> = {
  schema: 'core-ink-codex-physical-pass/v1',
  status: 'running',
  kind,
  pass,
  physical_input: false,
  serial_port: serialPort,
  task_id: taskId,
  started_at: new Date().toISOString()
};
mkdirSync(evidenceDirectory, { recursive: true });
writeEvidence();

let monitor: ChildProcess | null = null;
try {
  const recovery = kind === 'recovery'
    ? verifyRecoveryReceipt(requiredOption('--recovery-receipt'), taskId)
    : null;
  const collector = new PhysicalPassCollector();
  monitor = spawn('pio', [
    'device', 'monitor', '--port', serialPort, '--baud', '115200', '--raw', '--quiet', '--no-reconnect'
  ], { cwd: resolve(root, 'packages/calm-operator-ink-firmware'), stdio: ['ignore', 'pipe', 'pipe'] });
  const physical = await collectPhysicalPass(monitor, collector);
  assert(physical.task_id === taskId, 'Physical pager targeted a different disposable task.');
  if (recovery) {
    assert(
      Date.parse(physical.confirmed_at) > Date.parse(recovery.restarted_at),
      'Recovery physical action occurred before the runner restart completed.'
    );
    assert(
      physical.request_id !== recovery.last_terminal_request_id_before_stop,
      'Recovery reused the pre-outage request ID.'
    );
  }
  const command = await bridgeJson(
    `/ink/codex/commands/${encodeURIComponent(physical.request_id)}?device_id=${encodeURIComponent(deviceId)}`,
    deviceToken
  );
  assert(command.request_id === physical.request_id, 'Bridge command request ID did not match serial evidence.');
  assert(command.task_id === physical.task_id, 'Bridge command task ID did not match serial evidence.');
  assert(command.action_id === physical.action_id, 'Bridge command action ID did not match serial evidence.');
  assert(command.status === 'accepted', 'Bridge command was not accepted.');
  assert(command.receipt?.status === 'accepted', 'Bridge command had no accepted runner receipt.');
  const deviceView = await bridgeJson(`/ink/codex?device_id=${encodeURIComponent(deviceId)}`, deviceToken);
  assert(deviceView.request_id === physical.request_id, 'Pager readback request ID did not match.');
  assert(deviceView.receipt?.status === 'accepted', 'Pager readback receipt was not accepted.');
  const rollout = await waitForOneNewPrompt(rolloutPath, baselinePromptCount);

  Object.assign(evidence, {
    status: 'passed',
    physical_input: true,
    completed_at: new Date().toISOString(),
    firmware_version: physical.firmware_version,
    task_id: physical.task_id,
    action_id: physical.action_id,
    request_id: physical.request_id,
    physical_selects: physical.physical_selects,
    armed_at: physical.armed_at,
    confirmed_at: physical.confirmed_at,
    accepted_at: physical.accepted_at,
    serial_events: physical.serial_events,
    bridge_status: command.status,
    runner_receipt: command.receipt.status,
    pager_readback: deviceView.receipt.status,
    rollout_prompt_count_before: baselinePromptCount,
    rollout_prompt_count_after: rollout.count,
    rollout_prompt_at: rollout.at,
    duplicate_execution: false
  });
  if (recovery) evidence.recovery = recovery;
  writeEvidence();
  console.log(`Core Ink physical pass ${pass} verified: ${evidencePath}`);
} catch (error) {
  Object.assign(evidence, {
    status: 'failed',
    completed_at: new Date().toISOString(),
    error: bounded(error instanceof Error ? error.message : String(error))
  });
  writeEvidence();
  console.error(`Core Ink physical verifier failed: ${evidence.error}`);
  console.error(`Evidence: ${evidencePath}`);
  process.exitCode = 1;
} finally {
  if (monitor?.pid) monitor.kill('SIGTERM');
}

function collectPhysicalPass(
  child: ChildProcess,
  collector: PhysicalPassCollector
): Promise<ReturnType<PhysicalPassCollector['result']>> {
  return new Promise((resolvePass, reject) => {
    const deadline = setTimeout(() => reject(new Error('Timed out waiting for a physical Core Ink pass.')), 180_000);
    let buffer = '';
    const consume = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      try {
        for (const line of lines) {
          collector.push(line, new Date());
          if (collector.done()) {
            clearTimeout(deadline);
            resolvePass(collector.result());
            return;
          }
        }
      } catch (error) {
        clearTimeout(deadline);
        reject(error);
      }
    };
    child.stdout?.on('data', consume);
    child.stderr?.on('data', consume);
    child.once('exit', (code) => {
      if (!collector.done()) {
        clearTimeout(deadline);
        reject(new Error(`Serial monitor exited before physical completion (${code ?? 'signal'}).`));
      }
    });
  });
}

async function bridgeJson(path: string, token: string): Promise<Record<string, any>> {
  const response = await fetch(`${bridgeOrigin}${path}`, {
    headers: { 'x-ink-token': token },
    signal: AbortSignal.timeout(10_000)
  });
  const value = await response.json() as Record<string, any>;
  if (!response.ok) throw new Error(`Ink bridge returned ${response.status}: ${value.error || 'unknown error'}`);
  return value;
}

async function waitForOneNewPrompt(path: string, baseline: number): Promise<{ count: number; at: string }> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const entries = promptEntries(path);
    if (entries.length > baseline + 1) throw new Error('Disposable Codex received duplicate fixed prompts.');
    if (entries.length === baseline + 1) return { count: entries.length, at: entries.at(-1)!.timestamp };
    await delay(300);
  }
  throw new Error('Timed out waiting for the physical follow-up in the disposable Codex rollout.');
}

function countFixedPrompts(path: string): number {
  return promptEntries(path).length;
}

function promptEntries(path: string): Array<{ timestamp: string }> {
  const entries: Array<{ timestamp: string }> = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) continue;
    try {
      const item = JSON.parse(line) as Record<string, any>;
      if (item.type !== 'response_item' || item.payload?.type !== 'message' || item.payload?.role !== 'user') continue;
      const exact = Array.isArray(item.payload.content) && item.payload.content.some(
        (content: Record<string, any>) =>
          content.type === 'input_text' && String(content.text || '').trim() === CODEX_PAGER_FOLLOW_UP
      );
      if (exact) entries.push({ timestamp: String(item.timestamp || '') });
    } catch {}
  }
  return entries;
}

function findRollout(codexHome: string, taskId: string): string {
  const sessions = join(codexHome, 'sessions');
  const matches: string[] = [];
  walk(sessions, matches, taskId);
  if (matches.length !== 1) throw new Error(`Expected one rollout for disposable task ${taskId}; found ${matches.length}.`);
  return matches[0]!;
}

function walk(directory: string, matches: string[], taskId: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, matches, taskId);
    else if (entry.isFile() && entry.name.endsWith(`-${taskId}.jsonl`)) matches.push(path);
  }
}

function verifyRecoveryReceipt(path: string, selectedTaskId: string): Record<string, any> {
  const value = JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;
  assert(value.kind === 'runner_restart', 'Recovery receipt does not prove a runner restart.');
  assert(value.status === 'restarted', 'Recovery receipt does not prove a completed runner restart.');
  assert(value.task_id === selectedTaskId, 'Recovery receipt targets a different disposable task.');
  assert(value.no_action_during_outage === true, 'Recovery receipt does not prove an empty outage queue.');
  assert(Number.isFinite(Date.parse(value.stopped_at)), 'Recovery stop time is invalid.');
  assert(Number.isFinite(Date.parse(value.restarted_at)), 'Recovery restart time is invalid.');
  assert(Date.parse(value.restarted_at) > Date.parse(value.stopped_at), 'Recovery restart did not follow the stop.');
  assert(Date.parse(value.restarted_at) <= Date.now(), 'Recovery restart is in the future.');
  return {
    kind: value.kind,
    status: value.status,
    task_id: value.task_id,
    stopped_at: value.stopped_at,
    restarted_at: value.restarted_at,
    last_terminal_request_id_before_stop: value.last_terminal_request_id_before_stop || null,
    no_action_during_outage: true
  };
}

function loadInfisicalSecret(name: string): string {
  const localBinary = resolve(dirname(process.execPath), 'infisical');
  const binary = existsSync('/opt/homebrew/bin/infisical')
    ? '/opt/homebrew/bin/infisical'
    : existsSync(localBinary) ? localBinary : 'infisical';
  const result = spawnSync(binary, [
    'secrets', 'get', name,
    `--env=${process.env.CORE_INK_CODEX_INFISICAL_ENV || 'prod'}`,
    `--path=${process.env.CORE_INK_CODEX_INFISICAL_PATH || '/'}`,
    '--include-imports=true', '--plain', '--silent'
  ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const value = result.stdout.trim();
  if (result.status !== 0 || !value || value.includes('\n')) throw new Error(`Could not load Infisical secret ${name}.`);
  return value;
}

function requiredOption(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? String(process.argv[index + 1] || '').trim() : '';
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function simpleId(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,239}$/.test(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function passNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) throw new Error('--pass must be 1, 2, 3, or 4.');
  return parsed;
}

function secureOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('INK_ORIGIN must use HTTPS for physical verification.');
  return url.origin;
}

function writeEvidence(): void {
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  chmodSync(evidencePath, 0o600);
  statSync(evidencePath);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function bounded(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
