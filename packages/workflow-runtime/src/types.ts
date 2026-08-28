export type RuntimeDigest = `sha256:${string}`;
export type WorkflowRuntimeRecoveryMode = 'rollback' | 'escalate' | 'manual_fallback';

interface WorkflowRuntimeStepBase<Recovery extends WorkflowRuntimeRecoveryMode> {
  id: string;
  actionId: string;
  dependsOn: string[];
  evidenceDigest: RuntimeDigest;
  recovery: Recovery;
}

export interface WorkflowRuntimePassStep<
  Recovery extends WorkflowRuntimeRecoveryMode = WorkflowRuntimeRecoveryMode
> extends WorkflowRuntimeStepBase<Recovery> {
  disposition: 'pass';
  capability: { id: string; parameterDigest: RuntimeDigest };
}

export interface WorkflowRuntimeWaitStep<
  Recovery extends WorkflowRuntimeRecoveryMode = WorkflowRuntimeRecoveryMode
> extends WorkflowRuntimeStepBase<Recovery> {
  disposition: 'wait';
  approval: { policyId: string; expiresAt: string };
}

export interface WorkflowRuntimeStopStep<
  Recovery extends WorkflowRuntimeRecoveryMode = WorkflowRuntimeRecoveryMode
> extends WorkflowRuntimeStepBase<Recovery> {
  disposition: 'stop';
  reason: string;
}

export type WorkflowRuntimeStepDefinition<
  Recovery extends WorkflowRuntimeRecoveryMode = WorkflowRuntimeRecoveryMode
> =
  | WorkflowRuntimePassStep<Recovery>
  | WorkflowRuntimeWaitStep<Recovery>
  | WorkflowRuntimeStopStep<Recovery>;

interface WorkflowRuntimeManifestBase<Step extends WorkflowRuntimeStepDefinition> {
  target: 'create-something/control-runtime.v1';
  workflow: {
    id: string;
    version: string;
    definitionHash: RuntimeDigest;
    compilerVersion: string;
    compiledBundleSchema: 'compiled_workflow_bundle.v0.3';
  };
  artifacts: {
    governedInteractionSha256: RuntimeDigest;
    decisionInventorySha256: RuntimeDigest;
    approvalSurfacesSha256: RuntimeDigest;
    toolContractsSha256: RuntimeDigest;
  };
  steps: Step[];
}

export interface WorkflowRuntimeManifestV0_1 extends WorkflowRuntimeManifestBase<
  WorkflowRuntimeStepDefinition<'manual_fallback'>
> {
  schemaVersion: 'workflow_runtime_manifest.v0.1';
  runtimeCompatibility: 'workflow-runtime.v0.1';
}

export interface WorkflowRuntimeManifestV0_2 extends WorkflowRuntimeManifestBase<WorkflowRuntimeStepDefinition> {
  schemaVersion: 'workflow_runtime_manifest.v0.2';
  runtimeCompatibility: 'workflow-runtime.v0.2';
}

export type WorkflowRuntimeManifest = WorkflowRuntimeManifestV0_1 | WorkflowRuntimeManifestV0_2;

/**
 * The subset of the accepted compiler registration that the current Agency
 * activation ledger can freeze and the zero-write runtime can independently
 * compare. Artifact, runtime-manifest, and workflow identity remain separate
 * closed fields on the admission, run, and receipt.
 */
export interface WorkflowRuntimeRegistration {
  buildReleaseId: string;
  contractSha256: RuntimeDigest;
  runtimePolicySha256: RuntimeDigest;
}

export interface WorkflowRuntimeAdmission {
  runId: string;
  activation: { id: string; version: number; policySha256: RuntimeDigest };
  registration: WorkflowRuntimeRegistration;
  artifactManifestSha256: RuntimeDigest;
  runtimeManifestSha256: RuntimeDigest;
  clock: string;
}

export type WorkflowRuntimeRunStatus =
  | 'queued'
  | 'running'
  | 'waiting_for_approval'
  | 'retryable_failure'
  | 'blocked'
  | 'failed'
  | 'cancelled'
  | 'completed';
export type WorkflowRuntimeActorRole =
  | 'account_owner'
  | 'agency_operator'
  | 'account_reader'
  | 'control_scheduler';
export type WorkflowRuntimeStepStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'waiting_for_approval'
  | 'succeeded'
  | 'retryable_failure'
  | 'blocked'
  | 'failed'
  | 'cancelled';

export interface WorkflowRuntimeAttempt {
  id: string;
  status:
    | 'prepared'
    | 'succeeded'
    | 'retryable_failure'
    | 'failed'
    | 'abandoned'
    | 'effect_ambiguous';
  capability: WorkflowRuntimePassStep['capability'];
  createdAt: string;
}

export interface WorkflowRuntimeApproval {
  id: string;
  bindingSha256: RuntimeDigest;
  policyId: string;
  expiresAt: string;
}

export interface WorkflowRuntimeStepRecord {
  id: string;
  status: WorkflowRuntimeStepStatus;
  version: number;
  attempts: WorkflowRuntimeAttempt[];
  approval: WorkflowRuntimeApproval | null;
}

export type WorkflowRuntimeReceiptEventType =
  | 'run_admitted'
  | 'effect_intent'
  | 'step_succeeded'
  | 'wait_created'
  | 'approval_decided'
  | 'blocked'
  | 'attempt_failed'
  | 'recovered'
  | 'cancelled'
  | 'run_failed'
  | 'run_completed';

export interface WorkflowRuntimeReceipt {
  schema: 'create-something/control-run-receipt@2' | 'create-something/control-run-receipt@3';
  id: string;
  runId: string;
  eventIndex: number;
  eventType: WorkflowRuntimeReceiptEventType;
  status: WorkflowRuntimeRunStatus;
  runVersion: number;
  stepId: string | null;
  stepVersion: number | null;
  attemptId: string | null;
  activationId: string;
  activationVersion: number;
  activationPolicySha256: RuntimeDigest;
  /** Present and required for registration-bound `@3` receipts. */
  buildReleaseId?: string;
  /** Present and required for registration-bound `@3` receipts. */
  contractSha256?: RuntimeDigest;
  artifactManifestSha256: RuntimeDigest;
  runtimeManifestSha256: RuntimeDigest;
  /** Present and required for registration-bound `@3` receipts. */
  runtimeManifestSchema?: WorkflowRuntimeManifest['schemaVersion'];
  /** Present and required for registration-bound `@3` receipts. */
  runtimePolicySha256?: RuntimeDigest;
  /** Present and required for registration-bound `@3` receipts. */
  workflowCompilerVersion?: string;
  /** Present and required for registration-bound `@3` receipts. */
  actionId?: string | null;
  workflowId: string;
  workflowVersion: string;
  definitionHash: RuntimeDigest;
  evidenceDigest: RuntimeDigest | null;
  actorSubject: string | null;
  /** Present only on registration-bound `@3` receipts; never a subject identifier. */
  actorRole?: WorkflowRuntimeActorRole | null;
  /** Present only on registration-bound `@3` wait and decision receipts. */
  approvalSurfaceSha256?: RuntimeDigest | null;
  verifier: string | null;
  outcome: string;
  previousReceiptSha256: RuntimeDigest | null;
  checkpointSha256: RuntimeDigest;
  receiptSha256: RuntimeDigest;
  createdAt: string;
}

export interface WorkflowRuntimeRun {
  schema: 'workflow_runtime_run.v0.1' | 'workflow_runtime_run.v0.2';
  id: string;
  status: WorkflowRuntimeRunStatus;
  version: number;
  activation: WorkflowRuntimeAdmission['activation'];
  /** Present and required for `workflow_runtime_run.v0.2`. */
  registration?: WorkflowRuntimeRegistration;
  artifactManifestSha256: RuntimeDigest;
  runtimeManifestSha256: RuntimeDigest;
  /** Present and required for `workflow_runtime_run.v0.2`. */
  runtimeManifestSchema?: WorkflowRuntimeManifest['schemaVersion'];
  steps: WorkflowRuntimeStepRecord[];
  receipts: WorkflowRuntimeReceipt[];
}

export type WorkflowRuntimePlan =
  | {
      type: 'pass';
      stepId: string;
      capability: WorkflowRuntimePassStep['capability'];
      evidenceDigest: RuntimeDigest;
    }
  | { type: 'wait'; stepId: string; approval: WorkflowRuntimeApproval }
  | { type: 'stop'; stepId: string; reason: string }
  | { type: 'recovery'; stepId: string; reason: 'retryable_failure' };

export type WorkflowRuntimeEvent =
  | {
      type: 'effect_intent';
      stepId: string;
      attemptId: string;
      capability: WorkflowRuntimePassStep['capability'];
      observedAt: string;
    }
  | {
      type: 'step_succeeded';
      stepId: string;
      attemptId: string;
      verifier: string;
      observedAt: string;
    }
  | { type: 'wait_created'; stepId: string; approval: WorkflowRuntimeApproval; observedAt: string }
  | {
      type: 'approval_decided';
      stepId: string;
      approvalId: string;
      approvalBindingSha256: RuntimeDigest;
      decision: 'approved' | 'rejected';
      actorSubject: string;
      /** Trusted Control hosts overwrite this with the verified Identity role. */
      actorRole?: WorkflowRuntimeActorRole;
      observedAt: string;
    }
  | {
      type: 'stop_requested';
      stepId: string;
      reason: string;
      actorSubject: string;
      observedAt: string;
    }
  | {
      type: 'attempt_failed';
      stepId: string;
      attemptId: string;
      class: 'retryable' | 'terminal';
      verifier: string;
      failureDigest: RuntimeDigest;
      observedAt: string;
    }
  | { type: 'recovery_requested'; stepId: string; actorSubject: string; observedAt: string }
  | {
      type: 'cancellation_requested';
      stepId: string;
      reason: string;
      actorSubject: string;
      observedAt: string;
    };

export type RuntimeValidationCode =
  | 'INVALID_ADMISSION'
  | 'INVALID_EVENT'
  | 'INVALID_MANIFEST'
  | 'INVALID_STATE'
  | 'STALE_APPROVAL';

export class RuntimeValidationError extends Error {
  constructor(
    readonly code: RuntimeValidationCode,
    message: string
  ) {
    super(message);
  }
}

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;
type LegacyRecovery = WorkflowRuntimeManifestV0_1['steps'][number]['recovery'];
type _LegacyManifestStepsStayManual = Assert<Equal<LegacyRecovery, 'manual_fallback'>>;
