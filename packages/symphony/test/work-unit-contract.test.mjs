import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validate_agent_contract_file } from '../src/work-unit-contract.js';

async function withTempJson(t, name, value) {
  const root = await mkdtemp(join(tmpdir(), 'symphony-work-unit-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const path = join(root, name);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

function validWorkUnit() {
  return {
    schema_version: 'multi-agent-work-unit.v1',
    id: 'CRE-1131-code-quality-contract',
    linear: { issue: 'CRE-1131', map_issue: 'CRE-1130' },
    lane: 'code-quality',
    role: 'worker',
    tier: ['Database', 'Automation', 'Judgment'],
    goal: 'Define the first verifier-backed multi-agent work contract.',
    scope: { packages: ['@create-something/symphony'], paths: ['packages/symphony/**'] },
    locks: { packages: ['@create-something/symphony'], paths: ['packages/symphony/src/work-unit-contract.js'], mode: 'write' },
    allowed_commands: ['pnpm --filter @create-something/symphony test'],
    verification: [{ command: 'pnpm --filter @create-something/symphony test', evidence: 'Tests pass.' }],
    evidence: { target: 'Linear CRE-1131 comment', required_artifacts: ['command output'] },
    stop_conditions: ['Stop before batch dispatch.'],
    promotion_gate: { batch_agents: false, production_mutation: false, merge_or_deploy: false },
  };
}

test('agent work-unit verifier accepts valid work unit and evidence receipt contracts', async (t) => {
  const workUnitPath = await withTempJson(t, 'work-unit.json', validWorkUnit());
  const receiptPath = await withTempJson(t, 'receipt.json', {
    schema_version: 'multi-agent-evidence-receipt.v1',
    run_id: 'CRE-1131-reviewed-single-pass',
    role: 'worker',
    work_unit_id: 'CRE-1131-code-quality-contract',
    linear: { issue: 'CRE-1131' },
    status: 'passed',
    commands: [{ command: 'pnpm --filter @create-something/symphony test', exit_code: 0, summary: 'Tests passed.' }],
    changed_paths: ['packages/symphony/src/work-unit-contract.js'],
    evidence: 'Verifier command exited 0.',
    next_decision: 'Ready for one reviewed Symphony single-pass pilot.',
    metrics: {
      duration_ms: 10,
      retry_count: 0,
      human_intervention_count: 0,
      tokens: { input: 1, output: 1, total: 2 },
    },
  });

  assert.deepEqual((await validate_agent_contract_file(workUnitPath)).errors, []);
  assert.deepEqual((await validate_agent_contract_file(receiptPath)).errors, []);
});

test('agent work-unit verifier rejects write work without package or path locks', async (t) => {
  const unsafe = validWorkUnit();
  unsafe.locks = { packages: [], paths: [], mode: 'write' };
  const result = await validate_agent_contract_file(await withTempJson(t, 'unsafe.json', unsafe));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('locks.paths or locks.packages')));
});

test('agent work-unit verifier rejects reviewer work with write locks', async (t) => {
  const unsafe = validWorkUnit();
  unsafe.id = 'CRE-1154-reviewer';
  unsafe.linear.issue = 'CRE-1154';
  unsafe.role = 'reviewer';
  unsafe.lane = 'review';
  unsafe.locks.mode = 'write';

  const result = await validate_agent_contract_file(
    await withTempJson(t, 'unsafe-reviewer.json', unsafe),
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('reviewer work units must use read locks')));
});

test('agent work-unit verifier rejects verification commands outside the allowlist', async (t) => {
  const unsafe = validWorkUnit();
  unsafe.verification[0].command = 'git push origin main';

  const result = await validate_agent_contract_file(
    await withTempJson(t, 'unlisted-verification.json', unsafe),
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('must appear in allowed_commands')));
});

test('agent evidence receipt rejects missing cycle metrics', async (t) => {
  const receipt = {
    schema_version: 'multi-agent-evidence-receipt.v1',
    run_id: 'CRE-1154-reviewed-single-pass',
    role: 'worker',
    work_unit_id: 'CRE-1154-worker',
    linear: { issue: 'CRE-1154' },
    status: 'passed',
    commands: [{ command: 'git diff --check', exit_code: 0, summary: 'Diff is valid.' }],
    changed_paths: [],
    evidence: 'Worker completed.',
    next_decision: 'Continue.',
  };

  const result = await validate_agent_contract_file(
    await withTempJson(t, 'receipt-without-metrics.json', receipt),
  );

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('metrics must be an object')));
});

export { validWorkUnit };
