import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, workflow } from './graph.mjs';

const sha = 'a'.repeat(40);
const old = 'b'.repeat(40);
const review = { type: 'review', verdict: 'approved', independent: true, sha };
const ci = { type: 'ci', verdict: 'passed', sha };
const run = (events) =>
  plan({
    caseId: 'case-1',
    sha,
    events: events.map((event, i) => event && { caseId: 'case-1', id: `receipt-${i}`, ...event })
  });
const types = (result) => result.actions.map((action) => action.type);

test('initial plan schedules independent review and CI with explanations', () => {
  const result = run([]);
  assert.deepEqual(types(result), ['request_independent_review', 'run_ci']);
  assert.equal(result.version, workflow.version);
  assert.ok(result.actions.every((action) => action.reason && action.sha === sha));
});
test('both exact revision gates permit readiness assessment, never release', () => {
  const result = run([review, ci]);
  assert.equal(result.state, 'release_readiness');
  assert.deepEqual(types(result), ['assess_release_readiness']);
  assert.equal(result.releaseAuthorized, false);
  assert.equal(result.actions[0].evidence.length, 2);
});
test('each missing gate is requested separately', () => {
  assert.deepEqual(types(run([review])), ['run_ci']);
  assert.deepEqual(types(run([ci])), ['request_independent_review']);
});
for (const failure of [
  { type: 'review', verdict: 'changes_requested', sha },
  { type: 'ci', verdict: 'failed', sha }
]) {
  test(`${failure.type} failure enters cook repair`, () => {
    assert.deepEqual(types(run([review, ci, failure])), ['run_cook_repair']);
    assert.equal(run([failure]).state, 'repair_required');
  });
}
test('repair receipt cannot erase failed checks on the same revision', () => {
  assert.deepEqual(
    types(
      run([
        { type: 'ci', verdict: 'failed', sha },
        { type: 'repair', verdict: 'completed', sha }
      ])
    ),
    ['hold']
  );
});
test('new revisions invalidate prior approval and CI, reporting stale evidence', () => {
  const result = run([
    { ...review, sha: old },
    { ...ci, sha: old }
  ]);
  assert.equal(result.ignoredReceipts.length, 2);
  assert.deepEqual(types(result), ['request_independent_review', 'run_ci']);
});
test('stale failures cannot block a freshly passing revision', () => {
  assert.equal(
    run([{ type: 'ci', verdict: 'failed', sha: old }, review, ci]).state,
    'release_readiness'
  );
});
test('failure stays sticky even after later same-SHA approval', () => {
  const failure = { type: 'ci', verdict: 'failed', sha };
  assert.equal(run([review, failure, ci]).state, 'repair_required');
  assert.equal(run([review, ci, failure]).state, 'repair_required');
});
test('invalid inputs fail closed', () => {
  for (const input of [
    null,
    {},
    { caseId: '', sha, events: [] },
    { caseId: 'c', sha: 'HEAD', events: [] },
    { caseId: 'c', sha, events: null }
  ])
    assert.throws(() => plan(input), TypeError);
  for (const event of [
    null,
    { ...ci, verdict: 'green' },
    { ...review, independent: false },
    { ...ci, caseId: 'another' },
    { ...ci, sha: 'HEAD' }
  ])
    assert.throws(() => run([event]), TypeError);
  assert.throws(
    () =>
      run([
        { ...ci, id: 'duplicate' },
        { ...ci, id: 'duplicate' }
      ]),
    /unique/
  );
});
test('planner does not mutate event input', () => {
  const events = Object.freeze([Object.freeze({ ...review }), Object.freeze({ ...ci })]);
  assert.equal(run(events).state, 'release_readiness');
});

test('review change request cannot be cleared at the same SHA', () => {
  assert.equal(
    run([{ type: 'review', verdict: 'changes_requested', sha }, review, ci]).state,
    'repair_required'
  );
});
test('durable receipt identity and case binding are mandatory', () => {
  for (const event of [
    { ...ci, caseId: 'case-1' },
    { ...ci, id: 'id' }
  ]) {
    assert.throws(() => plan({ caseId: 'case-1', sha, events: [event] }), TypeError);
  }
  for (const short of ['abcdef0', 'a'.repeat(41), 'a'.repeat(63)])
    assert.throws(() => plan({ caseId: 'case-1', sha: short, events: [] }), /full/);
  assert.equal(plan({ caseId: 'case-1', sha: 'a'.repeat(64), events: [] }).state, 'gates_pending');
});
test('case-wide completed repairs impose the configured cap', () => {
  const events = Array.from({ length: workflow.maxRepairAttempts }, (_, i) => ({
    type: 'repair',
    verdict: 'completed',
    sha: String(i + 1).repeat(40)
  }));
  const result = run([...events, { type: 'ci', verdict: 'failed', sha }]);
  assert.deepEqual(types(result), ['hold']);
  assert.match(result.actions[0].reason, /budget/);
});
test('Cook inputs bind stable failure receipt IDs and repair budget', () => {
  const result = run([
    { type: 'review', verdict: 'changes_requested', sha, id: 'native-review' },
    { type: 'ci', verdict: 'failed', sha, id: 'native-ci' }
  ]);
  assert.deepEqual(result.actions[0].inputs, {
    caseId: 'case-1',
    sha,
    receiptIds: ['native-ci', 'native-review'],
    repairAttempt: 1,
    repairLimit: 3
  });
  assert.equal(result.actions[0].role, 'engineering');
  assert.equal(result.actions[0].output, 'new_revision_and_repair_receipt');
});
test('versioned workflow supplies executable dependencies and I/O', () => {
  for (const step of workflow.steps) {
    assert.ok(step.role && step.eligibility && step.input && step.output && step.dependsOn);
  }
  assert.deepEqual(
    workflow.steps.find((step) => step.action === 'assess_release_readiness').dependsOn,
    ['reviewPassed', 'ciPassed']
  );
});

test('native dispatch consumes the repair budget before completion', () => {
  const attempts = ['1', '2', '3'].map((char) => ({
    type: 'repair',
    verdict: 'dispatched',
    sha: char.repeat(40)
  }));
  assert.deepEqual(types(run([...attempts, { type: 'ci', verdict: 'failed', sha }])), ['hold']);
});
test('dispatch and completion at one source SHA consume one attempt', () => {
  const events = [
    { type: 'repair', verdict: 'dispatched', sha: old },
    { type: 'repair', verdict: 'completed', sha: old },
    { type: 'ci', verdict: 'failed', sha }
  ];
  assert.equal(run(events).actions[0].inputs.repairAttempt, 2);
});
test('current SHA dispatch prevents repeated repair enqueue', () => {
  assert.deepEqual(
    types(
      run([
        { type: 'ci', verdict: 'failed', sha },
        { type: 'repair', verdict: 'dispatched', sha }
      ])
    ),
    ['hold']
  );
});

test('only a strictly newer identified CI run can clear a CI failure', () => {
  const failed = {
    type: 'ci',
    verdict: 'failed',
    sha,
    runId: '200',
    runAttempt: 1
  };
  assert.equal(
    run([review, failed, { ...ci, runId: '200', runAttempt: 2 }]).state,
    'release_readiness'
  );
  assert.equal(
    run([review, failed, { ...ci, runId: '201', runAttempt: 1 }]).state,
    'release_readiness'
  );
  assert.equal(
    run([review, { ...ci, runId: '201', runAttempt: 1 }, failed]).state,
    'release_readiness'
  );
  assert.equal(
    run([review, failed, { ...ci, runId: '200', runAttempt: 1 }]).state,
    'repair_required'
  );
  assert.equal(
    run([review, failed, { ...ci, runId: '199', runAttempt: 10 }]).state,
    'repair_required'
  );
});

test('a native Cook dispatch requires a new SHA even if GitHub later removes the finding', () => {
  const sha = 'a'.repeat(40),
    caseId = 'repair-case';
  const events = [
    { type: 'repair', verdict: 'dispatched', id: 'handoff' },
    { type: 'review', verdict: 'approved', id: 'review', independent: true },
    { type: 'ci', verdict: 'passed', id: 'ci' }
  ].map((event) => ({ ...event, sha, caseId }));
  assert.deepEqual(
    plan({ sha, caseId, events }).actions.map((step) => step.type),
    ['hold']
  );
});
