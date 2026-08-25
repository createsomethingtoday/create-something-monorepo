export type RuntimeDigest = `sha256:${string}`;

export interface WorkflowRuntimeManifest {
  schemaVersion: 'workflow_runtime_manifest.v0.1';
  runtimeCompatibility: 'workflow-runtime.v0.1';
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
  steps: WorkflowRuntimeStepDefinition[];
}

interface WorkflowRuntimeStepBase {
  id: string;
  actionId: string;
  dependsOn: string[];
  evidenceDigest: RuntimeDigest;
  recovery: 'manual_fallback';
}

export interface WorkflowRuntimePassStep extends WorkflowRuntimeStepBase {
  disposition: 'pass';
  capability: { id: string; parameterDigest: RuntimeDigest };
}

export interface WorkflowRuntimeWaitStep extends WorkflowRuntimeStepBase {
  disposition: 'wait';
  approval: { policyId: string; expiresAt: string };
}

export interface WorkflowRuntimeStopStep extends WorkflowRuntimeStepBase {
  disposition: 'stop';
  reason: string;
}

export type WorkflowRuntimeStepDefinition =
  | WorkflowRuntimePassStep
  | WorkflowRuntimeWaitStep
  | WorkflowRuntimeStopStep;

export interface WorkflowRuntimeAdmission {
  runId: string;
  activation: { id: string; version: number; policySha256: RuntimeDigest };
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
  status: 'prepared' | 'succeeded' | 'retryable_failure' | 'failed' | 'abandoned';
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
  schema: 'create-something/control-run-receipt@2';
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
  artifactManifestSha256: RuntimeDigest;
  runtimeManifestSha256: RuntimeDigest;
  workflowId: string;
  workflowVersion: string;
  definitionHash: RuntimeDigest;
  evidenceDigest: RuntimeDigest | null;
  actorSubject: string | null;
  verifier: string | null;
  outcome: string;
  previousReceiptSha256: RuntimeDigest | null;
  checkpointSha256: RuntimeDigest;
  receiptSha256: RuntimeDigest;
  createdAt: string;
}

export interface WorkflowRuntimeRun {
  schema: 'workflow_runtime_run.v0.1';
  id: string;
  status: WorkflowRuntimeRunStatus;
  version: number;
  activation: WorkflowRuntimeAdmission['activation'];
  artifactManifestSha256: RuntimeDigest;
  runtimeManifestSha256: RuntimeDigest;
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
