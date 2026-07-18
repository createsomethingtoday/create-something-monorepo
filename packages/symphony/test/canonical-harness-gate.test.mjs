import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CanonicalHarnessGate,
  evaluate_canonical_harness_receipt,
} from '../src/index.js';

function valid_a1_candidate(overrides = {}) {
  return {
    schema_version: 'canonical-harness-receipt.v1',
    run_id: 'CRE-1304-run-1',
    linear: { issue: 'CRE-1304', hierarchy: ['CRE-1298'] },
    routing: {
      autonomy_level: 'A1',
      lane: 'solo',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: ['Bounded local source change with no production mutation.'],
    },
    source: {
      base_ref: 'origin/main',
      base_sha: 'cc1e3fd37480bc967e65af60b9f97c9327e909ce',
      worktree_path: '/tmp/cre-1304',
      before_fingerprint: 'before-a1',
      after_fingerprint: 'after-a1',
      changed_paths: ['packages/symphony/src/canonical-harness-gate.js'],
      no_op: null,
    },
    acceptance: {
      criteria: [{ id: 'gate', description: 'The canonical gate computes done eligibility.' }],
      results: [{ criterion_id: 'gate', kind: 'command', status: 'passed', evidence: 'node --test passed' }],
    },
    stages: {
      worker: existing_stage_receipt(
        'worker',
        ['packages/symphony/src/canonical-harness-gate.js'],
        'Worker produced the bounded source change.',
      ),
      reviewer: null,
      integrator: null,
    },
    review: {
      required: false,
      independent: false,
      sandbox: 'not-required',
      before: '',
      after: '',
      unchanged: true,
      findings: [],
    },
    promotion: null,
    metrics: {
      elapsed_ms: 10,
      retries: 0,
      human_interventions: 0,
      tokens: { input: 1, output: 1, total: 2 },
      runtime: { name: 'codex', version: 'test' },
    },
    outcome: { delivered: true, summary: 'Canonical gate behavior verified.' },
    status: 'passed',
    ...overrides,
  };
}

function existing_stage_receipt(role, changed_paths = [], evidence = `${role} completed.`) {
  return {
    schema_version: 'multi-agent-evidence-receipt.v1',
    run_id: 'CRE-1304-run-1',
    role,
    work_unit_id: `CRE-1304-${role}`,
    linear: { issue: 'CRE-1304' },
    status: 'passed',
    commands: [{ command: 'node --test', exit_code: 0, summary: `${role} tests passed.` }],
    changed_paths,
    evidence,
    next_decision: `${role} may hand off to the next decision.`,
    metrics: {
      duration_ms: 10,
      retry_count: 0,
      human_intervention_count: 0,
      tokens: { input: 1, output: 1, total: 2 },
    },
  };
}

function valid_reviewed_candidate(level = 'A2', overrides = {}) {
  const candidate = valid_a1_candidate();
  return {
    ...candidate,
    routing: {
      autonomy_level: level,
      lane: 'reviewed',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: [`${level} requires reviewed execution.`],
    },
    stages: {
      ...candidate.stages,
      reviewer: existing_stage_receipt('reviewer', [], 'Independent reviewer found no actionable issues.'),
      integrator: existing_stage_receipt('integrator', [], 'Integrator verified the reviewed outcome.'),
    },
    review: {
      required: true,
      independent: true,
      sandbox: 'read-only',
      before: 'review-fingerprint',
      after: 'review-fingerprint',
      unchanged: true,
      findings: [],
    },
    promotion: level === 'A2'
      ? {
          packet: null,
          live: null,
          rollback: {
            target: 'bounded-self-heal',
            status: 'passed',
            evidence: 'Rollback note identifies how to reverse the deterministic repair.',
          },
        }
      : null,
    ...overrides,
  };
}

test('canonical gate rejects caller-supplied done eligibility and process-success-only evidence', () => {
  const decision = evaluate_canonical_harness_receipt({
    schema_version: 'canonical-harness-receipt.v1',
    run_id: 'CRE-1304-run-1',
    linear: { issue: 'CRE-1304', hierarchy: ['CRE-1298'] },
    status: 'passed',
    process: { status: 'completed', exit_code: 0 },
    eligible_for_done: true,
    blockers: [],
  });

  assert.equal(decision.schema_version, 'canonical-harness-receipt.v1');
  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('input.eligible_for_done is computed by the canonical gate'));
  assert.ok(decision.blockers.includes('acceptance evidence is required'));
  assert.ok(decision.blockers.includes('source diff or verified no-op evidence is required'));
});

test('canonical gate rejects unknown receipt fields', () => {
  const decision = evaluate_canonical_harness_receipt(valid_a1_candidate({ unexpected: true }));

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('schema / must NOT have additional property: unexpected'));
  assert.equal(decision.schema_validation.ok, false);
});

test('canonical gate requires every declared acceptance criterion to pass', () => {
  const candidate = valid_a1_candidate();
  candidate.acceptance.results[0].status = 'failed';

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('acceptance criterion gate did not pass'));
});

test('canonical gate requires exactly one result for each declared acceptance criterion', () => {
  const candidate = valid_a1_candidate();
  candidate.acceptance.criteria.push({ id: 'gate', description: 'Duplicate criterion id.' });
  candidate.acceptance.results.push({ ...candidate.acceptance.results[0] });
  candidate.acceptance.results.push({
    criterion_id: 'undeclared',
    kind: 'command',
    status: 'passed',
    evidence: 'This result does not map to a declared criterion.',
  });

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('acceptance criterion ids must be unique'));
  assert.ok(decision.blockers.includes('acceptance criterion gate must have exactly one result'));
  assert.ok(decision.blockers.includes('acceptance result undeclared has no declared criterion'));
});

test('canonical gate requires execution changed paths to match source diff evidence', () => {
  const candidate = valid_a1_candidate();
  candidate.stages.worker.changed_paths = ['packages/symphony/src/unrelated.js'];

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('execution changed paths must match source changed paths'));
});

test('canonical gate accepts Symphony existing evidence receipt stage shape directly', () => {
  const candidate = valid_a1_candidate();
  candidate.stages.worker = existing_stage_receipt('worker', candidate.source.changed_paths);

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, true, JSON.stringify(decision.blockers));
});

test('canonical gate binds existing stage receipts to run, role, issue, and passing commands', () => {
  const candidate = valid_a1_candidate();
  candidate.stages.worker.role = 'reviewer';
  candidate.stages.worker.run_id = 'another-run';
  candidate.stages.worker.linear.issue = 'CRE-OTHER';
  candidate.stages.worker.commands[0].exit_code = 1;

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('worker receipt must declare role worker'));
  assert.ok(decision.blockers.includes('worker receipt must target canonical run CRE-1304-run-1'));
  assert.ok(decision.blockers.includes('worker receipt must target Linear issue CRE-1304'));
  assert.ok(decision.blockers.includes('A1 requires a passed worker receipt'));
});

test('canonical gate admits reviewed integrator changes but never reviewer writes', () => {
  const integrated = valid_reviewed_candidate('A2');
  integrated.source.changed_paths.push('packages/symphony/src/integrated.js');
  integrated.stages.integrator.changed_paths.push('packages/symphony/src/integrated.js');

  const eligible = evaluate_canonical_harness_receipt(integrated);
  assert.equal(eligible.eligible_for_done, true, JSON.stringify(eligible.blockers));

  integrated.stages.reviewer.changed_paths.push('packages/symphony/src/reviewer-write.js');
  const reviewer_write = evaluate_canonical_harness_receipt(integrated);
  assert.equal(reviewer_write.eligible_for_done, false);
  assert.ok(reviewer_write.blockers.includes('reviewer receipt must have zero changed paths'));
});

test('canonical gate requires independent reviewed evidence for A2 work', () => {
  const candidate = valid_a1_candidate({
    routing: {
      autonomy_level: 'A2',
      lane: 'reviewed',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: ['Shared self-heal work requires reviewed execution.'],
    },
  });

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('A2 requires passed reviewer and integrator receipts'));
  assert.ok(decision.blockers.includes('A2 requires independent read-only review with an unchanged fingerprint'));
});

test('canonical gate requires rollback proof for A2 self-heal work', () => {
  const decision = evaluate_canonical_harness_receipt(valid_reviewed_candidate('A2', { promotion: null }));

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('A2 requires passed rollback proof'));
});

test('canonical gate requires promotion, live, and rollback proof for A3 work', () => {
  const decision = evaluate_canonical_harness_receipt(valid_reviewed_candidate('A3'));

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('A3 requires matching passed promotion packet, live proof, and rollback proof'));
});

test('canonical gate requires A3 proof to name one matching target', () => {
  const candidate = valid_reviewed_candidate('A3', {
    promotion: {
      packet: { target: 'internal-production', status: 'passed', evidence: 'Promotion packet passed.' },
      live: { target: 'different-target', status: 'passed', evidence: 'Live proof passed.' },
      rollback: { target: 'internal-production', status: 'passed', evidence: 'Rollback proof passed.' },
    },
  });

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('A3 requires matching passed promotion packet, live proof, and rollback proof'));
});

test('canonical gate requires an explicit unchanged fingerprint for verified no-op work', () => {
  const candidate = valid_a1_candidate();
  candidate.source.changed_paths = [];
  candidate.source.no_op = {
    verified: true,
    verifier: 'git diff --quiet',
    evidence: 'No changed paths were observed.',
  };

  const decision = evaluate_canonical_harness_receipt(candidate);

  assert.equal(decision.eligible_for_done, false);
  assert.ok(decision.blockers.includes('verified no-op requires unchanged source fingerprints and zero changed paths'));
});

test('canonical gate rejects changed work without a real diff and no-op work without a verifier', () => {
  const changed_without_diff = valid_a1_candidate();
  changed_without_diff.source.after_fingerprint = changed_without_diff.source.before_fingerprint;

  const no_op_without_verifier = valid_a1_candidate();
  no_op_without_verifier.source.changed_paths = [];
  no_op_without_verifier.source.after_fingerprint = no_op_without_verifier.source.before_fingerprint;
  no_op_without_verifier.source.no_op = {
    verified: true,
    evidence: 'No source changes were observed.',
  };
  no_op_without_verifier.stages.worker.changed_paths = [];

  const changed = evaluate_canonical_harness_receipt(changed_without_diff);
  const no_op = evaluate_canonical_harness_receipt(no_op_without_verifier);

  assert.equal(changed.eligible_for_done, false);
  assert.ok(changed.blockers.includes('changed source requires different before and after fingerprints'));
  assert.equal(no_op.eligible_for_done, false);
  assert.ok(no_op.blockers.some((blocker) => blocker.includes("must have required property 'verifier'")));
});

test('canonical gate keeps A0 read-only and rejects unsupported stage receipts', () => {
  const changed_a0 = valid_a1_candidate({
    routing: {
      autonomy_level: 'A0',
      lane: 'scout',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: ['Read-only scout work.'],
    },
  });
  const unsupported = valid_a1_candidate();
  unsupported.stages.worker.schema_version = 'unsupported-receipt.v0';

  const a0 = evaluate_canonical_harness_receipt(changed_a0);
  const stage = evaluate_canonical_harness_receipt(unsupported);

  assert.equal(a0.eligible_for_done, false);
  assert.ok(a0.blockers.includes('A0 is read-only and requires verified no-op source evidence'));
  assert.equal(stage.eligible_for_done, false);
  assert.ok(stage.blockers.some((blocker) => blocker.includes('must be equal to constant')));
});

test('canonical gate admits complete A0 through A3 evidence', () => {
  const a0 = valid_a1_candidate({
    routing: {
      autonomy_level: 'A0',
      lane: 'scout',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: ['Read-only scout work.'],
    },
  });
  a0.source.before_fingerprint = 'unchanged-a0';
  a0.source.after_fingerprint = 'unchanged-a0';
  a0.source.changed_paths = [];
  a0.source.no_op = {
    verified: true,
    verifier: 'git diff --quiet',
    evidence: 'Read-only scout produced no source changes.',
  };
  a0.stages.worker.changed_paths = [];

  const a1 = valid_a1_candidate();
  const a2 = valid_reviewed_candidate('A2');
  const a3 = valid_reviewed_candidate('A3', {
    promotion: {
      packet: { target: 'create-something-internal-production', status: 'passed', evidence: 'Approved versioned promotion packet.' },
      live: { target: 'create-something-internal-production', status: 'passed', evidence: 'Live verification passed.' },
      rollback: { target: 'create-something-internal-production', status: 'passed', evidence: 'Rollback path and verification passed.' },
    },
  });

  for (const candidate of [a0, a1, a2, a3]) {
    const decision = evaluate_canonical_harness_receipt(candidate);
    assert.equal(decision.schema_validation.ok, true, JSON.stringify(decision.blockers));
    assert.deepEqual(decision.blockers, []);
    assert.equal(decision.eligible_for_done, true);
  }
});

test('canonical gate never admits A4 work to autonomous done', () => {
  for (const status of ['passed', 'failed', 'blocked', 'escalated']) {
    const candidate = valid_a1_candidate({
      routing: {
        autonomy_level: 'A4',
        lane: 'escalation',
        policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
        reasons: ['Protected work requires an operator decision.'],
      },
      status,
    });

    const decision = evaluate_canonical_harness_receipt(candidate);

    assert.equal(decision.eligible_for_done, false);
    assert.ok(decision.blockers.includes('A4 always requires an operator decision and is never eligible for autonomous done'));
  }
});

test('canonical gate publishes per-run receipts through an atomic rename', async () => {
  const calls = [];
  const file_operations = {
    async mkdir(path, options) {
      calls.push({ operation: 'mkdir', path, options });
    },
    async writeFile(path, contents, encoding) {
      calls.push({ operation: 'write', path, contents, encoding });
    },
    async rename(from, to) {
      calls.push({ operation: 'rename', from, to });
    },
    async rm(path, options) {
      calls.push({ operation: 'cleanup', path, options });
    },
  };
  const gate = new CanonicalHarnessGate({
    tracker: {},
    output_root: '/proof/canonical-agent-harness/runs',
    file_operations,
    random_id: () => 'atomic-test',
  });

  const result = await gate.record(valid_a1_candidate());

  assert.equal(result.receipt.eligible_for_done, true);
  assert.equal(result.receipt_path, '/proof/canonical-agent-harness/runs/CRE-1304-run-1/receipt.v1.json');
  assert.deepEqual(calls.map((entry) => entry.operation), ['mkdir', 'write', 'rename', 'cleanup']);
  assert.equal(calls[1].path, `${result.receipt_path}.${process.pid}.atomic-test.tmp`);
  assert.deepEqual(calls[2], {
    operation: 'rename',
    from: calls[1].path,
    to: result.receipt_path,
  });
  assert.equal(JSON.parse(calls[1].contents).eligible_for_done, true);
});

test('canonical gate preserves Linear when receipt identity does not match the completion issue', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'canonical-gate-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const completed = [];
  const gate = new CanonicalHarnessGate({
    tracker: {
      async complete_issue(issue, result) {
        completed.push({ issue, result });
      },
    },
    output_root: join(root, 'runs'),
  });

  const result = await gate.complete(
    { id: 'linear-id', identifier: 'CRE-OTHER' },
    valid_a1_candidate(),
  );

  assert.equal(result.completed, false);
  assert.deepEqual(completed, []);
  assert.ok(result.receipt.blockers.includes('receipt issue CRE-1304 does not match completion issue CRE-OTHER'));
  const persisted = JSON.parse(await readFile(result.receipt_path, 'utf8'));
  assert.equal(persisted.eligible_for_done, false);
});

test('canonical gate refuses completion when the Linear issue identifier is unavailable', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'canonical-gate-missing-identity-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  let completion_calls = 0;
  const gate = new CanonicalHarnessGate({
    tracker: {
      async complete_issue() {
        completion_calls += 1;
      },
    },
    output_root: join(root, 'runs'),
  });

  await assert.rejects(
    gate.complete({ id: 'linear-id' }, valid_a1_candidate()),
    (error) => error?.code === 'canonical_issue_identifier_required',
  );
  assert.equal(completion_calls, 0);
});

test('canonical gate never mutates Linear for validation failures', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'canonical-gate-failures-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  let completion_calls = 0;
  const gate = new CanonicalHarnessGate({
    tracker: {
      async complete_issue() {
        completion_calls += 1;
      },
    },
    output_root: join(root, 'runs'),
  });

  const caller_eligibility = valid_a1_candidate({ eligible_for_done: true });
  const unknown_key = valid_a1_candidate({ unexpected: true });
  const identity_mismatch = valid_a1_candidate();
  identity_mismatch.linear.issue = 'CRE-OTHER';
  const changed_without_diff = valid_a1_candidate();
  changed_without_diff.source.after_fingerprint = changed_without_diff.source.before_fingerprint;
  const no_op_without_verifier = valid_a1_candidate();
  no_op_without_verifier.source.changed_paths = [];
  no_op_without_verifier.source.after_fingerprint = no_op_without_verifier.source.before_fingerprint;
  no_op_without_verifier.source.no_op = { verified: true, evidence: 'No changes.' };
  no_op_without_verifier.stages.worker.changed_paths = [];
  const missing_review = valid_a1_candidate({
    routing: {
      autonomy_level: 'A2',
      lane: 'reviewed',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: ['Reviewed work.'],
    },
  });
  const missing_a3 = valid_reviewed_candidate('A3');
  const a4 = valid_a1_candidate({
    routing: {
      autonomy_level: 'A4',
      lane: 'escalation',
      policy_artifacts: [{ id: 'policy.operator-agent-production-lab.v1', version: '1' }],
      reasons: ['Operator-required work.'],
    },
  });

  for (const [index, candidate] of [
    caller_eligibility,
    unknown_key,
    identity_mismatch,
    changed_without_diff,
    no_op_without_verifier,
    missing_review,
    missing_a3,
    a4,
  ].entries()) {
    candidate.run_id = `CRE-1304-invalid-${index}`;
    const result = await gate.complete({ id: 'linear-id', identifier: 'CRE-1304' }, candidate);
    assert.equal(result.completed, false);
  }

  assert.equal(completion_calls, 0);
});

test('canonical gate refuses Linear completion when the persisted receipt is corrupt', async () => {
  let completion_calls = 0;
  const gate = new CanonicalHarnessGate({
    tracker: {
      async complete_issue() {
        completion_calls += 1;
      },
    },
    output_root: '/proof/canonical-agent-harness/runs',
    random_id: () => 'corrupt-test',
    file_operations: {
      async mkdir() {},
      async writeFile() {},
      async rename() {},
      async rm() {},
      async readFile() {
        return '{"truncated":';
      },
    },
  });

  await assert.rejects(
    gate.complete({ id: 'linear-id', identifier: 'CRE-1304' }, valid_a1_candidate()),
    (error) => error?.code === 'canonical_receipt_unreadable',
  );
  assert.equal(completion_calls, 0);
});

test('canonical gate refuses Linear completion when computed persisted fields are tampered', async () => {
  let published = '';
  let completion_calls = 0;
  const gate = new CanonicalHarnessGate({
    tracker: {
      async complete_issue() {
        completion_calls += 1;
      },
    },
    output_root: '/proof/canonical-agent-harness/runs',
    random_id: () => 'tamper-test',
    file_operations: {
      async mkdir() {},
      async writeFile(_path, contents) {
        published = contents;
      },
      async rename() {},
      async rm() {},
      async readFile() {
        const receipt = JSON.parse(published);
        receipt.eligible_for_done = false;
        receipt.blockers = ['injected blocker'];
        return JSON.stringify(receipt);
      },
    },
  });

  await assert.rejects(
    gate.complete({ id: 'linear-id', identifier: 'CRE-1304' }, valid_a1_candidate()),
    (error) => error?.code === 'canonical_receipt_invalid'
      && error.details.errors.includes('persisted eligible_for_done does not match the gate computation')
      && error.details.errors.includes('persisted blockers do not match the gate computation'),
  );
  assert.equal(completion_calls, 0);
});

test('canonical gate revalidates the persisted receipt immediately before completing Linear', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'canonical-gate-complete-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const completed = [];
  const gate = new CanonicalHarnessGate({
    tracker: {
      async complete_issue(issue, result) {
        completed.push({ issue, result });
        return { ...issue, state: 'Done' };
      },
    },
    output_root: join(root, 'runs'),
  });

  const result = await gate.complete(
    { id: 'linear-id', identifier: 'CRE-1304' },
    valid_a1_candidate(),
  );

  assert.equal(result.completed, true);
  assert.equal(result.receipt.eligible_for_done, true);
  assert.equal(completed.length, 1);
  assert.match(completed[0].result.message, /Canonical harness receipt:/u);
  assert.match(completed[0].result.message, /receipt\.v1\.json/u);
});

test('canonical gate requires a delivered passing outcome', () => {
  const failed = evaluate_canonical_harness_receipt(valid_a1_candidate({ status: 'failed' }));
  const undelivered = evaluate_canonical_harness_receipt(valid_a1_candidate({
    outcome: { delivered: false, summary: 'The requested outcome was not delivered.' },
  }));

  assert.equal(failed.eligible_for_done, false);
  assert.ok(failed.blockers.includes('canonical outcome status must be passed'));
  assert.equal(undelivered.eligible_for_done, false);
  assert.ok(undelivered.blockers.includes('canonical outcome must be delivered'));
});
