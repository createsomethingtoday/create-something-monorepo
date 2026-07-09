import assert from 'node:assert/strict';
import test from 'node:test';

import { run_reviewed_loop } from '../src/reviewed-loop.js';
import { validate_agent_contract } from '../src/work-unit-contract.js';

function workUnit(role, lockMode) {
  return {
    schema_version: 'multi-agent-work-unit.v1',
    id: `CRE-1154-${role}`,
    linear: { issue: 'CRE-1154' },
    lane: role === 'worker' ? 'code-quality' : 'review',
    role,
    tier: ['Database', 'Automation', 'Judgment'],
    goal: `${role} the bounded reviewed pilot.`,
    scope: {
      packages: ['@create-something/symphony'],
      paths: ['packages/symphony/**'],
    },
    locks: {
      packages: ['@create-something/symphony'],
      paths: ['packages/symphony/**'],
      mode: lockMode,
    },
    allowed_commands: ['corepack pnpm --filter @create-something/symphony test'],
    verification: [
      {
        command: 'corepack pnpm --filter @create-something/symphony test',
        evidence: 'Symphony tests pass.',
      },
    ],
    evidence: {
      target: 'Linear CRE-1154 comment',
      required_artifacts: ['stage receipt'],
    },
    stop_conditions: ['Stop before batch or daemon promotion.'],
    promotion_gate: {
      batch_agents: false,
      production_mutation: false,
      merge_or_deploy: false,
    },
  };
}

function receipt(workUnit, role, runId, overrides = {}) {
  return {
    schema_version: 'multi-agent-evidence-receipt.v1',
    run_id: runId,
    role,
    work_unit_id: workUnit.id,
    linear: { issue: 'CRE-1154' },
    status: 'passed',
    commands: [
      {
        command: 'corepack pnpm --filter @create-something/symphony test',
        exit_code: 0,
        summary: `${role} verification passed.`,
      },
    ],
    changed_paths: role === 'reviewer' ? [] : [`packages/symphony/${role}.txt`],
    evidence: `${role} completed.`,
    next_decision: `${role} may hand off to the next stage.`,
    metrics: {
      duration_ms: 10,
      retry_count: role === 'worker' ? 1 : 0,
      human_intervention_count: 0,
      tokens: { input: 10, output: 5, total: 15 },
    },
    ...overrides,
  };
}

test('reviewed loop executes worker, read-only reviewer, then integrator and aggregates proof', async () => {
  const units = {
    worker: workUnit('worker', 'write'),
    reviewer: workUnit('reviewer', 'read'),
    integrator: workUnit('integrator', 'write'),
  };
  const calls = [];
  const fingerprints = ['worker-diff-v1', 'worker-diff-v1'];
  let now = 1_000;

  const result = await run_reviewed_loop({
    issue: { identifier: 'CRE-1154', title: 'Pilot reviewed loop' },
    work_units: units,
    now_ms: () => (now += 10),
    fingerprint: async () => fingerprints.shift(),
    execute_stage: async ({ role, run_id, work_unit, sandbox, prior_receipts }) => {
      calls.push({ role, run_id, sandbox, prior_receipts: prior_receipts.map((entry) => entry.work_unit_id) });
      return receipt(work_unit, role, run_id);
    },
  });

  assert.deepEqual(calls, [
    { role: 'worker', run_id: 'CRE-1154-reviewed-single-pass', sandbox: 'workspace-write', prior_receipts: [] },
    { role: 'reviewer', run_id: 'CRE-1154-reviewed-single-pass', sandbox: 'read-only', prior_receipts: ['CRE-1154-worker'] },
    {
      role: 'integrator',
      run_id: 'CRE-1154-reviewed-single-pass',
      sandbox: 'workspace-write',
      prior_receipts: ['CRE-1154-worker', 'CRE-1154-reviewer'],
    },
  ]);
  assert.equal(result.status, 'passed');
  assert.equal(result.reviewer_guard.unchanged, true);
  assert.equal(result.reviewer_guard.sandbox, 'read-only');
  assert.deepEqual(result.changed_paths, [
    'packages/symphony/integrator.txt',
    'packages/symphony/worker.txt',
  ]);
  assert.deepEqual(result.metrics, {
    elapsed_ms: 10,
    stage_duration_ms: { worker: 10, reviewer: 10, integrator: 10 },
    retry_count: 1,
    human_intervention_count: 0,
    tokens: { input: 30, output: 15, total: 45 },
  });
  assert.deepEqual(
    result.stages.map((entry) => entry.work_unit_id),
    ['CRE-1154-worker', 'CRE-1154-reviewer', 'CRE-1154-integrator'],
  );
  assert.deepEqual(result.stages.map((entry) => entry.role), ['worker', 'reviewer', 'integrator']);
  assert.ok(result.stages.every((entry) => entry.run_id === result.run_id));
  assert.deepEqual(validate_agent_contract(result), {
    ok: true,
    kind: 'reviewed_run_receipt',
    errors: [],
  });
});

test('reviewed loop stops before integration when reviewer mutates the worker workspace', async () => {
  const units = {
    worker: workUnit('worker', 'write'),
    reviewer: workUnit('reviewer', 'read'),
    integrator: workUnit('integrator', 'write'),
  };
  const calls = [];
  const fingerprints = ['worker-diff-v1', 'reviewer-mutated-diff'];

  await assert.rejects(
    run_reviewed_loop({
      issue: { identifier: 'CRE-1154', title: 'Pilot reviewed loop' },
      work_units: units,
      fingerprint: async () => fingerprints.shift(),
      execute_stage: async ({ role, run_id, work_unit }) => {
        calls.push(role);
        return receipt(work_unit, role, run_id);
      },
    }),
    (error) => error?.code === 'reviewer_mutated_workspace',
  );

  assert.deepEqual(calls, ['worker', 'reviewer']);
});

test('reviewed loop rejects stage changes outside the declared path locks', async () => {
  const units = {
    worker: workUnit('worker', 'write'),
    reviewer: workUnit('reviewer', 'read'),
    integrator: workUnit('integrator', 'write'),
  };

  await assert.rejects(
    run_reviewed_loop({
      issue: { identifier: 'CRE-1154', title: 'Pilot reviewed loop' },
      work_units: units,
      fingerprint: async () => 'unused',
      execute_stage: async ({ role, run_id, work_unit }) => receipt(
        work_unit,
        role,
        run_id,
        role === 'worker' ? { changed_paths: ['outside-contract.txt'] } : {},
      ),
    }),
    (error) => error?.code === 'stage_scope_violation',
  );
});

test('reviewed loop accepts changed paths covered by mixed wildcard locks', async () => {
  const units = {
    worker: workUnit('worker', 'write'),
    reviewer: workUnit('reviewer', 'read'),
    integrator: workUnit('integrator', 'write'),
  };
  units.worker.locks.paths = ['packages/*/src/**'];

  const result = await run_reviewed_loop({
    issue: { identifier: 'CRE-1154', title: 'Pilot reviewed loop' },
    work_units: units,
    fingerprint: async () => 'worker-diff-v1',
    execute_stage: async ({ role, run_id, work_unit }) => receipt(
      work_unit,
      role,
      run_id,
      role === 'worker'
        ? { changed_paths: ['packages/symphony/src/reviewed-loop.js'] }
        : {},
    ),
  });

  assert.equal(result.status, 'passed');
});

export { receipt, workUnit };
