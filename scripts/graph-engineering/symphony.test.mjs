import assert from 'node:assert/strict';
import test from 'node:test';
import { projectSymphonyReview } from './symphony.mjs';

function receipt() {
  const metrics = {
    duration_ms: 1,
    retry_count: 0,
    human_intervention_count: 0,
    tokens: { input: 1, output: 1, total: 2 }
  };
  return {
    schema_version: 'multi-agent-reviewed-run-receipt.v1',
    run_id: 'review-run',
    linear: { issue: 'CRE-2322' },
    status: 'passed',
    stages: ['worker', 'reviewer', 'integrator'].map((role) => ({
      schema_version: 'multi-agent-evidence-receipt.v1',
      work_unit_id: `unit-${role}`,
      run_id: 'review-run',
      role,
      linear: { issue: 'CRE-2322' },
      status: 'passed',
      commands: [{ command: 'private-command', exit_code: 0, summary: 'private-summary' }],
      changed_paths: [],
      evidence: 'private-evidence',
      next_decision: 'private-decision',
      metrics,
      actorSubject: 'private-actor'
    })),
    reviewer_guard: {
      sandbox: 'read-only',
      before: 'fingerprint',
      after: 'fingerprint',
      unchanged: true
    },
    changed_paths: [],
    metrics: {
      elapsed_ms: 3,
      retry_count: 0,
      human_intervention_count: 0,
      tokens: { input: 3, output: 3, total: 6 },
      stage_duration_ms: { worker: 1, reviewer: 1, integrator: 1 }
    },
    next_decision: 'private-next'
  };
}

test('projects only review relationships and labels schema validation without authenticity claims', () => {
  const input = receipt();
  const before = structuredClone(input);
  assert.deepEqual(projectSymphonyReview(input), {
    runId: 'review-run',
    issue: 'CRE-2322',
    status: 'passed',
    stages: ['worker', 'reviewer', 'integrator'].map((role) => ({
      role,
      workUnitId: `unit-${role}`,
      status: 'passed'
    })),
    verification: 'schema_validated'
  });
  assert.deepEqual(input, before);
  assert.equal(JSON.stringify(projectSymphonyReview(input)).includes('private-'), false);
});

test('rejects an unknown schema or a standalone stage receipt', () => {
  assert.throws(() => projectSymphonyReview({ ...receipt(), schema_version: 'unknown' }));
  assert.throws(() => projectSymphonyReview(receipt().stages[0]));
});

test('rejects duplicate work unit identities', () => {
  const input = receipt();
  input.stages[1].work_unit_id = input.stages[0].work_unit_id;
  assert.throws(() => projectSymphonyReview(input), /duplicate/i);
});

test('rejects passed overall status contradicted by a failed or blocked stage', () => {
  for (const status of ['failed', 'blocked']) {
    const input = receipt();
    input.stages[1].status = status;
    assert.throws(() => projectSymphonyReview(input), /passed/i);
  }
});

test('rejects passed stages contradicted by nonzero command exits', () => {
  const input = receipt();
  input.stages[0].commands[0].exit_code = 1;
  assert.throws(() => projectSymphonyReview(input), /passed/i);
});

test('preserves failed and blocked reports without promoting them to completion', () => {
  for (const status of ['failed', 'blocked']) {
    const input = receipt();
    input.status = status;
    input.stages[1].status = status;
    input.stages[1].commands[0].exit_code = 1;
    const output = projectSymphonyReview(input);
    assert.equal(output.status, status);
    assert.equal(output.stages[1].status, status);
    assert.equal(output.verification, 'schema_validated');
  }
});

test('rejects reviewer guard failures and cross-run or cross-issue stages', () => {
  const invalid = [
    (input) => {
      input.reviewer_guard.unchanged = false;
    },
    (input) => {
      input.reviewer_guard.after = 'mutated';
    },
    (input) => {
      input.stages[1].run_id = 'other-run';
    },
    (input) => {
      input.stages[1].linear.issue = 'CRE-9999';
    }
  ];
  for (const mutate of invalid) {
    const input = receipt();
    mutate(input);
    assert.throws(() => projectSymphonyReview(input));
  }
});
