/** Synthetic unit fixture. These in-memory ports are not live-recorded evidence. */
import {
  createWorkflowRuntimeRun,
  parseWorkflowRuntimeManifest,
  planWorkflowRuntimeStep,
  reduceWorkflowRuntimeRun,
  type RuntimeDigest,
  type WorkflowRuntimeEvent,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimeRun
} from '@createsomething/workflow-runtime';
import type { ControlRunRecord, ControlScope, FrozenControlActivation } from '../src/control.js';
import {
  RegisteredControlGraphBindings,
  type ControlGraphBinding
} from '../src/control-graph-bindings.js';
import type {
  ControlGraphExplanationDependencies,
  ControlGraphLinearObservation,
  ControlGraphSubstrateObservation
} from '../src/control-graph-explanation.js';
import type {
  WorkflowRuntimeProofApproval,
  WorkflowRuntimeProofProjection
} from '../src/workflow-runtime-proof-projection.js';

export const graphDigest = (value: string): RuntimeDigest => `sha256:${value.repeat(64)}`;
export type GraphFixtureState =
  | 'ready'
  | 'waiting'
  | 'expired'
  | 'rejected'
  | 'stopped'
  | 'ambiguous'
  | 'retryable'
  | 'completed'
  | 'running';

export async function controlGraphFixture(kind: GraphFixtureState = 'waiting') {
  const scope: ControlScope = {
    accountId: 'fixture-account',
    tenantId: 'fixture-tenant',
    workspaceAccountId: 'fixture-workspace'
  };
  const manifest: WorkflowRuntimeManifest = parseWorkflowRuntimeManifest({
    schemaVersion: 'workflow_runtime_manifest.v0.2',
    runtimeCompatibility: 'workflow-runtime.v0.2',
    target: 'create-something/control-runtime.v1',
    workflow: {
      id: 'synthetic.internal-record',
      version: '1.0.0',
      definitionHash: graphDigest('a'),
      compilerVersion: 'synthetic-compiler',
      compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
    },
    artifacts: {
      governedInteractionSha256: graphDigest('b'),
      decisionInventorySha256: graphDigest('c'),
      approvalSurfacesSha256: graphDigest('d'),
      toolContractsSha256: graphDigest('e')
    },
    steps: [
      {
        id: 'observe',
        actionId: 'observe_record',
        dependsOn: [],
        disposition: 'pass',
        capability: { id: 'synthetic.observe', parameterDigest: graphDigest('f') },
        evidenceDigest: graphDigest('1'),
        recovery: 'manual_fallback'
      },
      {
        id: 'review',
        actionId: 'review_record',
        dependsOn: ['observe'],
        disposition: 'wait',
        approval: { policyId: 'record_owner', expiresAt: '2026-11-02T02:00:00.000Z' },
        evidenceDigest: graphDigest('2'),
        recovery: 'manual_fallback'
      },
      {
        id: 'record',
        actionId: 'record_result',
        dependsOn: ['review'],
        disposition: 'pass',
        capability: { id: 'synthetic.record', parameterDigest: graphDigest('3') },
        evidenceDigest: graphDigest('4'),
        recovery: 'manual_fallback'
      }
    ]
  });
  const activation: FrozenControlActivation = {
    ...scope,
    id: 'synthetic-activation',
    activationVersion: 1,
    activationKind: 'initial',
    status: 'active',
    mapId: 'synthetic-map',
    mapVersionId: 'synthetic-map-version',
    mapVersion: 1,
    mapCanvasSha256: 'a'.repeat(64),
    handoffId: 'synthetic-handoff',
    handoffReceiptSha256: 'b'.repeat(64),
    buildReleaseId: 'synthetic-build',
    buildManifestSha256: 'c'.repeat(64),
    buildArtifactSetSha256: 'd'.repeat(64),
    buildAcceptanceReceiptId: 'synthetic-acceptance',
    buildAcceptanceReceiptSha256: 'e'.repeat(64),
    policyVersion: 'synthetic-policy-v1',
    policySha256: '5'.repeat(64),
    contractSha256: '6'.repeat(64),
    entitlementSnapshotSha256: 'f'.repeat(64),
    allowedTools: ['synthetic.observe'],
    allowedResources: ['synthetic:record']
  };
  let runtime = await createWorkflowRuntimeRun(manifest, {
    runId: 'synthetic-recorded-run',
    activation: {
      id: activation.id,
      version: activation.activationVersion,
      policySha256: graphDigest('5')
    },
    registration: {
      buildReleaseId: activation.buildReleaseId,
      contractSha256: graphDigest('6'),
      runtimePolicySha256: graphDigest('5')
    },
    artifactManifestSha256: graphDigest('7'),
    runtimeManifestSha256: graphDigest('8'),
    clock: '2026-11-02T00:00:00.000Z'
  });
  let seconds = 0;
  const nextTime = () =>
    new Date(Date.parse('2026-11-02T00:00:00.000Z') + ++seconds * 1000).toISOString();
  const apply = async (event: Omit<WorkflowRuntimeEvent, 'observedAt'>) => {
    runtime = await reduceWorkflowRuntimeRun(manifest, runtime, {
      ...event,
      observedAt: nextTime()
    } as WorkflowRuntimeEvent);
  };
  const begin = async (attemptId: string) => {
    const plan = await planWorkflowRuntimeStep(manifest, runtime);
    if (plan.type !== 'pass') throw new Error('Synthetic fixture expected a pass plan');
    await apply({
      type: 'effect_intent',
      stepId: plan.stepId,
      attemptId,
      capability: plan.capability
    } as Omit<WorkflowRuntimeEvent, 'observedAt'>);
    return plan.stepId;
  };
  const pass = async (attemptId: string) => {
    const stepId = await begin(attemptId);
    await apply({ type: 'step_succeeded', stepId, attemptId, verifier: 'fixture-verifier' } as Omit<
      WorkflowRuntimeEvent,
      'observedAt'
    >);
  };
  let approval: WorkflowRuntimeProofApproval | undefined;
  if (['waiting', 'expired', 'rejected', 'completed'].includes(kind)) {
    await pass('observe-attempt');
    const wait = await planWorkflowRuntimeStep(manifest, runtime);
    if (wait.type !== 'wait') throw new Error('Synthetic fixture expected a wait plan');
    await apply({ type: 'wait_created', stepId: wait.stepId, approval: wait.approval } as Omit<
      WorkflowRuntimeEvent,
      'observedAt'
    >);
    const review = runtime.steps.find((step) => step.id === wait.stepId)!;
    approval = {
      ...wait.approval,
      stepId: wait.stepId,
      decision: null,
      decidedByRole: null,
      approvalSurface: {
        schemaVersion: 'approval_surfaces.v0.3',
        sha256: manifest.artifacts.approvalSurfacesSha256
      },
      approvalCommand: {
        schema: 'create-something/control-workflow-runtime-approval-command@1',
        version: 1
      },
      createdAt: runtime.receipts.at(-1)!.createdAt,
      decidedAt: null,
      context: {
        schema: 'create-something/workflow-runtime-approval-context@2',
        version: 2,
        scope,
        runVersion: runtime.version,
        stepVersion: review.version,
        attempt: { type: 'no_capability_attempt' },
        activation: runtime.activation,
        artifactManifestSha256: runtime.artifactManifestSha256,
        runtimeManifestSha256: runtime.runtimeManifestSha256,
        workflow: manifest.workflow,
        actionId: 'review_record',
        evidenceDigest: graphDigest('2'),
        registration: runtime.registration!,
        runtimeManifestSchema: manifest.schemaVersion
      }
    };
    if (kind === 'rejected' || kind === 'completed') {
      const decision = kind === 'rejected' ? 'rejected' : 'approved';
      await apply({
        type: 'approval_decided',
        stepId: wait.stepId,
        approvalId: wait.approval.id,
        approvalBindingSha256: wait.approval.bindingSha256,
        decision,
        actorSubject: 'private-approval-person',
        actorRole: 'account_owner'
      } as Omit<WorkflowRuntimeEvent, 'observedAt'>);
      approval = {
        ...approval,
        decision,
        decidedByRole: 'account_owner',
        decidedAt: [...runtime.receipts]
          .reverse()
          .find((receipt) => receipt.eventType === 'approval_decided')!.createdAt
      };
      if (kind === 'completed') await pass('record-attempt');
    }
  } else if (['ambiguous', 'retryable', 'running'].includes(kind)) {
    await begin('observe-attempt');
    if (kind === 'ambiguous')
      await apply({
        type: 'stop_requested',
        stepId: 'observe',
        reason: 'private-stop-reason',
        actorSubject: 'private-stop-person'
      } as Omit<WorkflowRuntimeEvent, 'observedAt'>);
    if (kind === 'retryable')
      await apply({
        type: 'attempt_failed',
        stepId: 'observe',
        attemptId: 'observe-attempt',
        class: 'retryable',
        verifier: 'fixture-verifier',
        failureDigest: graphDigest('9')
      } as Omit<WorkflowRuntimeEvent, 'observedAt'>);
  } else if (kind === 'stopped') {
    await apply({
      type: 'stop_requested',
      stepId: 'observe',
      reason: 'private-stop-reason',
      actorSubject: 'private-stop-person'
    } as Omit<WorkflowRuntimeEvent, 'observedAt'>);
  }
  const proof = proofProjection(manifest, runtime, approval);
  const now = kind === 'expired' ? '2026-11-02T03:00:00.000Z' : '2026-11-02T01:00:00.000Z';
  const parent: ControlRunRecord = {
    ...scope,
    id: runtime.id,
    activation,
    status:
      runtime.status === 'blocked'
        ? 'stopped'
        : runtime.status === 'retryable_failure'
          ? 'fallback_required'
          : runtime.status,
    version: 2,
    attempt: 1,
    concurrencyKey: 'synthetic-serial-work',
    requestedTools: ['synthetic.observe'],
    requestedResources: ['synthetic:record'],
    pendingApprovalKind: runtime.status === 'waiting_for_approval' ? 'record_owner' : null,
    recovery: null,
    lastError: 'private-parent-error',
    createdBy: 'private-parent-person',
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: runtime.receipts.at(-1)!.createdAt,
    receipts: []
  };
  const binding: ControlGraphBinding = {
    schema: 'create-something/control-graph-binding@1',
    scope,
    workflowId: manifest.workflow.id,
    workflowVersion: manifest.workflow.version,
    runtimeManifestSha256: runtime.runtimeManifestSha256,
    artifactManifestSha256: runtime.artifactManifestSha256,
    buildReleaseId: activation.buildReleaseId,
    contractSha256: graphDigest('6'),
    runtimePolicySha256: graphDigest('5'),
    linearIssueId: 'd1654b7a-a9ce-4f08-a76b-3039752d1c01',
    linearIdentifier: 'CRE-1000',
    substrateNodeId: 'substrate:create-something:package:internal-workflow',
    stepOwners: manifest.steps.map((step) => ({
      stepId: step.id,
      actionId: step.actionId,
      ownerId: 'responsible-operator'
    }))
  };
  const state: {
    parent: ControlRunRecord | undefined;
    proof: WorkflowRuntimeProofProjection | undefined;
    manifest: WorkflowRuntimeManifest | undefined;
    binding: ControlGraphBinding | undefined;
    linear: ControlGraphLinearObservation | undefined;
    substrate: ControlGraphSubstrateObservation | undefined;
  } = {
    parent,
    proof,
    manifest,
    binding,
    linear: {
      scope,
      id: binding.linearIssueId,
      identifier: binding.linearIdentifier,
      assigneeId: 'responsible-operator',
      revision: 'synthetic-revision',
      observedAt: now,
      evidenceRef: 'fixture:linear'
    },
    substrate: {
      scope,
      id: binding.substrateNodeId,
      snapshotSha256: graphDigest('a'),
      observedAt: now,
      evidenceRef: 'fixture:substrate'
    }
  };
  const dependencies: ControlGraphExplanationDependencies = {
    runs: {
      async find() {
        return state.parent;
      }
    },
    proofs: {
      async find() {
        return state.proof;
      }
    },
    manifests: {
      async findByRuntimeManifestSha256() {
        return state.manifest;
      }
    },
    bindings: {
      async find(input) {
        return state.binding
          ? new RegisteredControlGraphBindings([state.binding]).find(input)
          : undefined;
      }
    },
    linear: {
      async find() {
        return state.linear;
      }
    },
    substrate: {
      async find() {
        return state.substrate;
      }
    },
    approvalPolicies: { record_owner: ['account_owner'] },
    approvalPolicySha256: graphDigest('5'),
    clock: () => now,
    maximumAgeMs: 6 * 60 * 60 * 1000
  };
  return { scope, manifest, runtime, proof, parent, binding, state, dependencies, now };
}

function proofProjection(
  manifest: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun,
  approval?: WorkflowRuntimeProofApproval
): WorkflowRuntimeProofProjection {
  return structuredClone<WorkflowRuntimeProofProjection>({
    schema: 'create-something/workflow-runtime-proof@2',
    run: {
      id: run.id,
      status: run.status,
      version: run.version,
      activation: run.activation,
      registration: run.registration,
      artifactManifestSha256: run.artifactManifestSha256,
      runtimeManifestSha256: run.runtimeManifestSha256,
      runtimeManifestSchema: run.runtimeManifestSchema,
      workflow: manifest.workflow
    },
    steps: run.steps.map((step) => ({
      id: step.id,
      status: step.status,
      version: step.version,
      attempts: step.attempts.map((attempt) => ({
        id: attempt.id,
        status: attempt.status,
        capabilityId: attempt.capability.id,
        capabilityParameterSha256: attempt.capability.parameterDigest,
        createdAt: attempt.createdAt
      })),
      pendingApproval: step.approval
    })),
    approvals: approval ? [approval] : [],
    capabilityObservations: [],
    receipts: run.receipts.map((receipt) => {
      const {
        actorSubject: _subject,
        actorRole: _role,
        approvalSurfaceSha256: _surface,
        outcome: _outcome,
        checkpointSha256,
        ...redacted
      } = receipt;
      return {
        ...redacted,
        checkpoint: { id: `checkpoint:${run.id}:v${receipt.runVersion}`, sha256: checkpointSha256 }
      };
    }),
    buildBinding: {
      registrationVersion: 2,
      buildManifestSha256: graphDigest('c'),
      buildArtifactSetSha256: graphDigest('d'),
      bindingSha256: graphDigest('e'),
      attestationKeyId: 'synthetic-signer',
      attestationPublicKeyFingerprint: graphDigest('f')
    }
  });
}
