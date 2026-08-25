import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MemoryWorkflowRuntimeCheckpointStore,
  ZeroWriteWorkflowRuntimeHost,
  parseWorkflowRuntimeManifest
} from '../dist/index.js';

const digest = (value) => `sha256:${value.repeat(64).slice(0, 64)}`;
const commandDigest = (value) => value.repeat(64).slice(0, 64);
const scope = { accountId: 'account-a', tenantId: 'tenant-a', workspaceAccountId: 'workspace-a' };
const manifest = parseWorkflowRuntimeManifest({
  schemaVersion: 'workflow_runtime_manifest.v0.1',
  runtimeCompatibility: 'workflow-runtime.v0.1',
  target: 'create-something/control-runtime.v1',
  workflow: {
    id: 'fixture.host',
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
});

function fixture(
  identity = {
    async assert(_scope, actorSubject) {
      return actorSubject;
    }
  }
) {
  const storage = new MemoryWorkflowRuntimeCheckpointStore();
  const queues = [];
  const receipts = [];
  const ports = {
    storage,
    clock: () => '2026-08-25T00:00:00.000Z',
    identity,
    queue: {
      async enqueue(input) {
        queues.push(input);
      }
    },
    receiptSink: {
      async write(run) {
        receipts.push(run);
      }
    },
    executor: undefined
  };
  return {
    storage,
    queues,
    receipts,
    ports,
    host: new ZeroWriteWorkflowRuntimeHost(manifest, ports)
  };
}

test('the zero-write host persists, replays, restarts, and lets a concurrent stop win without a capability call', async () => {
  const { host, storage, queues, receipts, ports } = fixture();
  const admitted = await host.admit(
    scope,
    {
      runId: 'host-run',
      activation: { id: 'activation-a', version: 1, policySha256: digest('3') },
      artifactManifestSha256: digest('4'),
      runtimeManifestSha256: digest('5'),
      clock: 'ignored-by-host'
    },
    'admit-1',
    commandDigest('a')
  );
  assert.equal(admitted.status, 'queued');
  const first = await host.plan(scope, admitted.id);
  assert.equal(first.type, 'pass');

  const [intent, replay] = await Promise.all([
    host.transition(
      scope,
      admitted.id,
      1,
      {
        type: 'effect_intent',
        stepId: 'collect',
        attemptId: 'attempt-1',
        capability: first.capability,
        observedAt: 'ignored-by-host'
      },
      'intent-1',
      commandDigest('b')
    ),
    host.transition(
      scope,
      admitted.id,
      1,
      {
        type: 'effect_intent',
        stepId: 'collect',
        attemptId: 'attempt-1',
        capability: first.capability,
        observedAt: 'ignored-by-host'
      },
      'intent-1',
      commandDigest('b')
    )
  ]);
  assert.deepEqual(replay, intent);
  assert.equal(intent.steps[0].attempts.length, 1);
  assert.equal(queues.length, 1);

  const afterCollect = await host.transition(
    scope,
    admitted.id,
    2,
    {
      type: 'step_succeeded',
      stepId: 'collect',
      attemptId: 'attempt-1',
      verifier: 'fixture-verifier',
      observedAt: 'ignored-by-host'
    },
    'collect-1',
    commandDigest('c')
  );
  const restarted = new ZeroWriteWorkflowRuntimeHost(manifest, ports);
  const wait = await restarted.plan(scope, admitted.id);
  assert.equal(wait.type, 'wait');
  assert.equal('capability' in wait, false);
  const waiting = await restarted.transition(
    scope,
    admitted.id,
    afterCollect.version,
    {
      type: 'wait_created',
      stepId: 'review',
      approval: wait.approval,
      observedAt: 'ignored-by-host'
    },
    'wait-1',
    commandDigest('d')
  );
  assert.equal(waiting.status, 'waiting_for_approval');

  let releaseStop;
  const stopGate = new Promise((resolve) => {
    releaseStop = resolve;
  });
  const contendedStorage = {
    find: (...args) => storage.find(...args),
    replay: (...args) => storage.replay(...args),
    async apply(input) {
      if (input.idempotencyKey === 'concurrent-stop') await stopGate;
      const result = await storage.apply(input);
      if (input.idempotencyKey === 'concurrent-approval' && result.applied) releaseStop();
      return result;
    }
  };
  const contendedHost = new ZeroWriteWorkflowRuntimeHost(manifest, {
    ...ports,
    storage: contendedStorage
  });
  const stop = contendedHost.transition(
    scope,
    admitted.id,
    waiting.version,
    {
      type: 'stop_requested',
      stepId: 'review',
      reason: 'operator stop',
      actorSubject: 'owner-a',
      observedAt: 'ignored-by-host'
    },
    'concurrent-stop',
    commandDigest('e')
  );
  const approved = contendedHost.transition(
    scope,
    admitted.id,
    waiting.version,
    {
      type: 'approval_decided',
      stepId: 'review',
      approvalId: wait.approval.id,
      approvalBindingSha256: wait.approval.bindingSha256,
      decision: 'approved',
      actorSubject: 'owner-a',
      observedAt: 'ignored-by-host'
    },
    'concurrent-approval',
    commandDigest('f')
  );
  const [approvedResult, stopped] = await Promise.all([approved, stop]);
  assert.equal(approvedResult.status, 'queued');
  assert.equal(stopped.status, 'blocked');
  assert.equal(stopped.steps.find((step) => step.id === 'review').status, 'succeeded');
  assert.equal(stopped.steps.find((step) => step.id === 'record').status, 'blocked');
  assert.equal(receipts.at(-1).status, 'blocked');
  assert.equal((await storage.find(scope, admitted.id)).receipts.at(-1).eventType, 'blocked');
});

test('the zero-write host persists a planned non-manual retryable stop', async () => {
  const nonManualManifest = parseWorkflowRuntimeManifest({
    ...manifest,
    schemaVersion: 'workflow_runtime_manifest.v0.2',
    runtimeCompatibility: 'workflow-runtime.v0.2',
    steps: [{ ...manifest.steps[0], recovery: 'escalate' }]
  });
  const { ports, storage, receipts } = fixture();
  const host = new ZeroWriteWorkflowRuntimeHost(nonManualManifest, ports);
  const admitted = await host.admit(
    scope,
    {
      runId: 'retryable-stop',
      activation: { id: 'activation-a', version: 1, policySha256: digest('3') },
      artifactManifestSha256: digest('4'),
      runtimeManifestSha256: digest('5'),
      clock: 'ignored-by-host'
    },
    'retryable-stop-admit',
    commandDigest('a')
  );
  const pass = await host.plan(scope, admitted.id);
  assert.equal(pass.type, 'pass');
  const prepared = await host.transition(
    scope,
    admitted.id,
    admitted.version,
    {
      type: 'effect_intent',
      stepId: 'collect',
      attemptId: 'retryable-stop-attempt',
      capability: pass.capability,
      observedAt: 'ignored-by-host'
    },
    'retryable-stop-intent',
    commandDigest('b')
  );
  const retryable = await host.transition(
    scope,
    admitted.id,
    prepared.version,
    {
      type: 'attempt_failed',
      stepId: 'collect',
      attemptId: 'retryable-stop-attempt',
      class: 'retryable',
      verifier: 'fixture-verifier',
      failureDigest: digest('f'),
      observedAt: 'ignored-by-host'
    },
    'retryable-stop-failure',
    commandDigest('c')
  );
  assert.deepEqual(await host.plan(scope, admitted.id), {
    type: 'stop',
    stepId: 'collect',
    reason: 'recovery_escalate'
  });
  const stopped = await host.transition(
    scope,
    admitted.id,
    retryable.version,
    {
      type: 'stop_requested',
      stepId: 'wrong-step-is-replaced-by-the-host',
      reason: 'recovery escalation requires an operator',
      actorSubject: 'owner-a',
      observedAt: 'ignored-by-host'
    },
    'retryable-stop-block',
    commandDigest('d')
  );
  assert.equal(stopped.status, 'blocked');
  assert.equal(stopped.steps[0].status, 'blocked');
  assert.equal((await storage.find(scope, admitted.id))?.status, 'blocked');
  assert.equal(receipts.at(-1).status, 'blocked');
});

test('the host rejects an actor claim that the identity port cannot authenticate', async () => {
  const { host } = fixture({
    async assert(_scope, actorSubject) {
      return actorSubject === 'forged-owner' ? 'actual-owner' : actorSubject;
    }
  });
  await assert.rejects(
    () =>
      host.transition(
        scope,
        'missing-run',
        1,
        {
          type: 'stop_requested',
          stepId: 'review',
          reason: 'operator stop',
          actorSubject: 'forged-owner',
          observedAt: 'ignored-by-host'
        },
        'forged-stop',
        commandDigest('f')
      ),
    /does not match the authenticated identity/
  );
});

test('the host authorizes an approval against its bound policy before it advances', async () => {
  const assertedApprovalPolicies = [];
  const { host } = fixture({
    async assert(_scope, actorSubject, requiredApprovalPolicy) {
      if (actorSubject === 'owner-a') {
        assertedApprovalPolicies.push(requiredApprovalPolicy ?? null);
        return requiredApprovalPolicy === 'account-owner' ? actorSubject : null;
      }
      return actorSubject;
    }
  });
  const admitted = await host.admit(
    scope,
    {
      runId: 'policy-bound-approval',
      activation: { id: 'activation-a', version: 1, policySha256: digest('3') },
      artifactManifestSha256: digest('4'),
      runtimeManifestSha256: digest('5'),
      clock: 'ignored-by-host'
    },
    'policy-admit',
    commandDigest('a')
  );
  const collect = await host.plan(scope, admitted.id);
  assert.equal(collect.type, 'pass');
  const collecting = await host.transition(
    scope,
    admitted.id,
    admitted.version,
    {
      type: 'effect_intent',
      stepId: 'collect',
      attemptId: 'policy-attempt',
      capability: collect.capability,
      observedAt: 'ignored-by-host'
    },
    'policy-intent',
    commandDigest('b')
  );
  const collected = await host.transition(
    scope,
    admitted.id,
    collecting.version,
    {
      type: 'step_succeeded',
      stepId: 'collect',
      attemptId: 'policy-attempt',
      verifier: 'fixture-verifier',
      observedAt: 'ignored-by-host'
    },
    'policy-success',
    commandDigest('c')
  );
  const wait = await host.plan(scope, admitted.id);
  assert.equal(wait.type, 'wait');
  const waiting = await host.transition(
    scope,
    admitted.id,
    collected.version,
    {
      type: 'wait_created',
      stepId: 'review',
      approval: wait.approval,
      observedAt: 'ignored-by-host'
    },
    'policy-wait',
    commandDigest('d')
  );
  const approved = await host.transition(
    scope,
    admitted.id,
    waiting.version,
    {
      type: 'approval_decided',
      stepId: 'review',
      approvalId: wait.approval.id,
      approvalBindingSha256: wait.approval.bindingSha256,
      decision: 'approved',
      actorSubject: 'owner-a',
      observedAt: 'ignored-by-host'
    },
    'policy-approval',
    commandDigest('e')
  );
  assert.equal(approved.status, 'queued');
  assert.deepEqual(assertedApprovalPolicies, ['account-owner']);
});

test('the host derives idempotency identity from the semantic command rather than caller input', async () => {
  const { host } = fixture();
  const admission = {
    runId: 'derived-command',
    activation: { id: 'activation-a', version: 1, policySha256: digest('3') },
    artifactManifestSha256: digest('4'),
    runtimeManifestSha256: digest('5'),
    clock: 'ignored-by-host'
  };
  const admitted = await host.admit(scope, admission, 'derived-admit', commandDigest('a'));
  assert.deepEqual(
    await host.admit(scope, admission, 'derived-admit', commandDigest('b')),
    admitted
  );
  await assert.rejects(
    () =>
      host.admit(
        scope,
        { ...admission, runtimeManifestSha256: digest('6') },
        'derived-admit',
        commandDigest('c')
      ),
    /already used for another command/
  );

  const pass = await host.plan(scope, admitted.id);
  assert.equal(pass.type, 'pass');
  const intent = {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'derived-attempt',
    capability: pass.capability,
    observedAt: 'ignored-by-host'
  };
  const prepared = await host.transition(
    scope,
    admitted.id,
    admitted.version,
    intent,
    'derived-intent',
    commandDigest('d')
  );
  assert.deepEqual(
    await host.transition(
      scope,
      admitted.id,
      admitted.version,
      intent,
      'derived-intent',
      commandDigest('e')
    ),
    prepared
  );
  await assert.rejects(
    () =>
      host.transition(
        scope,
        admitted.id,
        admitted.version,
        { ...intent, attemptId: 'replacement-attempt' },
        'derived-intent',
        commandDigest('f')
      ),
    /already used for another command/
  );
});
