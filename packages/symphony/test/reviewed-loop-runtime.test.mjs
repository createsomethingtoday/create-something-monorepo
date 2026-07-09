import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import { MemoryLogger } from '../src/logger.js';
import {
  create_codex_stage_executor,
  repository_fingerprint,
} from '../src/reviewed-loop-runtime.js';

const execFileAsync = promisify(execFile);

async function git(cwd, args) {
  await execFileAsync('git', args, { cwd });
}

function reviewerWorkUnit() {
  return {
    schema_version: 'multi-agent-work-unit.v1',
    id: 'CRE-1154-reviewer',
    linear: { issue: 'CRE-1154' },
    lane: 'review',
    role: 'reviewer',
    tier: ['Database', 'Automation', 'Judgment'],
    goal: 'Review the bounded pilot.',
    scope: { packages: ['@create-something/symphony'], paths: ['packages/symphony/**'] },
    locks: { packages: ['@create-something/symphony'], paths: ['packages/symphony/**'], mode: 'read' },
    allowed_commands: ['git diff --check'],
    verification: [{ command: 'git diff --check', evidence: 'Diff is valid.' }],
    evidence: { target: 'Linear CRE-1154 comment', required_artifacts: ['review receipt'] },
    stop_conditions: ['Stop before editing any file.'],
    promotion_gate: { batch_agents: false, production_mutation: false, merge_or_deploy: false },
  };
}

test('Codex stage executor honors read-only sandbox and returns verified metrics', async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), 'reviewed-loop-runtime-'));
  const logPath = join(tmpdir(), `reviewed-loop-runtime-${process.pid}-${Date.now()}.json`);
  t.after(async () => {
    await rm(workspace, { recursive: true, force: true });
    await rm(logPath, { force: true });
  });

  await git(workspace, ['init', '--quiet']);
  await git(workspace, ['config', 'user.email', 'codex@example.com']);
  await git(workspace, ['config', 'user.name', 'Codex Test']);
  await writeFile(join(workspace, 'README.md'), 'baseline\n', 'utf8');
  await git(workspace, ['add', 'README.md']);
  await git(workspace, ['commit', '--quiet', '-m', 'baseline']);

  const fakeCodexPath = join(workspace, 'fake-codex.mjs');
  await writeFile(
    fakeCodexPath,
    `import { appendFileSync } from 'node:fs';
import readline from 'node:readline';
const rl = readline.createInterface({ input: process.stdin });
const send = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
rl.on('line', (line) => {
  const message = JSON.parse(line);
  if (typeof message.id !== 'number') return;
  if (message.id === 99 && message.result) {
    appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify({ approval: message.result }) + '\\n');
    return;
  }
  if (message.method === 'initialize') return send({ id: message.id, result: { ok: true } });
  if (message.method === 'thread/start') return send({ id: message.id, result: { thread: { id: 'thread-reviewer' } } });
  if (message.method === 'turn/start') {
    appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify({ sandbox: message.params.sandboxPolicy }) + '\\n');
    send({ id: message.id, result: { turn: { id: 'turn-reviewer' } } });
    send({ id: 99, method: 'item/commandExecution/requestApproval', params: {} });
    send({ method: 'item/started', params: { item: { id: 'msg-reviewer', type: 'agentMessage', text: '' } } });
    send({ method: 'thread/tokenUsage/updated', params: { input_tokens: 12, output_tokens: 8, total_tokens: 20 } });
    send({ method: 'item/completed', params: { item: { id: 'msg-reviewer', type: 'agentMessage', text: 'No actionable findings.' } } });
    setTimeout(() => send({ method: 'turn/completed', params: { turn: { id: 'turn-reviewer' } } }), 20);
  }
});
`,
    'utf8',
  );

  const config = {
    codex: {
      command: `${process.execPath} ${fakeCodexPath}`,
      approval_policy: 'on-request',
      thread_sandbox: 'workspace-write',
      turn_sandbox_policy: { type: 'workspaceWrite' },
      turn_timeout_ms: 5_000,
      read_timeout_ms: 5_000,
      stall_timeout_ms: 5_000,
    },
  };
  const unit = reviewerWorkUnit();

  const before = await repository_fingerprint(workspace);
  const execute = create_codex_stage_executor({
    issue: { identifier: 'CRE-1154', title: 'Pilot reviewed loop', description: 'Bounded test.' },
    workspace_path: workspace,
    config,
    logger: new MemoryLogger(),
    env: { ...process.env, FAKE_CODEX_LOG: logPath },
  });
  const receipt = await execute({
    role: 'reviewer',
    run_id: 'CRE-1154-reviewed-single-pass',
    work_unit: unit,
    sandbox: 'read-only',
    prior_receipts: [],
  });
  const after = await repository_fingerprint(workspace);

  assert.equal(before, after);
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.role, 'reviewer');
  assert.equal(receipt.run_id, 'CRE-1154-reviewed-single-pass');
  assert.deepEqual(receipt.changed_paths, []);
  assert.deepEqual(receipt.commands, [
    { command: 'git diff --check', exit_code: 0, summary: 'Diff is valid.' },
  ]);
  assert.deepEqual(receipt.metrics.tokens, { input: 12, output: 8, total: 20 });
  const protocolLog = (await readFile(logPath, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(protocolLog, [
    { sandbox: { type: 'readOnly' } },
    { approval: { decision: 'decline' } },
  ]);
});
