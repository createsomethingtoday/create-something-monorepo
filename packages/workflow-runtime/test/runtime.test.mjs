import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RuntimeValidationError,
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest,
  planWorkflowRuntimeStep,
  reduceWorkflowRuntimeRun,
  verifyWorkflowRuntimeRun,
  workflowRuntimeCheckpointHash,
  workflowRuntimeReceiptHash
} from '../dist/index.js';

const digest = (value) => `sha256:${value.repeat(64).slice(0, 64)}`;

const manifest = {
  schemaVersion: 'workflow_runtime_manifest.v0.1',
  runtimeCompatibility: 'workflow-runtime.v0.1',
  target: 'create-something/control-runtime.v1',
  workflow: {
    id: 'fixture.zero-write',
    version: '0.1.0',
    definitionHash: digest('a'),
    compilerVersion: 'workflow-compiler-v0.1',
    compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
  },
  artifacts: {
    governedInteractionSha256: digest('b'),
    decisionInventorySha256: digest('c'),
    approvalSurfacesSha256: digest('d'),
    toolContractsSha256: digest('e')
  },
  steps: [
    {
      id: 'collect',
      actionId: 'collect',
      dependsOn: [],
      disposition: 'pass',
      capability: { id: 'fixture:collect', parameterDigest: digest('f') },
      evidenceDigest: digest('1'),
      recovery: 'manual_fallback'
    },
    {
      id: 'review',
      actionId: 'review',
      dependsOn: ['collect'],
      disposition: 'wait',
      approval: { policyId: 'account-owner', expiresAt: '2026-08-26T00:00:00.000Z' },
      evidenceDigest: digest('2'),
      recovery: 'manual_fallback'
    },
    {
      id: 'record',
      actionId: 'record',
      dependsOn: ['review'],
      disposition: 'pass',
      capability: { id: 'fixture:record', parameterDigest: digest('3') },
      evidenceDigest: digest('4'),
      recovery: 'manual_fallback'
    }
  ]
};

const admission = {
  runId: 'run-001',
  activation: { id: 'activation-001', version: 3, policySha256: digest('5') },
  artifactManifestSha256: digest('6'),
  runtimeManifestSha256: digest('7'),
  clock: '2026-08-25T00:00:00.000Z'
};

test('the public core advances a finite pass/wait/approval/pass fixture deterministically', async () => {
  const parsed = parseWorkflowRuntimeManifest(manifest);
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  assert.deepEqual(
    await Promise.all(Array.from({ length: 3 }, () => createWorkflowRuntimeRun(parsed, admission))),
    [initial, initial, initial]
  );
  const first = await planWorkflowRuntimeStep(parsed, initial);
  assert.deepEqual(first, {
    type: 'pass',
    stepId: 'collect',
    capability: { id: 'fixture:collect', parameterDigest: digest('f') },
    evidenceDigest: digest('1')
  });

  const afterCollectIntent = await reduceWorkflowRuntimeRun(parsed, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'attempt-collect-1',
    capability: first.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const afterCollect = await reduceWorkflowRuntimeRun(parsed, afterCollectIntent, {
    type: 'step_succeeded',
    stepId: 'collect',
    attemptId: 'attempt-collect-1',
    verifier: 'fixture-verifier',
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const wait = await planWorkflowRuntimeStep(parsed, afterCollect);
  assert.equal(wait.type, 'wait');
  assert.equal(wait.stepId, 'review');
  assert.ok('approval' in wait);
  assert.equal('capability' in wait, false);

  const waiting = await reduceWorkflowRuntimeRun(parsed, afterCollect, {
    type: 'wait_created',
    stepId: 'review',
    approval: wait.approval,
    observedAt: '2026-08-25T00:00:01.500Z'
  });
  assert.equal(waiting.status, 'waiting_for_approval');

  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, waiting, {
        type: 'approval_decided',
        stepId: 'review',
        approvalId: wait.approval.id,
        approvalBindingSha256: wait.approval.bindingSha256,
        decision: 'approved',
        actorSubject: 'owner-1',
        observedAt: '2026-08-25T00:00:01.000Z'
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'STALE_APPROVAL'
  );

  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, waiting, {
        type: 'approval_decided',
        stepId: 'review',
        approvalId: wait.approval.id,
        approvalBindingSha256: digest('8'),
        decision: 'approved',
        actorSubject: 'owner-1',
        observedAt: '2026-08-25T00:00:02.000Z'
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'STALE_APPROVAL'
  );

  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, waiting, {
        type: 'approval_decided',
        stepId: 'review',
        approvalId: wait.approval.id,
        approvalBindingSha256: wait.approval.bindingSha256,
        decision: 'denied',
        actorSubject: 'owner-1',
        observedAt: '2026-08-25T00:00:02.000Z'
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_EVENT'
  );
  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, waiting, {
        type: 'approval_decided',
        stepId: 'review',
        approvalId: wait.approval.id,
        approvalBindingSha256: wait.approval.bindingSha256,
        decision: 'approved',
        actorSubject: 'owner-1',
        observedAt: wait.approval.expiresAt
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'STALE_APPROVAL'
  );

  const afterApproval = await reduceWorkflowRuntimeRun(parsed, waiting, {
    type: 'approval_decided',
    stepId: 'review',
    approvalId: wait.approval.id,
    approvalBindingSha256: wait.approval.bindingSha256,
    decision: 'approved',
    actorSubject: 'owner-1',
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  assert.deepEqual(await planWorkflowRuntimeStep(parsed, afterApproval), {
    type: 'pass',
    stepId: 'record',
    capability: { id: 'fixture:record', parameterDigest: digest('3') },
    evidenceDigest: digest('4')
  });

  const record = await planWorkflowRuntimeStep(parsed, afterApproval);
  const afterRecordIntent = await reduceWorkflowRuntimeRun(parsed, afterApproval, {
    type: 'effect_intent',
    stepId: 'record',
    attemptId: 'attempt-record-1',
    capability: record.capability,
    observedAt: '2026-08-25T00:00:02.500Z'
  });
  const completed = await reduceWorkflowRuntimeRun(parsed, afterRecordIntent, {
    type: 'step_succeeded',
    stepId: 'record',
    attemptId: 'attempt-record-1',
    verifier: 'fixture-verifier',
    observedAt: '2026-08-25T00:00:03.000Z'
  });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.receipts.at(-1).eventType, 'run_completed');
  await verifyWorkflowRuntimeRun(parsed, completed);
  assert.deepEqual(
    completed,
    await reduceWorkflowRuntimeRun(parsed, afterRecordIntent, {
      type: 'step_succeeded',
      stepId: 'record',
      attemptId: 'attempt-record-1',
      verifier: 'fixture-verifier',
      observedAt: '2026-08-25T00:00:03.000Z'
    })
  );
});

test('the public core rejects an event that predates its latest receipt', async () => {
  const parsed = parseWorkflowRuntimeManifest(manifest);
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  const first = await planWorkflowRuntimeStep(parsed, initial);
  const prepared = await reduceWorkflowRuntimeRun(parsed, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'out-of-order-attempt',
    capability: first.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, prepared, {
        type: 'step_succeeded',
        stepId: 'collect',
        attemptId: 'out-of-order-attempt',
        verifier: 'fixture-verifier',
        observedAt: '2026-08-25T00:00:00.250Z'
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_EVENT'
  );
});

test('wait and stop never expose a capability invocation', async () => {
  const parsed = parseWorkflowRuntimeManifest({
    ...manifest,
    steps: [
      {
        id: 'operator-stop',
        actionId: 'operator-stop',
        dependsOn: [],
        disposition: 'stop',
        reason: 'evidence_missing',
        evidenceDigest: digest('9'),
        recovery: 'manual_fallback'
      }
    ]
  });
  const stop = await planWorkflowRuntimeStep(
    parsed,
    await createWorkflowRuntimeRun(parsed, admission)
  );
  assert.deepEqual(stop, { type: 'stop', stepId: 'operator-stop', reason: 'evidence_missing' });
  assert.equal('capability' in stop, false);
});

test('the parser rejects a fan-out that could make multiple steps ready', () => {
  assert.throws(
    () =>
      parseWorkflowRuntimeManifest({
        ...manifest,
        steps: [
          manifest.steps[0],
          { ...manifest.steps[1], dependsOn: ['collect'] },
          { ...manifest.steps[2], dependsOn: ['collect'] }
        ]
      }),
    /one deterministic successor/
  );
});

test('an approval that closes the final step emits the terminal closure receipt', async () => {
  const parsed = parseWorkflowRuntimeManifest({
    ...manifest,
    steps: [
      {
        id: 'review',
        actionId: 'review',
        dependsOn: [],
        disposition: 'wait',
        approval: { policyId: 'account-owner', expiresAt: '2026-08-26T00:00:00.000Z' },
        evidenceDigest: digest('9'),
        recovery: 'manual_fallback'
      }
    ]
  });
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  const wait = await planWorkflowRuntimeStep(parsed, initial);
  assert.equal(wait.type, 'wait');
  const waiting = await reduceWorkflowRuntimeRun(parsed, initial, {
    type: 'wait_created',
    stepId: 'review',
    approval: wait.approval,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const completed = await reduceWorkflowRuntimeRun(parsed, waiting, {
    type: 'approval_decided',
    stepId: 'review',
    approvalId: wait.approval.id,
    approvalBindingSha256: wait.approval.bindingSha256,
    decision: 'approved',
    actorSubject: 'owner-1',
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  assert.equal(completed.status, 'completed');
  assert.deepEqual(
    completed.receipts.map((entry) => entry.eventType),
    ['run_admitted', 'wait_created', 'approval_decided', 'run_completed']
  );
  await verifyWorkflowRuntimeRun(parsed, completed);
});

test('an already-expired approval wait fails before it can strand a checkpoint', async () => {
  const parsed = parseWorkflowRuntimeManifest({
    ...manifest,
    steps: [
      {
        id: 'review',
        actionId: 'review',
        dependsOn: [],
        disposition: 'wait',
        approval: { policyId: 'account-owner', expiresAt: '2026-08-24T00:00:00.000Z' },
        evidenceDigest: digest('9'),
        recovery: 'manual_fallback'
      }
    ]
  });
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  const wait = await planWorkflowRuntimeStep(parsed, initial);
  assert.equal(wait.type, 'wait');
  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, initial, {
        type: 'wait_created',
        stepId: 'review',
        approval: wait.approval,
        observedAt: '2026-08-25T00:00:00.000Z'
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'STALE_APPROVAL'
  );
});

test('the zero-write core records retryable failure, recovery, terminal failure, and cancellation without invoking a capability', async () => {
  const parsed = parseWorkflowRuntimeManifest({
    ...manifest,
    steps: [manifest.steps[0]]
  });
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  const pass = await planWorkflowRuntimeStep(parsed, initial);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(parsed, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'attempt-retryable-1',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const retryable = await reduceWorkflowRuntimeRun(parsed, prepared, {
    type: 'attempt_failed',
    stepId: 'collect',
    attemptId: 'attempt-retryable-1',
    class: 'retryable',
    verifier: 'fixture-verifier',
    failureDigest: digest('a'),
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  assert.equal(retryable.status, 'retryable_failure');
  assert.equal(retryable.steps[0].attempts[0].status, 'retryable_failure');
  assert.equal('capability' in (await planWorkflowRuntimeStep(parsed, retryable)), false);

  const recovered = await reduceWorkflowRuntimeRun(parsed, retryable, {
    type: 'recovery_requested',
    stepId: 'collect',
    actorSubject: 'owner-1',
    observedAt: '2026-08-25T00:00:01.500Z'
  });
  assert.equal(recovered.status, 'queued');
  assert.equal(recovered.steps[0].status, 'ready');

  const retryPass = await planWorkflowRuntimeStep(parsed, recovered);
  assert.equal(retryPass.type, 'pass');
  const preparedTerminal = await reduceWorkflowRuntimeRun(parsed, recovered, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'attempt-terminal-1',
    capability: retryPass.capability,
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  const terminal = await reduceWorkflowRuntimeRun(parsed, preparedTerminal, {
    type: 'attempt_failed',
    stepId: 'collect',
    attemptId: 'attempt-terminal-1',
    class: 'terminal',
    verifier: 'fixture-verifier',
    failureDigest: digest('b'),
    observedAt: '2026-08-25T00:00:02.500Z'
  });
  assert.equal(terminal.status, 'failed');
  await verifyWorkflowRuntimeRun(parsed, terminal);

  const cancellable = await reduceWorkflowRuntimeRun(parsed, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'attempt-cancel-1',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:03.000Z'
  });
  const cancelled = await reduceWorkflowRuntimeRun(parsed, cancellable, {
    type: 'cancellation_requested',
    stepId: 'collect',
    reason: 'operator cancellation',
    actorSubject: 'owner-1',
    observedAt: '2026-08-25T00:00:03.500Z'
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.steps[0].status, 'cancelled');
  await verifyWorkflowRuntimeRun(parsed, cancelled);
});

test('a retryable pass cannot be requeued with a recovery receipt for another step version', async () => {
  const onePass = parseWorkflowRuntimeManifest({ ...manifest, steps: [manifest.steps[0]] });
  const initial = await createWorkflowRuntimeRun(onePass, admission);
  const pass = await planWorkflowRuntimeStep(onePass, initial);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(onePass, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'recovery-receipt-attempt',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const retryable = await reduceWorkflowRuntimeRun(onePass, prepared, {
    type: 'attempt_failed',
    stepId: 'collect',
    attemptId: 'recovery-receipt-attempt',
    class: 'retryable',
    verifier: 'fixture-verifier',
    failureDigest: digest('a'),
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const recovered = await reduceWorkflowRuntimeRun(onePass, retryable, {
    type: 'recovery_requested',
    stepId: 'collect',
    actorSubject: 'owner-1',
    observedAt: '2026-08-25T00:00:01.500Z'
  });
  const forged = structuredClone(recovered);
  forged.receipts.at(-1).stepVersion -= 1;
  forged.receipts.at(-1).checkpointSha256 = await workflowRuntimeCheckpointHash(forged);
  {
    const { receiptSha256, ...unsigned } = forged.receipts.at(-1);
    forged.receipts.at(-1).receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  }
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(onePass, forged),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('unknown manifest fields and a corrupt receipt chain fail closed before resume', async () => {
  assert.throws(
    () => parseWorkflowRuntimeManifest({ ...manifest, unexpected: true }),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_MANIFEST'
  );
  const parsed = parseWorkflowRuntimeManifest(manifest);
  const run = await createWorkflowRuntimeRun(parsed, admission);
  const corrupt = structuredClone(run);
  corrupt.receipts[0].receiptSha256 = digest('f');
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(parsed, corrupt),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
  const corruptCheckpoint = structuredClone(run);
  corruptCheckpoint.steps[0].status = 'succeeded';
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(parsed, corruptCheckpoint),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
  const recomputedImpossible = structuredClone(run);
  recomputedImpossible.steps[0].status = 'succeeded';
  recomputedImpossible.steps[0].attempts.push({
    id: 'fabricated-attempt',
    status: 'succeeded',
    capability: structuredClone(manifest.steps[0].capability),
    createdAt: '2026-08-25T00:00:00.500Z'
  });
  recomputedImpossible.steps[1].status = 'ready';
  recomputedImpossible.steps[1].version = 2;
  recomputedImpossible.receipts[0].checkpointSha256 =
    await workflowRuntimeCheckpointHash(recomputedImpossible);
  const { receiptSha256, ...unsigned } = recomputedImpossible.receipts[0];
  recomputedImpossible.receipts[0].receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(parsed, recomputedImpossible),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('the public planner refuses a checkpoint without a verified receipt chain', async () => {
  const parsed = parseWorkflowRuntimeManifest(manifest);
  const forged = await createWorkflowRuntimeRun(parsed, admission);
  forged.receipts = [];
  await assert.rejects(
    () => planWorkflowRuntimeStep(parsed, forged),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('the public reducer refuses a corrupt checkpoint before applying an event', async () => {
  const parsed = parseWorkflowRuntimeManifest(manifest);
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  const forged = structuredClone(initial);
  forged.steps[0].status = 'succeeded';
  forged.steps[1].status = 'ready';
  forged.steps[1].version = 2;
  await assert.rejects(
    () =>
      reduceWorkflowRuntimeRun(parsed, forged, {
        type: 'wait_created',
        stepId: 'review',
        approval: null,
        observedAt: '2026-08-25T00:00:01.000Z'
      }),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('an abandoned attempt cannot reopen a pass capability', async () => {
  const onePass = parseWorkflowRuntimeManifest({ ...manifest, steps: [manifest.steps[0]] });
  const initial = await createWorkflowRuntimeRun(onePass, admission);
  const pass = await planWorkflowRuntimeStep(onePass, initial);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(onePass, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'abandoned-attempt',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const reopened = structuredClone(prepared);
  reopened.status = 'queued';
  reopened.steps[0].status = 'ready';
  reopened.steps[0].attempts[0].status = 'abandoned';
  reopened.receipts.at(-1).status = 'queued';
  reopened.receipts.at(-1).checkpointSha256 = await workflowRuntimeCheckpointHash(reopened);
  {
    const { receiptSha256, ...unsigned } = reopened.receipts.at(-1);
    reopened.receipts.at(-1).receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  }
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(onePass, reopened),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('a terminally failed attempt cannot be forged back to a runnable capability', async () => {
  const onePass = parseWorkflowRuntimeManifest({ ...manifest, steps: [manifest.steps[0]] });
  const initial = await createWorkflowRuntimeRun(onePass, admission);
  const pass = await planWorkflowRuntimeStep(onePass, initial);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(onePass, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'terminal-attempt',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const terminal = await reduceWorkflowRuntimeRun(onePass, prepared, {
    type: 'attempt_failed',
    stepId: 'collect',
    attemptId: 'terminal-attempt',
    class: 'terminal',
    verifier: 'fixture-verifier',
    failureDigest: digest('a'),
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const reopened = structuredClone(terminal);
  reopened.status = 'queued';
  reopened.version += 1;
  reopened.steps[0].status = 'ready';
  reopened.steps[0].version += 1;
  const recovery = reopened.receipts.at(-1);
  recovery.eventType = 'recovered';
  recovery.status = 'queued';
  recovery.runVersion = reopened.version;
  recovery.stepId = 'collect';
  recovery.stepVersion = reopened.steps[0].version;
  recovery.attemptId = null;
  recovery.evidenceDigest = digest('1');
  recovery.actorSubject = 'owner-1';
  recovery.verifier = 'manual-fallback';
  recovery.outcome = 'forged terminal failure recovery';
  recovery.createdAt = '2026-08-25T00:00:01.500Z';
  recovery.checkpointSha256 = await workflowRuntimeCheckpointHash(reopened);
  {
    const { receiptSha256, ...unsigned } = recovery;
    recovery.receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  }
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(onePass, reopened),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('a stop step cannot be forged as a successful gateway to a capability', async () => {
  const stopThenPass = parseWorkflowRuntimeManifest({
    ...manifest,
    steps: [
      {
        id: 'operator-stop',
        actionId: 'operator-stop',
        dependsOn: [],
        disposition: 'stop',
        reason: 'evidence_missing',
        evidenceDigest: digest('9'),
        recovery: 'manual_fallback'
      },
      { ...manifest.steps[0], dependsOn: ['operator-stop'] }
    ]
  });
  const initial = await createWorkflowRuntimeRun(stopThenPass, admission);
  const forged = structuredClone(initial);
  forged.steps[0].status = 'succeeded';
  forged.steps[0].version = 2;
  forged.steps[1].status = 'ready';
  forged.steps[1].version = 2;
  forged.receipts[0].checkpointSha256 = await workflowRuntimeCheckpointHash(forged);
  {
    const { receiptSha256, ...unsigned } = forged.receipts[0];
    forged.receipts[0].receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  }
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(stopThenPass, forged),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});

test('recomputed checkpoints cannot replay a succeeded pass or replace an approval binding', async () => {
  const onePass = parseWorkflowRuntimeManifest({ ...manifest, steps: [manifest.steps[0]] });
  const admitted = await createWorkflowRuntimeRun(onePass, admission);
  const pass = await planWorkflowRuntimeStep(onePass, admitted);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(onePass, admitted, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'completed-attempt',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const completed = await reduceWorkflowRuntimeRun(onePass, prepared, {
    type: 'step_succeeded',
    stepId: 'collect',
    attemptId: 'completed-attempt',
    verifier: 'fixture-verifier',
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const replayed = structuredClone(completed);
  replayed.status = 'queued';
  replayed.steps[0].status = 'ready';
  replayed.receipts.at(-1).status = 'queued';
  replayed.receipts.at(-1).checkpointSha256 = await workflowRuntimeCheckpointHash(replayed);
  {
    const { receiptSha256, ...unsigned } = replayed.receipts.at(-1);
    replayed.receipts.at(-1).receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  }
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(onePass, replayed),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );

  const parsed = parseWorkflowRuntimeManifest(manifest);
  const initial = await createWorkflowRuntimeRun(parsed, admission);
  const collect = await planWorkflowRuntimeStep(parsed, initial);
  assert.equal(collect.type, 'pass');
  const collecting = await reduceWorkflowRuntimeRun(parsed, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'approval-attempt',
    capability: collect.capability,
    observedAt: '2026-08-25T00:00:00.500Z'
  });
  const collected = await reduceWorkflowRuntimeRun(parsed, collecting, {
    type: 'step_succeeded',
    stepId: 'collect',
    attemptId: 'approval-attempt',
    verifier: 'fixture-verifier',
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const wait = await planWorkflowRuntimeStep(parsed, collected);
  assert.equal(wait.type, 'wait');
  const waiting = await reduceWorkflowRuntimeRun(parsed, collected, {
    type: 'wait_created',
    stepId: 'review',
    approval: wait.approval,
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  const forgedApproval = structuredClone(waiting);
  forgedApproval.steps[1].approval = {
    ...forgedApproval.steps[1].approval,
    id: 'approval:forged',
    bindingSha256: digest('f')
  };
  forgedApproval.receipts.at(-1).checkpointSha256 =
    await workflowRuntimeCheckpointHash(forgedApproval);
  {
    const { receiptSha256, ...unsigned } = forgedApproval.receipts.at(-1);
    forgedApproval.receipts.at(-1).receiptSha256 = await workflowRuntimeReceiptHash(unsigned);
  }
  await assert.rejects(
    () => verifyWorkflowRuntimeRun(parsed, forgedApproval),
    (error) => error instanceof RuntimeValidationError && error.code === 'INVALID_STATE'
  );
});
