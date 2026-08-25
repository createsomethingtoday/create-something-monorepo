import {
  RuntimeValidationError,
  verifyWorkflowRuntimeRun,
  type RuntimeDigest,
  type WorkflowRuntimeActorRole,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimeReceipt,
  type WorkflowRuntimeRun,
  type WorkflowRuntimeScope
} from '@createsomething/workflow-runtime';
import type { WorkflowRuntimeManifestAuthority } from './workflow-runtime-manifest-authority.js';

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const VERIFIER = /^[a-z][a-z0-9_-]{0,79}$/;
const FAILURE_CODE = /^[a-z][a-z0-9_]{0,79}$/;
const ACTOR_ROLES: readonly WorkflowRuntimeActorRole[] = [
  'account_owner',
  'agency_operator',
  'account_reader',
  'control_scheduler'
];
const APPROVAL_SURFACE_SCHEMAS = [
  'approval_surfaces.v0.1',
  'approval_surfaces.v0.2',
  'approval_surfaces.v0.3'
] as const;

type ProofRow = {
  run_json: string;
  approvals_json: string;
  capability_observations_json: string;
};

type ApprovalRow = {
  approval_id: string;
  step_id: string;
  binding_sha256: string;
  decision: 'approved' | 'rejected' | null;
  approval_json: string;
  approval_context_json: string | null;
  approval_surface_schema: string | null;
  approval_surface_sha256: string | null;
  approval_command_schema: string | null;
  approval_command_version: number | null;
  decision_actor_role: string | null;
  created_at: string;
  decided_at: string | null;
};

type CapabilityObservationRow = {
  run_id: string;
  step_id: string;
  attempt_id: string;
  capability_id: string;
  capability_parameter_sha256: string;
  request_sha256: string;
  status: 'prepared' | 'verified' | 'effect_unknown';
  source_invocation_sha256: string | null;
  response_sha256: string | null;
  observed_item_count: number | null;
  source_invocation_evidence_sha256: string | null;
  verifier: string | null;
  verifier_evidence_sha256: string | null;
  failure_code: string | null;
};

export interface WorkflowRuntimeProofApprovalContextV1 {
  schema: 'create-something/workflow-runtime-approval-context@1';
  version: 1;
  scope: WorkflowRuntimeScope;
  runVersion: number;
  stepVersion: number;
  attempt: { type: 'no_capability_attempt' };
  activation: WorkflowRuntimeRun['activation'];
  artifactManifestSha256: RuntimeDigest;
  runtimeManifestSha256: RuntimeDigest;
  workflow: WorkflowRuntimeManifest['workflow'];
  actionId: string;
  evidenceDigest: RuntimeDigest;
}

export interface WorkflowRuntimeProofApprovalContextV2 extends Omit<
  WorkflowRuntimeProofApprovalContextV1,
  'schema' | 'version'
> {
  schema: 'create-something/workflow-runtime-approval-context@2';
  version: 2;
  registration: NonNullable<WorkflowRuntimeRun['registration']>;
  runtimeManifestSchema: WorkflowRuntimeManifest['schemaVersion'];
}

export type WorkflowRuntimeProofApprovalContext =
  | WorkflowRuntimeProofApprovalContextV1
  | WorkflowRuntimeProofApprovalContextV2;

export interface WorkflowRuntimeProofApprovalSurface {
  schemaVersion: (typeof APPROVAL_SURFACE_SCHEMAS)[number];
  sha256: RuntimeDigest;
}

export interface WorkflowRuntimeProofApprovalCommand {
  schema: 'create-something/control-workflow-runtime-approval-command@1';
  version: 1;
}

export interface WorkflowRuntimeProofApproval {
  id: string;
  stepId: string;
  bindingSha256: RuntimeDigest;
  policyId: string;
  expiresAt: string;
  decision: 'approved' | 'rejected' | null;
  /** Role only; proof intentionally omits the decision subject. */
  decidedByRole: WorkflowRuntimeActorRole | null;
  /** Present for registration-bound approvals; legacy v0.1 rows have no attestation. */
  approvalSurface: WorkflowRuntimeProofApprovalSurface | null;
  approvalCommand: WorkflowRuntimeProofApprovalCommand | null;
  createdAt: string;
  decidedAt: string | null;
  context: WorkflowRuntimeProofApprovalContext;
}

export interface WorkflowRuntimeProofCapabilityObservation {
  runId: string;
  stepId: string;
  attemptId: string;
  capabilityId: string;
  capabilityParameterSha256: RuntimeDigest;
  requestSha256: RuntimeDigest;
  status: 'prepared' | 'verified' | 'effect_unknown';
  sourceInvocationSha256: RuntimeDigest | null;
  sourceInvocationEvidenceSha256: RuntimeDigest | null;
  responseSha256: RuntimeDigest | null;
  observedItemCount: number | null;
  verifier: string | null;
  verifierEvidenceSha256: RuntimeDigest | null;
  failureCode: string | null;
}

export interface WorkflowRuntimeProofProjection {
  schema: 'create-something/workflow-runtime-proof@1';
  run: {
    id: string;
    status: WorkflowRuntimeRun['status'];
    version: number;
    activation: WorkflowRuntimeRun['activation'];
    registration?: WorkflowRuntimeRun['registration'];
    artifactManifestSha256: RuntimeDigest;
    runtimeManifestSha256: RuntimeDigest;
    runtimeManifestSchema?: WorkflowRuntimeRun['runtimeManifestSchema'];
    workflow: WorkflowRuntimeManifest['workflow'];
  };
  steps: Array<{
    id: string;
    status: WorkflowRuntimeRun['steps'][number]['status'];
    version: number;
    attempts: Array<{
      id: string;
      status: WorkflowRuntimeRun['steps'][number]['attempts'][number]['status'];
      capabilityId: string;
      capabilityParameterSha256: RuntimeDigest;
      createdAt: string;
    }>;
    pendingApproval: {
      id: string;
      bindingSha256: RuntimeDigest;
      policyId: string;
      expiresAt: string;
    } | null;
  }>;
  approvals: WorkflowRuntimeProofApproval[];
  capabilityObservations: WorkflowRuntimeProofCapabilityObservation[];
  receipts: Array<{
    id: string;
    runId: string;
    eventIndex: number;
    eventType: WorkflowRuntimeReceipt['eventType'];
    status: WorkflowRuntimeReceipt['status'];
    runVersion: number;
    stepId: string | null;
    stepVersion: number | null;
    attemptId: string | null;
    activationId: string;
    activationVersion: number;
    activationPolicySha256: RuntimeDigest;
    schema: WorkflowRuntimeReceipt['schema'];
    buildReleaseId?: string;
    contractSha256?: RuntimeDigest;
    artifactManifestSha256: RuntimeDigest;
    runtimeManifestSha256: RuntimeDigest;
    runtimeManifestSchema?: WorkflowRuntimeManifest['schemaVersion'];
    runtimePolicySha256?: RuntimeDigest;
    workflowCompilerVersion?: string;
    actionId?: string | null;
    workflowId: string;
    workflowVersion: string;
    definitionHash: RuntimeDigest;
    evidenceDigest: RuntimeDigest | null;
    verifier: string | null;
    previousReceiptSha256: RuntimeDigest | null;
    checkpoint: { id: string; sha256: RuntimeDigest };
    receiptSha256: RuntimeDigest;
    createdAt: string;
  }>;
}

type WorkflowRuntimeProofInput = {
  manifest: WorkflowRuntimeManifest;
  run: WorkflowRuntimeRun;
  approvals?: WorkflowRuntimeProofApproval[];
  capabilityObservations?: WorkflowRuntimeProofCapabilityObservation[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function boundedText(value: unknown, label: string, maximum = 180): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new RuntimeValidationError('INVALID_STATE', `${label} is invalid`);
  }
  return value.trim();
}

function digest(value: unknown, label: string): RuntimeDigest {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new RuntimeValidationError('INVALID_STATE', `${label} must be a sha256 digest`);
  }
  return value as RuntimeDigest;
}

function optionalDigest(value: unknown, label: string): RuntimeDigest | null {
  return value === null ? null : digest(value, label);
}

function instant(value: unknown, label: string): string {
  const result = boundedText(value, label, 64);
  if (Number.isNaN(Date.parse(result)) || new Date(result).toISOString() !== result) {
    throw new RuntimeValidationError('INVALID_STATE', `${label} must be a canonical instant`);
  }
  return result;
}

function positiveVersion(value: unknown, label: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 2_147_483_647
  ) {
    throw new RuntimeValidationError('INVALID_STATE', `${label} is invalid`);
  }
  return value;
}

function parseScope(value: unknown): WorkflowRuntimeScope {
  if (!isRecord(value) || !exact(value, ['accountId', 'tenantId', 'workspaceAccountId'])) {
    throw new RuntimeValidationError('INVALID_STATE', 'Workflow Runtime approval scope is invalid');
  }
  return {
    accountId: boundedText(value.accountId, 'Workflow Runtime approval account ID'),
    tenantId: boundedText(value.tenantId, 'Workflow Runtime approval tenant ID'),
    workspaceAccountId: boundedText(
      value.workspaceAccountId,
      'Workflow Runtime approval workspace ID'
    )
  };
}

function parseActivation(value: unknown): WorkflowRuntimeRun['activation'] {
  if (!isRecord(value) || !exact(value, ['id', 'policySha256', 'version'])) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime approval activation is invalid'
    );
  }
  return {
    id: boundedText(value.id, 'Workflow Runtime approval activation ID'),
    version: positiveVersion(value.version, 'Workflow Runtime approval activation version'),
    policySha256: digest(value.policySha256, 'Workflow Runtime approval activation policy')
  };
}

function parseRegistration(value: unknown): NonNullable<WorkflowRuntimeRun['registration']> {
  if (
    !isRecord(value) ||
    !exact(value, ['buildReleaseId', 'contractSha256', 'runtimePolicySha256'])
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime approval registration is invalid'
    );
  }
  return {
    buildReleaseId: boundedText(value.buildReleaseId, 'Workflow Runtime approval Build release ID'),
    contractSha256: digest(value.contractSha256, 'Workflow Runtime approval contract'),
    runtimePolicySha256: digest(value.runtimePolicySha256, 'Workflow Runtime approval policy')
  };
}

function parseWorkflow(value: unknown): WorkflowRuntimeManifest['workflow'] {
  if (
    !isRecord(value) ||
    !exact(value, ['compiledBundleSchema', 'compilerVersion', 'definitionHash', 'id', 'version']) ||
    value.compiledBundleSchema !== 'compiled_workflow_bundle.v0.3'
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime approval workflow is invalid'
    );
  }
  return {
    id: boundedText(value.id, 'Workflow Runtime approval workflow ID', 160),
    version: boundedText(value.version, 'Workflow Runtime approval workflow version', 160),
    definitionHash: digest(value.definitionHash, 'Workflow Runtime approval workflow definition'),
    compilerVersion: boundedText(
      value.compilerVersion,
      'Workflow Runtime approval compiler version',
      160
    ),
    compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
  };
}

function sameScope(left: WorkflowRuntimeScope, right: WorkflowRuntimeScope): boolean {
  return (
    left.accountId === right.accountId &&
    left.tenantId === right.tenantId &&
    left.workspaceAccountId === right.workspaceAccountId
  );
}

function sameActivation(
  left: WorkflowRuntimeRun['activation'],
  right: WorkflowRuntimeRun['activation']
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version &&
    left.policySha256 === right.policySha256
  );
}

function sameRegistration(
  left: NonNullable<WorkflowRuntimeRun['registration']>,
  right: NonNullable<WorkflowRuntimeRun['registration']>
): boolean {
  return (
    left.buildReleaseId === right.buildReleaseId &&
    left.contractSha256 === right.contractSha256 &&
    left.runtimePolicySha256 === right.runtimePolicySha256
  );
}

function sameWorkflow(
  left: WorkflowRuntimeManifest['workflow'],
  right: WorkflowRuntimeManifest['workflow']
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version &&
    left.definitionHash === right.definitionHash &&
    left.compilerVersion === right.compilerVersion &&
    left.compiledBundleSchema === right.compiledBundleSchema
  );
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new RuntimeValidationError('INVALID_STATE', `${label} is not valid JSON`);
  }
}

function parseApprovalContext(
  value: unknown,
  expectedScope: WorkflowRuntimeScope
): WorkflowRuntimeProofApprovalContext {
  const v1Fields = [
    'actionId',
    'activation',
    'artifactManifestSha256',
    'attempt',
    'evidenceDigest',
    'runVersion',
    'runtimeManifestSha256',
    'schema',
    'scope',
    'stepVersion',
    'version',
    'workflow'
  ];
  const v2Fields = [...v1Fields, 'registration', 'runtimeManifestSchema'];
  const v1 =
    isRecord(value) &&
    exact(value, v1Fields) &&
    value.schema === 'create-something/workflow-runtime-approval-context@1' &&
    value.version === 1;
  const v2 =
    isRecord(value) &&
    exact(value, v2Fields) &&
    value.schema === 'create-something/workflow-runtime-approval-context@2' &&
    value.version === 2;
  if (
    (!v1 && !v2) ||
    !isRecord(value) ||
    !isRecord(value.attempt) ||
    !exact(value.attempt, ['type']) ||
    value.attempt.type !== 'no_capability_attempt'
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime approval context is invalid'
    );
  }
  const scope = parseScope(value.scope);
  if (!sameScope(scope, expectedScope)) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime approval context scope mismatches'
    );
  }
  const context = {
    scope,
    runVersion: positiveVersion(value.runVersion, 'Workflow Runtime approval run version'),
    stepVersion: positiveVersion(value.stepVersion, 'Workflow Runtime approval step version'),
    attempt: { type: 'no_capability_attempt' as const },
    activation: parseActivation(value.activation),
    artifactManifestSha256: digest(
      value.artifactManifestSha256,
      'Workflow Runtime approval artifact manifest'
    ),
    runtimeManifestSha256: digest(
      value.runtimeManifestSha256,
      'Workflow Runtime approval runtime manifest'
    ),
    workflow: parseWorkflow(value.workflow),
    actionId: boundedText(value.actionId, 'Workflow Runtime approval action ID'),
    evidenceDigest: digest(value.evidenceDigest, 'Workflow Runtime approval evidence')
  };
  if (v1) {
    return {
      schema: 'create-something/workflow-runtime-approval-context@1',
      version: 1,
      ...context
    };
  }
  if (
    value.runtimeManifestSchema !== 'workflow_runtime_manifest.v0.1' &&
    value.runtimeManifestSchema !== 'workflow_runtime_manifest.v0.2'
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime approval manifest schema is invalid'
    );
  }
  return {
    schema: 'create-something/workflow-runtime-approval-context@2',
    version: 2,
    ...context,
    registration: parseRegistration(value.registration),
    runtimeManifestSchema: value.runtimeManifestSchema
  };
}

function parseApproval(
  value: unknown,
  expectedScope: WorkflowRuntimeScope
): WorkflowRuntimeProofApproval {
  if (
    !isRecord(value) ||
    !exact(value, [
      'approval_id',
      'approval_command_schema',
      'approval_command_version',
      'approval_context_json',
      'approval_json',
      'approval_surface_schema',
      'approval_surface_sha256',
      'binding_sha256',
      'created_at',
      'decided_at',
      'decision',
      'decision_actor_role',
      'step_id'
    ])
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval is invalid'
    );
  }
  const approval = parseJson(
    String(value.approval_json),
    'Stored Workflow Runtime approval payload'
  );
  if (typeof value.approval_context_json !== 'string') {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval is missing its exact context'
    );
  }
  const context = parseApprovalContext(
    parseJson(value.approval_context_json, 'Stored Workflow Runtime approval context'),
    expectedScope
  );
  if (
    !isRecord(approval) ||
    !exact(approval, ['bindingSha256', 'expiresAt', 'id', 'policyId']) ||
    approval.id !== value.approval_id ||
    approval.bindingSha256 !== value.binding_sha256
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval does not match'
    );
  }
  if (value.decision !== null && value.decision !== 'approved' && value.decision !== 'rejected') {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval decision is invalid'
    );
  }
  if ((value.decision === null) !== (value.decided_at === null)) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval decision is incomplete'
    );
  }
  const attestationValues = [
    value.approval_surface_schema,
    value.approval_surface_sha256,
    value.approval_command_schema,
    value.approval_command_version
  ];
  const hasAttestation = attestationValues.some((entry) => entry !== null);
  if (hasAttestation && attestationValues.some((entry) => entry === null)) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval attestation is incomplete'
    );
  }
  if (!hasAttestation && context.schema === 'create-something/workflow-runtime-approval-context@2') {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Registration-bound Workflow Runtime approval is missing its attestation'
    );
  }
  const approvalSurface = hasAttestation
    ? {
        schemaVersion: (() => {
          if (
            !APPROVAL_SURFACE_SCHEMAS.includes(
              value.approval_surface_schema as (typeof APPROVAL_SURFACE_SCHEMAS)[number]
            )
          ) {
            throw new RuntimeValidationError(
              'INVALID_STATE',
              'Stored Workflow Runtime approval surface schema is invalid'
            );
          }
          return value.approval_surface_schema as WorkflowRuntimeProofApprovalSurface['schemaVersion'];
        })(),
        sha256: digest(value.approval_surface_sha256, 'Workflow Runtime approval surface')
      }
    : null;
  const approvalCommand = hasAttestation
    ? (() => {
        if (
          value.approval_command_schema !==
            'create-something/control-workflow-runtime-approval-command@1' ||
          value.approval_command_version !== 1
        ) {
          throw new RuntimeValidationError(
            'INVALID_STATE',
            'Stored Workflow Runtime approval command is invalid'
          );
        }
        return {
          schema: 'create-something/control-workflow-runtime-approval-command@1' as const,
          version: 1 as const
        };
      })()
    : null;
  if (
    (value.decision === null && value.decision_actor_role !== null) ||
    (value.decision !== null &&
      context.schema === 'create-something/workflow-runtime-approval-context@2' &&
      (typeof value.decision_actor_role !== 'string' ||
        !ACTOR_ROLES.includes(value.decision_actor_role as WorkflowRuntimeActorRole))) ||
    (value.decision !== null &&
      context.schema === 'create-something/workflow-runtime-approval-context@1' &&
      value.decision_actor_role !== null)
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime approval decision role is invalid'
    );
  }
  return {
    id: boundedText(approval.id, 'Workflow Runtime approval ID', 240),
    stepId: boundedText(value.step_id, 'Workflow Runtime approval step ID'),
    bindingSha256: digest(approval.bindingSha256, 'Workflow Runtime approval binding'),
    policyId: boundedText(approval.policyId, 'Workflow Runtime approval policy ID'),
    expiresAt: instant(approval.expiresAt, 'Workflow Runtime approval expiry'),
    decision: value.decision,
    decidedByRole: value.decision_actor_role as WorkflowRuntimeActorRole | null,
    approvalSurface,
    approvalCommand,
    createdAt: instant(value.created_at, 'Workflow Runtime approval creation'),
    decidedAt:
      value.decided_at === null
        ? null
        : instant(value.decided_at, 'Workflow Runtime approval decision'),
    context
  };
}

function parseCapabilityObservation(value: unknown): WorkflowRuntimeProofCapabilityObservation {
  if (
    !isRecord(value) ||
    !exact(value, [
      'attempt_id',
      'capability_id',
      'capability_parameter_sha256',
      'failure_code',
      'observed_item_count',
      'request_sha256',
      'response_sha256',
      'run_id',
      'source_invocation_evidence_sha256',
      'source_invocation_sha256',
      'status',
      'step_id',
      'verifier',
      'verifier_evidence_sha256'
    ])
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime observation is invalid'
    );
  }
  if (
    value.status !== 'prepared' &&
    value.status !== 'verified' &&
    value.status !== 'effect_unknown'
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime observation status is invalid'
    );
  }
  const count =
    value.observed_item_count === null
      ? null
      : typeof value.observed_item_count === 'number' &&
          Number.isInteger(value.observed_item_count) &&
          value.observed_item_count >= 0 &&
          value.observed_item_count <= 5
        ? value.observed_item_count
        : (() => {
            throw new RuntimeValidationError(
              'INVALID_STATE',
              'Stored Workflow Runtime observation count is invalid'
            );
          })();
  const verifier =
    value.verifier === null ? null : boundedText(value.verifier, 'Workflow Runtime verifier', 80);
  const failureCode =
    value.failure_code === null
      ? null
      : boundedText(value.failure_code, 'Workflow Runtime failure code', 80);
  if (
    (verifier !== null && !VERIFIER.test(verifier)) ||
    (failureCode !== null && !FAILURE_CODE.test(failureCode))
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime observation label is invalid'
    );
  }
  const observation = {
    runId: boundedText(value.run_id, 'Workflow Runtime observation run ID'),
    stepId: boundedText(value.step_id, 'Workflow Runtime observation step ID'),
    attemptId: boundedText(value.attempt_id, 'Workflow Runtime observation attempt ID'),
    capabilityId: boundedText(value.capability_id, 'Workflow Runtime observation capability ID'),
    capabilityParameterSha256: digest(
      value.capability_parameter_sha256,
      'Workflow Runtime observation capability parameters'
    ),
    requestSha256: digest(value.request_sha256, 'Workflow Runtime observation request'),
    status: value.status,
    sourceInvocationSha256: optionalDigest(
      value.source_invocation_sha256,
      'Workflow Runtime observation invocation'
    ),
    sourceInvocationEvidenceSha256: optionalDigest(
      value.source_invocation_evidence_sha256,
      'Workflow Runtime observation invocation evidence'
    ),
    responseSha256: optionalDigest(value.response_sha256, 'Workflow Runtime observation response'),
    observedItemCount: count,
    verifier,
    verifierEvidenceSha256: optionalDigest(
      value.verifier_evidence_sha256,
      'Workflow Runtime observation verifier evidence'
    ),
    failureCode
  } as const;
  if (
    (observation.status === 'prepared' &&
      (observation.sourceInvocationSha256 !== null ||
        observation.sourceInvocationEvidenceSha256 !== null ||
        observation.responseSha256 !== null ||
        observation.observedItemCount !== null ||
        observation.verifier !== null ||
        observation.verifierEvidenceSha256 !== null ||
        observation.failureCode !== null)) ||
    (observation.status === 'verified' &&
      (observation.sourceInvocationSha256 === null ||
        observation.sourceInvocationEvidenceSha256 === null ||
        observation.responseSha256 === null ||
        observation.observedItemCount === null ||
        observation.verifier === null ||
        observation.verifierEvidenceSha256 === null ||
        observation.failureCode !== null)) ||
    (observation.status === 'effect_unknown' &&
      (observation.sourceInvocationSha256 === null ||
        observation.sourceInvocationEvidenceSha256 === null ||
        observation.responseSha256 === null ||
        observation.observedItemCount === null ||
        observation.verifier !== null ||
        observation.verifierEvidenceSha256 !== null ||
        observation.failureCode === null))
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Stored Workflow Runtime observation evidence is invalid'
    );
  }
  return observation;
}

function validateRelations(
  manifest: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun,
  approvals: WorkflowRuntimeProofApproval[],
  capabilityObservations: WorkflowRuntimeProofCapabilityObservation[]
): void {
  const steps = new Map(run.steps.map((step) => [step.id, step]));
  if (new Set(approvals.map((approval) => approval.id)).size !== approvals.length) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime proof approvals are not unique'
    );
  }
  for (const approval of approvals) {
    const step = steps.get(approval.stepId);
    if (!step) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof approval references an unknown step'
      );
    }
    const waitReceipt = run.receipts.find(
      (receipt) =>
        receipt.eventType === 'wait_created' &&
        receipt.stepId === approval.stepId &&
        receipt.createdAt === approval.createdAt
    );
    if (!waitReceipt) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof approval is not bound to a wait receipt'
      );
    }
    const definition = manifest.steps.find((candidate) => candidate.id === approval.stepId);
    if (!definition || definition.disposition !== 'wait') {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof approval does not reference a wait definition'
      );
    }
    if (
      approval.policyId !== definition.approval.policyId ||
      approval.expiresAt !== definition.approval.expiresAt ||
      approval.context.runVersion !== waitReceipt.runVersion ||
      approval.context.stepVersion !== waitReceipt.stepVersion ||
      waitReceipt.attemptId !== null ||
      !sameActivation(approval.context.activation, run.activation) ||
      approval.context.artifactManifestSha256 !== run.artifactManifestSha256 ||
      approval.context.runtimeManifestSha256 !== run.runtimeManifestSha256 ||
      !sameWorkflow(approval.context.workflow, manifest.workflow) ||
      approval.context.activation.id !== waitReceipt.activationId ||
      approval.context.activation.version !== waitReceipt.activationVersion ||
      approval.context.activation.policySha256 !== waitReceipt.activationPolicySha256 ||
      approval.context.artifactManifestSha256 !== waitReceipt.artifactManifestSha256 ||
      approval.context.runtimeManifestSha256 !== waitReceipt.runtimeManifestSha256 ||
      approval.context.workflow.id !== waitReceipt.workflowId ||
      approval.context.workflow.version !== waitReceipt.workflowVersion ||
      approval.context.workflow.definitionHash !== waitReceipt.definitionHash ||
      approval.context.evidenceDigest !== definition.evidenceDigest ||
      approval.context.evidenceDigest !== waitReceipt.evidenceDigest ||
      approval.context.actionId !== definition.actionId ||
      (run.schema === 'workflow_runtime_run.v0.1'
        ? approval.context.schema !== 'create-something/workflow-runtime-approval-context@1'
        : !run.registration ||
          !run.runtimeManifestSchema ||
          approval.context.schema !== 'create-something/workflow-runtime-approval-context@2' ||
          !sameRegistration(approval.context.registration, run.registration) ||
          approval.context.runtimeManifestSchema !== run.runtimeManifestSchema ||
          waitReceipt.schema !== 'create-something/control-run-receipt@3' ||
          approval.context.registration.buildReleaseId !== waitReceipt.buildReleaseId ||
          approval.context.registration.contractSha256 !== waitReceipt.contractSha256 ||
          approval.context.registration.runtimePolicySha256 !== waitReceipt.runtimePolicySha256 ||
          approval.context.runtimeManifestSchema !== waitReceipt.runtimeManifestSchema)
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof approval context does not match its wait receipt'
      );
    }
    if (
      run.schema === 'workflow_runtime_run.v0.2' &&
      (!approval.approvalSurface ||
        !approval.approvalCommand ||
        approval.approvalSurface.sha256 !== manifest.artifacts.approvalSurfacesSha256 ||
        waitReceipt.approvalSurfaceSha256 !== approval.approvalSurface.sha256)
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof approval attestation does not match its compiler receipt'
      );
    }
    if (step.approval?.id === approval.id && approval.decision !== null) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Pending Workflow Runtime approval has a decision'
      );
    }
    if (approval.decision !== null) {
      const expectedOutcome =
        approval.decision === 'approved' ? 'exact approval accepted' : 'exact approval rejected';
      const decisionReceipt = run.receipts.find(
        (receipt) =>
          receipt.eventType === 'approval_decided' &&
          receipt.stepId === approval.stepId &&
          receipt.createdAt === approval.decidedAt &&
          receipt.outcome === expectedOutcome
      );
      if (
        !decisionReceipt ||
        (run.schema === 'workflow_runtime_run.v0.2' &&
          decisionReceipt.actorRole !== approval.decidedByRole)
      ) {
        throw new RuntimeValidationError(
          'INVALID_STATE',
          'Workflow Runtime proof approval is not bound to a decision receipt'
        );
      }
    }
  }
  for (const step of run.steps) {
    if (
      step.approval &&
      !approvals.some(
        (approval) =>
          approval.id === step.approval?.id &&
          approval.stepId === step.id &&
          approval.decision === null &&
          approval.bindingSha256 === step.approval.bindingSha256
      )
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Pending Workflow Runtime approval is missing'
      );
    }
  }
  const attempts = new Map(
    run.steps.flatMap((step) =>
      step.attempts.map((attempt) => [`${step.id}:${attempt.id}`, attempt])
    )
  );
  if (
    new Set(
      capabilityObservations.map(
        (observation) => `${observation.runId}:${observation.stepId}:${observation.attemptId}`
      )
    ).size !== capabilityObservations.length
  ) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Workflow Runtime proof observations are not unique'
    );
  }
  for (const observation of capabilityObservations) {
    const attempt = attempts.get(`${observation.stepId}:${observation.attemptId}`);
    if (
      observation.runId !== run.id ||
      !attempt ||
      attempt.capability.id !== observation.capabilityId ||
      attempt.capability.parameterDigest !== observation.capabilityParameterSha256
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof observation does not match'
      );
    }
  }
}

function proofReceipt(receipt: WorkflowRuntimeReceipt) {
  return {
    schema: receipt.schema,
    id: receipt.id,
    runId: receipt.runId,
    eventIndex: receipt.eventIndex,
    eventType: receipt.eventType,
    status: receipt.status,
    runVersion: receipt.runVersion,
    stepId: receipt.stepId,
    stepVersion: receipt.stepVersion,
    attemptId: receipt.attemptId,
    activationId: receipt.activationId,
    activationVersion: receipt.activationVersion,
    activationPolicySha256: receipt.activationPolicySha256,
    ...(receipt.schema === 'create-something/control-run-receipt@3'
      ? {
          buildReleaseId: receipt.buildReleaseId,
          contractSha256: receipt.contractSha256,
          runtimeManifestSchema: receipt.runtimeManifestSchema,
          runtimePolicySha256: receipt.runtimePolicySha256,
          workflowCompilerVersion: receipt.workflowCompilerVersion,
          actionId: receipt.actionId
        }
      : {}),
    artifactManifestSha256: receipt.artifactManifestSha256,
    runtimeManifestSha256: receipt.runtimeManifestSha256,
    workflowId: receipt.workflowId,
    workflowVersion: receipt.workflowVersion,
    definitionHash: receipt.definitionHash,
    evidenceDigest: receipt.evidenceDigest,
    verifier: receipt.verifier,
    previousReceiptSha256: receipt.previousReceiptSha256,
    checkpoint: {
      id: `checkpoint:${receipt.runId}:v${receipt.runVersion}`,
      sha256: receipt.checkpointSha256
    },
    receiptSha256: receipt.receiptSha256,
    createdAt: receipt.createdAt
  };
}

/**
 * Derives the only data shape shared by Control, Substrate, and Atlas Proof.
 * It verifies the persisted compiler-runtime state and intentionally omits raw
 * source payloads, operator subjects, free-text outcomes, and all commands.
 */
async function createWorkflowRuntimeProofProjection(
  input: WorkflowRuntimeProofInput
): Promise<WorkflowRuntimeProofProjection> {
  await verifyWorkflowRuntimeRun(input.manifest, input.run);
  const approvals = input.approvals ?? [];
  const capabilityObservations = input.capabilityObservations ?? [];
  validateRelations(input.manifest, input.run, approvals, capabilityObservations);
  return {
    schema: 'create-something/workflow-runtime-proof@1',
    run: {
      id: input.run.id,
      status: input.run.status,
      version: input.run.version,
      activation: structuredClone(input.run.activation),
      ...(input.run.schema === 'workflow_runtime_run.v0.2'
        ? {
            registration: structuredClone(input.run.registration),
            runtimeManifestSchema: input.run.runtimeManifestSchema
          }
        : {}),
      artifactManifestSha256: input.run.artifactManifestSha256,
      runtimeManifestSha256: input.run.runtimeManifestSha256,
      workflow: structuredClone(input.manifest.workflow)
    },
    steps: input.run.steps.map((step) => ({
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
        ? {
            id: step.approval.id,
            bindingSha256: step.approval.bindingSha256,
            policyId: step.approval.policyId,
            expiresAt: step.approval.expiresAt
          }
        : null
    })),
    approvals: approvals.map((approval) => structuredClone(approval)),
    capabilityObservations: capabilityObservations.map((observation) =>
      structuredClone(observation)
    ),
    receipts: input.run.receipts.map(proofReceipt)
  };
}

/**
 * Read-only Control port. It has no runtime command, approval, source, or
 * Atlas write method; authenticated HTTP/MCP surfaces may expose this value
 * only after their existing identity and scope checks succeed.
 */
export class D1WorkflowRuntimeProofReader {
  constructor(
    private readonly database: D1Database,
    private readonly manifests: WorkflowRuntimeManifestAuthority
  ) {}

  async find(input: {
    scope: WorkflowRuntimeScope;
    runId: string;
  }): Promise<WorkflowRuntimeProofProjection | undefined> {
    const row = await this.database
      .prepare(
        `SELECT runtime.run_json,
                COALESCE((
                  SELECT json_group_array(json_object(
                    'approval_id', approval.approval_id,
                    'step_id', approval.step_id,
                    'binding_sha256', approval.binding_sha256,
                    'decision', approval.decision,
                    'approval_json', approval.approval_json,
                    'approval_context_json', approval.approval_context_json,
                    'approval_surface_schema', approval.approval_surface_schema,
                    'approval_surface_sha256', approval.approval_surface_sha256,
                    'approval_command_schema', approval.approval_command_schema,
                    'approval_command_version', approval.approval_command_version,
                    'decision_actor_role', approval.decision_actor_role,
                    'created_at', approval.created_at,
                    'decided_at', approval.decided_at
                  ))
                  FROM (
                    SELECT approval.approval_id, approval.step_id, approval.binding_sha256,
                           approval.decision, approval.approval_json, approval.approval_context_json,
                           approval.created_at, approval.decided_at,
                           attestation.approval_surface_schema,
                           attestation.approval_surface_sha256,
                           attestation.approval_command_schema,
                           attestation.approval_command_version,
                           attestation.decision_actor_role
                    FROM control_workflow_runtime_approvals approval
                    LEFT JOIN control_workflow_runtime_approval_attestations attestation
                      ON attestation.approval_id = approval.approval_id
                    WHERE approval.run_id = runtime.run_id
                    ORDER BY approval.created_at ASC, approval.approval_id ASC
                  ) approval
                ), '[]') AS approvals_json,
                COALESCE((
                  SELECT json_group_array(json_object(
                    'run_id', dispatch.run_id,
                    'step_id', dispatch.step_id,
                    'attempt_id', dispatch.attempt_id,
                    'capability_id', dispatch.capability_id,
                    'capability_parameter_sha256', dispatch.capability_parameter_sha256,
                    'request_sha256', dispatch.request_sha256,
                    'status', dispatch.status,
                    'source_invocation_sha256', dispatch.source_invocation_sha256,
                    'response_sha256', dispatch.response_sha256,
                    'observed_item_count', dispatch.observed_item_count,
                    'source_invocation_evidence_sha256', dispatch.source_invocation_evidence_sha256,
                    'verifier', dispatch.verifier,
                    'verifier_evidence_sha256', dispatch.verifier_evidence_sha256,
                    'failure_code', dispatch.failure_code
                  ))
                  FROM (
                    SELECT run_id, step_id, attempt_id, capability_id, capability_parameter_sha256,
                           request_sha256, status, source_invocation_sha256, response_sha256,
                           observed_item_count, source_invocation_evidence_sha256, verifier,
                           verifier_evidence_sha256, failure_code
                    FROM control_workflow_runtime_dispatches
                    WHERE run_id = runtime.run_id
                    ORDER BY step_id ASC, attempt_id ASC
                  ) dispatch
                ), '[]') AS capability_observations_json
         FROM control_workflow_runtime_runs runtime
         JOIN control_runs control ON control.id = runtime.run_id
         WHERE runtime.run_id = ?1 AND control.account_id = ?2 AND control.tenant_id = ?3
           AND control.workspace_account_id = ?4
           AND (
             json_extract(runtime.run_json, '$.schema') IS NOT 'workflow_runtime_run.v0.2'
             OR EXISTS (
               SELECT 1 FROM control_workflow_runtime_checkpoints checkpoint
               WHERE checkpoint.run_id = runtime.run_id
                 AND checkpoint.run_version = runtime.version
                 AND json(checkpoint.checkpoint_json) IS json(runtime.run_json)
             )
           )`
      )
      .bind(
        boundedText(input.runId, 'Workflow Runtime proof run ID'),
        boundedText(input.scope.accountId, 'Workflow Runtime proof account ID'),
        boundedText(input.scope.tenantId, 'Workflow Runtime proof tenant ID'),
        boundedText(input.scope.workspaceAccountId, 'Workflow Runtime proof workspace ID')
      )
      .first<ProofRow>();
    if (!row) return undefined;
    const run = parseJson(row.run_json, 'Stored Workflow Runtime checkpoint') as WorkflowRuntimeRun;
    const manifest = await this.manifests.findByRuntimeManifestSha256(run.runtimeManifestSha256);
    if (!manifest) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Workflow Runtime proof manifest is unavailable from the trusted authority'
      );
    }
    const approvalRows = parseJson(row.approvals_json, 'Stored Workflow Runtime approvals');
    const observationRows = parseJson(
      row.capability_observations_json,
      'Stored Workflow Runtime observations'
    );
    if (!Array.isArray(approvalRows) || !Array.isArray(observationRows)) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Stored Workflow Runtime proof collections are invalid'
      );
    }
    return createWorkflowRuntimeProofProjection({
      manifest,
      run,
      approvals: approvalRows.map((approval) => parseApproval(approval, input.scope)),
      capabilityObservations: observationRows.map(parseCapabilityObservation)
    });
  }
}
