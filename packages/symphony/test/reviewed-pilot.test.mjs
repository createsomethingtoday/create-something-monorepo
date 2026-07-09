import assert from 'node:assert/strict';
import test from 'node:test';

import { run_reviewed_pilot, select_reviewed_pilot_issue } from '../src/reviewed-pilot.js';

function workUnit(role, mode) {
  return {
    schema_version: 'multi-agent-work-unit.v1',
    id: `CRE-1154-${role}`,
    linear: { issue: 'CRE-1154' },
    lane: role === 'worker' ? 'code-quality' : 'review',
    role,
    tier: ['Database', 'Automation', 'Judgment'],
    goal: `${role} the bounded pilot.`,
    scope: { packages: ['@create-something/symphony'], paths: ['packages/symphony/**'] },
    locks: { packages: ['@create-something/symphony'], paths: ['packages/symphony/**'], mode },
    allowed_commands: ['git diff --check'],
    verification: [{ command: 'git diff --check', evidence: 'Diff is valid.' }],
    evidence: { target: 'Linear CRE-1154 comment', required_artifacts: ['stage receipt'] },
    stop_conditions: ['Stop before batch or daemon promotion.'],
    promotion_gate: { batch_agents: false, production_mutation: false, merge_or_deploy: false },
  };
}

function workUnits() {
  return {
    worker: workUnit('worker', 'write'),
    reviewer: workUnit('reviewer', 'read'),
    integrator: workUnit('integrator', 'write'),
  };
}

test('reviewed pilot selects exactly the requested Linear issue', () => {
  const selected = select_reviewed_pilot_issue(
    [
      { id: 'one', identifier: 'CRE-1153', title: 'Other active work' },
      { id: 'two', identifier: 'CRE-1154', title: 'Reviewed pilot' },
      { id: 'three', identifier: 'CRE-1152', title: 'Another active issue' },
    ],
    'cre-1154',
  );

  assert.equal(selected.id, 'two');
  assert.equal(selected.identifier, 'CRE-1154');
});

test('reviewed pilot refuses to dispatch when the exact issue is unavailable', () => {
  assert.throws(
    () => select_reviewed_pilot_issue([{ id: 'one', identifier: 'CRE-1153' }], 'CRE-1154'),
    (error) => error?.code === 'reviewed_issue_not_dispatchable',
  );
});

test('reviewed pilot readiness validates one issue and three stage contracts without dispatch', async () => {
  let workspaceCalls = 0;
  const report = await run_reviewed_pilot({
    issue_identifier: 'CRE-1154',
    dispatch: false,
    tracker: {
      async fetch_candidate_issues() {
        return [{ id: 'two', identifier: 'CRE-1154', title: 'Reviewed pilot' }];
      },
    },
    workspace_manager: {
      async ensure_workspace() {
        workspaceCalls += 1;
        return { path: '/tmp/should-not-run' };
      },
    },
    work_units: workUnits(),
    removed_model_api_keys: ['OPENAI_API_KEY'],
    receipt_destination: '/proof/CRE-1154.reviewed-run-receipt.json',
  });

  assert.equal(workspaceCalls, 0);
  assert.deepEqual(report, {
    mode: 'readiness',
    issue: { id: 'two', identifier: 'CRE-1154', title: 'Reviewed pilot' },
    work_unit_ids: ['CRE-1154-worker', 'CRE-1154-reviewer', 'CRE-1154-integrator'],
    removed_model_api_keys: ['OPENAI_API_KEY'],
    verification_commands: ['git diff --check'],
    reviewer_guard: {
      sandbox: 'read-only',
      fingerprint: 'sha256 repository state before and after review',
      mutation_result: 'fail',
    },
    metric_fields: [
      'elapsed_ms',
      'stage_duration_ms',
      'retry_count',
      'human_intervention_count',
      'tokens',
    ],
    receipt_destination: '/proof/CRE-1154.reviewed-run-receipt.json',
    dispatched: false,
  });
});

test('reviewed pilot dispatch claims one issue, preserves one workspace, and records aggregate proof', async () => {
  const calls = [];
  const comments = [];
  const units = workUnits();
  const report = await run_reviewed_pilot({
    issue_identifier: 'CRE-1154',
    dispatch: true,
    tracker: {
      async fetch_candidate_issues() {
        return [{ id: 'two', identifier: 'CRE-1154', title: 'Reviewed pilot' }];
      },
      async claim_issue(issue) {
        calls.push(`claim:${issue.identifier}`);
        return { ...issue, description: 'Bounded reviewed pilot.' };
      },
      async comment_issue(issueId, body) {
        comments.push({ issueId, body });
      },
    },
    workspace_manager: {
      async ensure_workspace(identifier) {
        calls.push(`workspace:${identifier}`);
        return { path: '/tmp/cre-1154-reviewed-workspace' };
      },
    },
    work_units: units,
    fingerprint: async () => 'stable-worker-diff',
    create_stage_executor: () => async ({ role, run_id, work_unit }) => ({
      schema_version: 'multi-agent-evidence-receipt.v1',
      run_id,
      role,
      work_unit_id: work_unit.id,
      linear: { issue: 'CRE-1154' },
      status: 'passed',
      commands: [{ command: 'git diff --check', exit_code: 0, summary: 'Diff is valid.' }],
      changed_paths: role === 'reviewer' ? [] : [`packages/symphony/${role}.txt`],
      evidence: `${role} completed.`,
      next_decision: 'Continue.',
      metrics: {
        duration_ms: 5,
        retry_count: 0,
        human_intervention_count: 0,
        tokens: { input: 1, output: 1, total: 2 },
      },
    }),
    async write_receipt(receipt) {
      calls.push(`write:${receipt.run_id}`);
      return '/proof/CRE-1154.reviewed-run-receipt.json';
    },
  });

  assert.deepEqual(calls, [
    'claim:CRE-1154',
    'workspace:CRE-1154',
    'write:CRE-1154-reviewed-single-pass',
  ]);
  assert.equal(report.dispatched, true);
  assert.equal(report.mode, 'dispatch');
  assert.equal(report.workspace_path, '/tmp/cre-1154-reviewed-workspace');
  assert.equal(report.receipt_path, '/proof/CRE-1154.reviewed-run-receipt.json');
  assert.equal(report.receipt.status, 'passed');
  assert.equal(comments.length, 1);
  assert.equal(comments[0].issueId, 'two');
  assert.match(comments[0].body, /CRE-1154-reviewed-single-pass/);
  assert.match(comments[0].body, /Reviewer fingerprint unchanged: yes/);
});
