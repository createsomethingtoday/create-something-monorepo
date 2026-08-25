import {
  RuntimeValidationError,
  type RuntimeDigest,
  type WorkflowRuntimeAdmission,
  type WorkflowRuntimeApproval,
  type WorkflowRuntimeEvent,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimePlan,
  type WorkflowRuntimeReceipt,
  type WorkflowRuntimeReceiptEventType,
  type WorkflowRuntimeRun,
  type WorkflowRuntimeStepDefinition,
  type WorkflowRuntimeStepRecord
} from './types.js';

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const RUN_STATUSES = [
  'queued',
  'running',
  'waiting_for_approval',
  'retryable_failure',
  'blocked',
  'failed',
  'cancelled',
  'completed'
];
const STEP_STATUSES = [
  'pending',
  'ready',
  'running',
  'waiting_for_approval',
  'succeeded',
  'retryable_failure',
  'blocked',
  'failed',
  'cancelled'
];
const ATTEMPT_STATUSES = ['prepared', 'succeeded', 'retryable_failure', 'failed', 'abandoned'];
const RECEIPT_EVENTS = [
  'run_admitted',
  'effect_intent',
  'step_succeeded',
  'wait_created',
  'approval_decided',
  'blocked',
  'attempt_failed',
  'recovered',
  'cancelled',
  'run_failed',
  'run_completed'
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function text(value: unknown, label: string, maximum = 240): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      `${label} must be a non-empty bounded string`
    );
  }
  return value.trim();
}

function digest(value: unknown, label: string): RuntimeDigest {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new RuntimeValidationError('INVALID_MANIFEST', `${label} must be a sha256 digest`);
  }
  return value as RuntimeDigest;
}

function eventDigest(value: unknown, label: string): RuntimeDigest {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new RuntimeValidationError('INVALID_EVENT', `${label} must be a sha256 digest`);
  }
  return value as RuntimeDigest;
}

function instant(
  value: unknown,
  label: string,
  code: 'INVALID_MANIFEST' | 'INVALID_EVENT' = 'INVALID_MANIFEST'
): string {
  if (typeof value !== 'string' || !INSTANT.test(value) || Number.isNaN(Date.parse(value))) {
    throw new RuntimeValidationError(code, `${label} must be an ISO-8601 UTC instant`);
  }
  return value;
}

function ids(value: unknown, label: string): string[] {
  if (!Array.isArray(value))
    throw new RuntimeValidationError('INVALID_MANIFEST', `${label} must be an array`);
  const result = value.map((entry) => text(entry, `${label} item`, 160));
  if (
    new Set(result).size !== result.length ||
    result.some((entry, index) => index > 0 && result[index - 1] >= entry)
  ) {
    throw new RuntimeValidationError('INVALID_MANIFEST', `${label} must be unique and sorted`);
  }
  return result;
}

function step(value: unknown): WorkflowRuntimeStepDefinition {
  if (!isRecord(value))
    throw new RuntimeValidationError('INVALID_MANIFEST', 'Runtime step must be an object');
  if (value.recovery !== 'manual_fallback') {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime step recovery must be manual_fallback'
    );
  }
  const base = {
    id: text(value.id, 'Runtime step ID', 160),
    actionId: text(value.actionId, 'Runtime action ID', 160),
    dependsOn: ids(value.dependsOn, 'Runtime step dependencies'),
    evidenceDigest: digest(value.evidenceDigest, 'Runtime step evidence digest'),
    recovery: 'manual_fallback' as const
  };
  if (value.disposition === 'pass') {
    if (
      !exact(value, [
        'capability',
        'actionId',
        'dependsOn',
        'disposition',
        'evidenceDigest',
        'id',
        'recovery'
      ]) ||
      !isRecord(value.capability) ||
      !exact(value.capability, ['id', 'parameterDigest'])
    ) {
      throw new RuntimeValidationError(
        'INVALID_MANIFEST',
        'Pass runtime step has unknown or missing fields'
      );
    }
    return {
      ...base,
      disposition: 'pass',
      capability: {
        id: text(value.capability.id, 'Pass capability ID', 160),
        parameterDigest: digest(
          value.capability.parameterDigest,
          'Pass capability parameter digest'
        )
      }
    };
  }
  if (value.disposition === 'wait') {
    if (
      !exact(value, [
        'actionId',
        'approval',
        'dependsOn',
        'disposition',
        'evidenceDigest',
        'id',
        'recovery'
      ]) ||
      !isRecord(value.approval) ||
      !exact(value.approval, ['expiresAt', 'policyId'])
    ) {
      throw new RuntimeValidationError(
        'INVALID_MANIFEST',
        'Wait runtime step has unknown or missing fields'
      );
    }
    return {
      ...base,
      disposition: 'wait',
      approval: {
        policyId: text(value.approval.policyId, 'Wait approval policy ID', 160),
        expiresAt: instant(value.approval.expiresAt, 'Wait approval expiry')
      }
    };
  }
  if (value.disposition === 'stop') {
    if (
      !exact(value, [
        'actionId',
        'dependsOn',
        'disposition',
        'evidenceDigest',
        'id',
        'reason',
        'recovery'
      ])
    ) {
      throw new RuntimeValidationError(
        'INVALID_MANIFEST',
        'Stop runtime step has unknown or missing fields'
      );
    }
    return { ...base, disposition: 'stop', reason: text(value.reason, 'Stop reason') };
  }
  throw new RuntimeValidationError('INVALID_MANIFEST', 'Runtime step disposition is unsupported');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  return value;
}

function canonical(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function hash(value: unknown): Promise<RuntimeDigest> {
  const bytes = new TextEncoder().encode(canonical(value));
  const output = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(output)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function same(left: unknown, right: unknown): boolean {
  return canonical(left) === canonical(right);
}

function stateFailure(message: string): never {
  throw new RuntimeValidationError('INVALID_STATE', message);
}

function validText(value: unknown, maximum = 240): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value.trim().length <= maximum;
}

function validInstant(value: unknown): value is string {
  return typeof value === 'string' && INSTANT.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * Excludes the receipt list so a receipt can bind the resulting checkpoint
 * without creating a self-referential hash cycle.
 */
export async function workflowRuntimeCheckpointHash(
  run: WorkflowRuntimeRun
): Promise<RuntimeDigest> {
  return hash({
    schema: run.schema,
    id: run.id,
    status: run.status,
    version: run.version,
    activation: run.activation,
    artifactManifestSha256: run.artifactManifestSha256,
    runtimeManifestSha256: run.runtimeManifestSha256,
    steps: run.steps
  });
}

function graph(steps: WorkflowRuntimeStepDefinition[]): void {
  const byId = new Map(steps.map((candidate) => [candidate.id, candidate]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (candidate: WorkflowRuntimeStepDefinition): void => {
    if (visited.has(candidate.id)) return;
    if (visiting.has(candidate.id))
      throw new RuntimeValidationError('INVALID_MANIFEST', 'Runtime step graph contains a cycle');
    visiting.add(candidate.id);
    for (const dependency of candidate.dependsOn) {
      const target = byId.get(dependency);
      if (!target)
        throw new RuntimeValidationError(
          'INVALID_MANIFEST',
          `Runtime step ${candidate.id} has an unknown dependency`
        );
      visit(target);
    }
    visiting.delete(candidate.id);
    visited.add(candidate.id);
  };
  for (const candidate of steps) visit(candidate);
}

function serial(steps: WorkflowRuntimeStepDefinition[]): void {
  const initial = steps.filter((candidate) => candidate.dependsOn.length === 0);
  if (initial.length !== 1 || steps.some((candidate) => candidate.dependsOn.length > 1)) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime v0.1 requires one initial step and one predecessor per successor'
    );
  }
  const successors = new Map(steps.map((candidate) => [candidate.id, [] as string[]]));
  for (const candidate of steps) {
    for (const dependency of candidate.dependsOn) successors.get(dependency)?.push(candidate.id);
  }
  if ([...successors.values()].some((candidate) => candidate.length > 1)) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime v0.1 requires one deterministic successor per step'
    );
  }
  const visited = new Set<string>();
  let current: string | undefined = initial[0].id;
  while (current) {
    if (visited.has(current)) {
      throw new RuntimeValidationError(
        'INVALID_MANIFEST',
        'Runtime v0.1 step chain contains a cycle'
      );
    }
    visited.add(current);
    current = successors.get(current)?.[0];
  }
  if (visited.size !== steps.length) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime v0.1 requires every step to be reachable from its initial step'
    );
  }
}

export function parseWorkflowRuntimeManifest(value: unknown): WorkflowRuntimeManifest {
  if (
    !isRecord(value) ||
    !exact(value, [
      'artifacts',
      'runtimeCompatibility',
      'schemaVersion',
      'steps',
      'target',
      'workflow'
    ])
  ) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime manifest has unknown or missing fields'
    );
  }
  if (
    value.schemaVersion !== 'workflow_runtime_manifest.v0.1' ||
    value.runtimeCompatibility !== 'workflow-runtime.v0.1' ||
    value.target !== 'create-something/control-runtime.v1'
  ) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime manifest schema, compatibility, or target is unsupported'
    );
  }
  if (
    !isRecord(value.workflow) ||
    !exact(value.workflow, [
      'compiledBundleSchema',
      'compilerVersion',
      'definitionHash',
      'id',
      'version'
    ]) ||
    value.workflow.compiledBundleSchema !== 'compiled_workflow_bundle.v0.3'
  ) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime workflow identity has unknown or unsupported fields'
    );
  }
  if (
    !isRecord(value.artifacts) ||
    !exact(value.artifacts, [
      'approvalSurfacesSha256',
      'decisionInventorySha256',
      'governedInteractionSha256',
      'toolContractsSha256'
    ])
  ) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime artifact identity has unknown or missing fields'
    );
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0 || value.steps.length > 100) {
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime manifest must contain a bounded non-empty step graph'
    );
  }
  const steps = value.steps.map(step);
  if (new Set(steps.map((candidate) => candidate.id)).size !== steps.length)
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime manifest step IDs must be unique'
    );
  graph(steps);
  serial(steps);
  return {
    schemaVersion: 'workflow_runtime_manifest.v0.1',
    runtimeCompatibility: 'workflow-runtime.v0.1',
    target: 'create-something/control-runtime.v1',
    workflow: {
      id: text(value.workflow.id, 'Workflow ID', 160),
      version: text(value.workflow.version, 'Workflow version', 160),
      definitionHash: digest(value.workflow.definitionHash, 'Workflow definition hash'),
      compilerVersion: text(value.workflow.compilerVersion, 'Compiler version', 160),
      compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
    },
    artifacts: {
      governedInteractionSha256: digest(
        value.artifacts.governedInteractionSha256,
        'Governed interaction artifact hash'
      ),
      decisionInventorySha256: digest(
        value.artifacts.decisionInventorySha256,
        'Decision inventory artifact hash'
      ),
      approvalSurfacesSha256: digest(
        value.artifacts.approvalSurfacesSha256,
        'Approval surfaces artifact hash'
      ),
      toolContractsSha256: digest(
        value.artifacts.toolContractsSha256,
        'Tool contracts artifact hash'
      )
    },
    steps
  };
}

function admission(value: WorkflowRuntimeAdmission): WorkflowRuntimeAdmission {
  if (
    !isRecord(value) ||
    !exact(value, [
      'activation',
      'artifactManifestSha256',
      'clock',
      'runId',
      'runtimeManifestSha256'
    ]) ||
    !isRecord(value.activation) ||
    !exact(value.activation, ['id', 'policySha256', 'version']) ||
    !Number.isInteger(value.activation.version) ||
    value.activation.version < 1
  ) {
    throw new RuntimeValidationError(
      'INVALID_ADMISSION',
      'Runtime admission has unknown or invalid fields'
    );
  }
  return {
    runId: text(value.runId, 'Run ID', 160),
    activation: {
      id: text(value.activation.id, 'Activation ID', 160),
      version: value.activation.version,
      policySha256: digest(value.activation.policySha256, 'Activation policy hash')
    },
    artifactManifestSha256: digest(value.artifactManifestSha256, 'Artifact manifest hash'),
    runtimeManifestSha256: digest(value.runtimeManifestSha256, 'Runtime manifest hash'),
    clock: instant(value.clock, 'Admission clock')
  };
}

function definition(manifest: WorkflowRuntimeManifest, id: string): WorkflowRuntimeStepDefinition {
  const found = manifest.steps.find((candidate) => candidate.id === id);
  if (!found)
    throw new RuntimeValidationError('INVALID_STATE', `Run step ${id} is absent from its manifest`);
  return found;
}

function record(run: WorkflowRuntimeRun, id: string): WorkflowRuntimeStepRecord {
  const found = run.steps.find((candidate) => candidate.id === id);
  if (!found)
    throw new RuntimeValidationError(
      'INVALID_EVENT',
      `Runtime event references unknown step ${id}`
    );
  return found;
}

function eventText(value: string, label: string): string {
  if (!value.trim() || value.trim().length > 240)
    throw new RuntimeValidationError('INVALID_EVENT', `${label} is required`);
  return value.trim();
}

function refreshReady(manifest: WorkflowRuntimeManifest, run: WorkflowRuntimeRun): void {
  for (const candidate of run.steps) {
    if (candidate.status !== 'pending') continue;
    const current = definition(manifest, candidate.id);
    if (current.dependsOn.every((dependency) => record(run, dependency).status === 'succeeded')) {
      candidate.status = 'ready';
      candidate.version += 1;
    }
  }
}

function refreshRunStatus(run: WorkflowRuntimeRun): void {
  if (run.steps.every((candidate) => candidate.status === 'succeeded')) run.status = 'completed';
  else if (run.steps.some((candidate) => candidate.status === 'ready')) run.status = 'queued';
}

type ReceiptInput = {
  eventType: WorkflowRuntimeReceiptEventType;
  stepId: string | null;
  stepVersion: number | null;
  attemptId: string | null;
  evidenceDigest: RuntimeDigest | null;
  actorSubject: string | null;
  verifier: string | null;
  outcome: string;
  createdAt: string;
};

async function receipt(
  manifest: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun,
  input: ReceiptInput
): Promise<void> {
  const checkpointSha256 = await workflowRuntimeCheckpointHash(run);
  const base = {
    schema: 'create-something/control-run-receipt@2' as const,
    id: `receipt:${run.id}:${run.receipts.length + 1}`,
    runId: run.id,
    eventIndex: run.receipts.length + 1,
    eventType: input.eventType,
    status: run.status,
    runVersion: run.version,
    stepId: input.stepId,
    stepVersion: input.stepVersion,
    attemptId: input.attemptId,
    activationId: run.activation.id,
    activationVersion: run.activation.version,
    activationPolicySha256: run.activation.policySha256,
    artifactManifestSha256: run.artifactManifestSha256,
    runtimeManifestSha256: run.runtimeManifestSha256,
    workflowId: manifest.workflow.id,
    workflowVersion: manifest.workflow.version,
    definitionHash: manifest.workflow.definitionHash,
    evidenceDigest: input.evidenceDigest,
    actorSubject: input.actorSubject,
    verifier: input.verifier,
    outcome: input.outcome,
    previousReceiptSha256: run.receipts.at(-1)?.receiptSha256 ?? null,
    checkpointSha256,
    createdAt: input.createdAt
  };
  run.receipts.push({ ...base, receiptSha256: await hash(base) });
}

async function approval(
  manifest: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun,
  current: WorkflowRuntimeStepRecord
): Promise<WorkflowRuntimeApproval> {
  const currentDefinition = definition(manifest, current.id);
  if (currentDefinition.disposition !== 'wait')
    throw new RuntimeValidationError('INVALID_STATE', 'Only a wait step can request approval');
  return {
    id: `approval:${run.id}:${current.id}:v${current.version}`,
    bindingSha256: await hash({
      runId: run.id,
      runVersion: run.version,
      stepId: current.id,
      stepVersion: current.version,
      activation: run.activation,
      artifactManifestSha256: run.artifactManifestSha256,
      runtimeManifestSha256: run.runtimeManifestSha256,
      workflow: manifest.workflow,
      policyId: currentDefinition.approval.policyId,
      expiresAt: currentDefinition.approval.expiresAt,
      evidenceDigest: currentDefinition.evidenceDigest
    }),
    policyId: currentDefinition.approval.policyId,
    expiresAt: currentDefinition.approval.expiresAt
  };
}

export async function createWorkflowRuntimeRun(
  manifestInput: WorkflowRuntimeManifest,
  admissionInput: WorkflowRuntimeAdmission
): Promise<WorkflowRuntimeRun> {
  const manifest = parseWorkflowRuntimeManifest(manifestInput);
  const input = admission(admissionInput);
  const steps = manifest.steps.map((candidate) => ({
    id: candidate.id,
    status: candidate.dependsOn.length === 0 ? ('ready' as const) : ('pending' as const),
    version: 1,
    attempts: [],
    approval: null
  }));
  if (steps.filter((candidate) => candidate.status === 'ready').length !== 1)
    throw new RuntimeValidationError(
      'INVALID_MANIFEST',
      'Runtime v0.1 requires exactly one initial ready step'
    );
  const run: WorkflowRuntimeRun = {
    schema: 'workflow_runtime_run.v0.1',
    id: input.runId,
    status: 'queued',
    version: 1,
    activation: input.activation,
    artifactManifestSha256: input.artifactManifestSha256,
    runtimeManifestSha256: input.runtimeManifestSha256,
    steps,
    receipts: []
  };
  await receipt(manifest, run, {
    eventType: 'run_admitted',
    stepId: null,
    stepVersion: null,
    attemptId: null,
    evidenceDigest: null,
    actorSubject: null,
    verifier: 'runtime-admission',
    outcome: 'verified runtime manifest admitted',
    createdAt: input.clock
  });
  return run;
}

export async function planWorkflowRuntimeStep(
  manifestInput: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun
): Promise<WorkflowRuntimePlan> {
  const manifest = parseWorkflowRuntimeManifest(manifestInput);
  await verifyWorkflowRuntimeRun(manifest, run);
  if (run.status === 'retryable_failure') {
    const retryable = run.steps.filter((candidate) => candidate.status === 'retryable_failure');
    if (retryable.length !== 1)
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Retryable failure must identify exactly one recovery step'
      );
    return { type: 'recovery', stepId: retryable[0].id, reason: 'retryable_failure' };
  }
  if (run.status !== 'queued')
    throw new RuntimeValidationError('INVALID_STATE', `Run cannot plan from ${run.status}`);
  const ready = run.steps.filter((candidate) => candidate.status === 'ready');
  if (ready.length !== 1)
    throw new RuntimeValidationError('INVALID_STATE', 'Run must have exactly one ready step');
  const current = definition(manifest, ready[0].id);
  if (current.disposition === 'pass')
    return {
      type: 'pass',
      stepId: current.id,
      capability: structuredClone(current.capability),
      evidenceDigest: current.evidenceDigest
    };
  if (current.disposition === 'wait')
    return { type: 'wait', stepId: current.id, approval: await approval(manifest, run, ready[0]) };
  return { type: 'stop', stepId: current.id, reason: current.reason };
}

export async function reduceWorkflowRuntimeRun(
  manifestInput: WorkflowRuntimeManifest,
  previous: WorkflowRuntimeRun,
  event: WorkflowRuntimeEvent
): Promise<WorkflowRuntimeRun> {
  const manifest = parseWorkflowRuntimeManifest(manifestInput);
  await verifyWorkflowRuntimeRun(manifest, previous);
  const run = structuredClone(previous);
  instant(event.observedAt, 'Runtime event time', 'INVALID_EVENT');
  if (['blocked', 'failed', 'cancelled', 'completed'].includes(run.status))
    throw new RuntimeValidationError('INVALID_STATE', `Run is terminal in ${run.status}`);
  const current = record(run, event.stepId);
  const currentDefinition = definition(manifest, current.id);
  run.version += 1;
  if (event.type === 'effect_intent') {
    if (
      run.status !== 'queued' ||
      current.status !== 'ready' ||
      currentDefinition.disposition !== 'pass' ||
      !same(currentDefinition.capability, event.capability)
    )
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Effect intent requires the exact ready pass step'
      );
    const attemptId = eventText(event.attemptId, 'Attempt ID');
    if (current.attempts.some((candidate) => candidate.id === attemptId))
      throw new RuntimeValidationError('INVALID_EVENT', 'Effect intent attempt already exists');
    current.status = 'running';
    current.version += 1;
    current.attempts.push({
      id: attemptId,
      status: 'prepared',
      capability: structuredClone(currentDefinition.capability),
      createdAt: event.observedAt
    });
    run.status = 'running';
    await receipt(manifest, run, {
      eventType: 'effect_intent',
      stepId: current.id,
      stepVersion: current.version,
      attemptId,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: null,
      verifier: null,
      outcome: 'zero-write effect intent persisted',
      createdAt: event.observedAt
    });
    return run;
  }
  if (event.type === 'step_succeeded') {
    if (
      run.status !== 'running' ||
      current.status !== 'running' ||
      currentDefinition.disposition !== 'pass'
    )
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Step success requires a running pass step'
      );
    const attempt = current.attempts.find((candidate) => candidate.id === event.attemptId);
    if (!attempt || attempt.status !== 'prepared')
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Step success requires its prepared attempt'
      );
    attempt.status = 'succeeded';
    current.status = 'succeeded';
    current.version += 1;
    refreshReady(manifest, run);
    refreshRunStatus(run);
    const completed = run.steps.every((candidate) => candidate.status === 'succeeded');
    const verifier = eventText(event.verifier, 'Verifier');
    await receipt(manifest, run, {
      eventType: 'step_succeeded',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: attempt.id,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: null,
      verifier,
      outcome: 'zero-write step verifier succeeded',
      createdAt: event.observedAt
    });
    if (completed)
      await receipt(manifest, run, {
        eventType: 'run_completed',
        stepId: null,
        stepVersion: null,
        attemptId: null,
        evidenceDigest: null,
        actorSubject: null,
        verifier,
        outcome: 'all runtime steps verified',
        createdAt: event.observedAt
      });
    return run;
  }
  if (event.type === 'attempt_failed') {
    if (
      run.status !== 'running' ||
      current.status !== 'running' ||
      currentDefinition.disposition !== 'pass'
    ) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Attempt failure requires a running pass step'
      );
    }
    const attempt = current.attempts.find((candidate) => candidate.id === event.attemptId);
    if (!attempt || attempt.status !== 'prepared')
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Attempt failure requires its prepared attempt'
      );
    if (event.class !== 'retryable' && event.class !== 'terminal')
      throw new RuntimeValidationError('INVALID_EVENT', 'Attempt failure class is unsupported');
    const verifier = eventText(event.verifier, 'Failure verifier');
    eventDigest(event.failureDigest, 'Failure evidence digest');
    current.version += 1;
    if (event.class === 'retryable') {
      attempt.status = 'retryable_failure';
      current.status = 'retryable_failure';
      run.status = 'retryable_failure';
      await receipt(manifest, run, {
        eventType: 'attempt_failed',
        stepId: current.id,
        stepVersion: current.version,
        attemptId: attempt.id,
        evidenceDigest: currentDefinition.evidenceDigest,
        actorSubject: null,
        verifier,
        outcome: `retryable failure evidence ${event.failureDigest}`,
        createdAt: event.observedAt
      });
      return run;
    }
    attempt.status = 'failed';
    current.status = 'failed';
    run.status = 'failed';
    await receipt(manifest, run, {
      eventType: 'attempt_failed',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: attempt.id,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: null,
      verifier,
      outcome: `terminal failure evidence ${event.failureDigest}`,
      createdAt: event.observedAt
    });
    await receipt(manifest, run, {
      eventType: 'run_failed',
      stepId: null,
      stepVersion: null,
      attemptId: null,
      evidenceDigest: null,
      actorSubject: null,
      verifier,
      outcome: 'terminal failure blocks automatic continuation',
      createdAt: event.observedAt
    });
    return run;
  }
  if (event.type === 'recovery_requested') {
    if (
      run.status !== 'retryable_failure' ||
      current.status !== 'retryable_failure' ||
      currentDefinition.disposition !== 'pass'
    ) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Recovery requires a retryable pass failure'
      );
    }
    current.status = 'ready';
    current.version += 1;
    run.status = 'queued';
    await receipt(manifest, run, {
      eventType: 'recovered',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: null,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: eventText(event.actorSubject, 'Recovery actor subject'),
      verifier: 'manual-fallback',
      outcome: 'manual fallback requeued the failed step',
      createdAt: event.observedAt
    });
    return run;
  }
  if (event.type === 'wait_created') {
    if (
      run.status !== 'queued' ||
      current.status !== 'ready' ||
      currentDefinition.disposition !== 'wait'
    )
      throw new RuntimeValidationError('INVALID_EVENT', 'Approval wait requires a ready wait step');
    const expected = await approval(manifest, { ...run, version: run.version - 1 }, current);
    if (!same(event.approval, expected))
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Approval request does not match the exact waiting step binding'
      );
    if (Date.parse(event.observedAt) >= Date.parse(expected.expiresAt)) {
      throw new RuntimeValidationError('STALE_APPROVAL', 'Approval request is already expired');
    }
    current.status = 'waiting_for_approval';
    current.version += 1;
    current.approval = expected;
    run.status = 'waiting_for_approval';
    await receipt(manifest, run, {
      eventType: 'wait_created',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: null,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: null,
      verifier: 'runtime-policy',
      outcome: 'bound approval request persisted',
      createdAt: event.observedAt
    });
    return run;
  }
  if (event.type === 'approval_decided') {
    if (
      run.status !== 'waiting_for_approval' ||
      current.status !== 'waiting_for_approval' ||
      !current.approval
    )
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Approval decision requires a waiting request'
      );
    const waitReceipt = run.receipts.at(-1);
    if (
      event.approvalId !== current.approval.id ||
      event.approvalBindingSha256 !== current.approval.bindingSha256 ||
      !waitReceipt ||
      waitReceipt.eventType !== 'wait_created' ||
      Date.parse(event.observedAt) < Date.parse(waitReceipt.createdAt) ||
      Date.parse(event.observedAt) >= Date.parse(current.approval.expiresAt)
    )
      throw new RuntimeValidationError(
        'STALE_APPROVAL',
        'Approval decision is stale, mismatched, or expired'
      );
    if (event.decision !== 'approved' && event.decision !== 'rejected') {
      throw new RuntimeValidationError('INVALID_EVENT', 'Approval decision is unsupported');
    }
    const actorSubject = eventText(event.actorSubject, 'Approval actor subject');
    current.version += 1;
    if (event.decision === 'approved') {
      current.status = 'succeeded';
      current.approval = null;
      refreshReady(manifest, run);
      const completesRun = run.steps.every((candidate) => candidate.status === 'succeeded');
      refreshRunStatus(run);
      await receipt(manifest, run, {
        eventType: 'approval_decided',
        stepId: current.id,
        stepVersion: current.version,
        attemptId: null,
        evidenceDigest: currentDefinition.evidenceDigest,
        actorSubject,
        verifier: 'approval-policy',
        outcome: 'exact approval accepted',
        createdAt: event.observedAt
      });
      if (completesRun) {
        await receipt(manifest, run, {
          eventType: 'run_completed',
          stepId: current.id,
          stepVersion: current.version,
          attemptId: null,
          evidenceDigest: currentDefinition.evidenceDigest,
          actorSubject,
          verifier: 'approval-policy',
          outcome: 'all runtime steps reached a verified terminal state',
          createdAt: event.observedAt
        });
      }
      return run;
    }
    current.status = 'blocked';
    current.approval = null;
    run.status = 'blocked';
    await receipt(manifest, run, {
      eventType: 'approval_decided',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: null,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject,
      verifier: 'approval-policy',
      outcome: 'exact approval rejected',
      createdAt: event.observedAt
    });
    await receipt(manifest, run, {
      eventType: 'blocked',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: null,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject,
      verifier: 'approval-policy',
      outcome: 'approval rejection blocks automatic continuation',
      createdAt: event.observedAt
    });
    return run;
  }
  if (event.type === 'stop_requested') {
    if (
      !['queued', 'running', 'waiting_for_approval'].includes(run.status) ||
      !['ready', 'running', 'waiting_for_approval'].includes(current.status)
    )
      throw new RuntimeValidationError('INVALID_EVENT', 'Stop requires an active runtime run');
    const prepared = current.attempts.find((candidate) => candidate.status === 'prepared');
    if (prepared) prepared.status = 'abandoned';
    current.status = 'blocked';
    current.version += 1;
    current.approval = null;
    run.status = 'blocked';
    await receipt(manifest, run, {
      eventType: 'blocked',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: null,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: eventText(event.actorSubject, 'Stop actor subject'),
      verifier: 'operator-stop',
      outcome: eventText(event.reason, 'Stop reason'),
      createdAt: event.observedAt
    });
    return run;
  }
  if (event.type === 'cancellation_requested') {
    if (
      !['queued', 'running', 'waiting_for_approval', 'retryable_failure'].includes(run.status) ||
      !['ready', 'running', 'waiting_for_approval', 'retryable_failure'].includes(current.status)
    ) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Cancellation requires an active runtime step'
      );
    }
    const prepared = current.attempts.find((candidate) => candidate.status === 'prepared');
    if (prepared) prepared.status = 'abandoned';
    current.status = 'cancelled';
    current.version += 1;
    current.approval = null;
    run.status = 'cancelled';
    await receipt(manifest, run, {
      eventType: 'cancelled',
      stepId: current.id,
      stepVersion: current.version,
      attemptId: null,
      evidenceDigest: currentDefinition.evidenceDigest,
      actorSubject: eventText(event.actorSubject, 'Cancellation actor subject'),
      verifier: 'operator-cancel',
      outcome: eventText(event.reason, 'Cancellation reason'),
      createdAt: event.observedAt
    });
    return run;
  }
  throw new RuntimeValidationError('INVALID_EVENT', 'Runtime event is unsupported');
}

export async function workflowRuntimeReceiptHash(
  receipt: Omit<WorkflowRuntimeReceipt, 'receiptSha256'>
): Promise<RuntimeDigest> {
  return hash(receipt);
}

async function assertRunSemantics(
  manifest: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun
): Promise<void> {
  if (
    !isRecord(run) ||
    !exact(run, [
      'activation',
      'artifactManifestSha256',
      'id',
      'receipts',
      'runtimeManifestSha256',
      'schema',
      'status',
      'steps',
      'version'
    ]) ||
    run.schema !== 'workflow_runtime_run.v0.1' ||
    !validText(run.id, 160) ||
    !RUN_STATUSES.includes(run.status) ||
    !Number.isInteger(run.version) ||
    run.version < 1 ||
    !isRecord(run.activation) ||
    !exact(run.activation, ['id', 'policySha256', 'version']) ||
    !validText(run.activation.id, 160) ||
    !Number.isInteger(run.activation.version) ||
    run.activation.version < 1 ||
    !DIGEST.test(run.activation.policySha256) ||
    !DIGEST.test(run.artifactManifestSha256) ||
    !DIGEST.test(run.runtimeManifestSha256) ||
    !Array.isArray(run.steps) ||
    !Array.isArray(run.receipts) ||
    run.steps.length !== manifest.steps.length ||
    run.receipts.length === 0
  ) {
    stateFailure('Runtime checkpoint has an invalid envelope');
  }

  const states = run.steps as unknown as WorkflowRuntimeStepRecord[];
  const receipts = run.receipts as unknown as WorkflowRuntimeReceipt[];
  const stateById = new Map(states.map((state) => [state.id, state]));
  const receiptFor = (
    eventType: WorkflowRuntimeReceiptEventType,
    stepId: string,
    attemptId: string | null,
    evidenceDigest: RuntimeDigest
  ) =>
    receipts.some(
      (receipt) =>
        receipt.eventType === eventType &&
        receipt.stepId === stepId &&
        receipt.attemptId === attemptId &&
        receipt.evidenceDigest === evidenceDigest
    );
  const statusCounts = new Map<string, number>();
  for (const status of STEP_STATUSES) statusCounts.set(status, 0);

  for (const [index, definition] of manifest.steps.entries()) {
    const state = states[index] as unknown;
    if (
      !isRecord(state) ||
      !exact(state, ['approval', 'attempts', 'id', 'status', 'version']) ||
      state.id !== definition.id ||
      !STEP_STATUSES.includes(state.status as string) ||
      typeof state.version !== 'number' ||
      !Number.isInteger(state.version) ||
      state.version < 1 ||
      !Array.isArray(state.attempts)
    ) {
      stateFailure('Runtime checkpoint step state is invalid');
    }
    const typedState = state as unknown as WorkflowRuntimeStepRecord;
    statusCounts.set(typedState.status, (statusCounts.get(typedState.status) ?? 0) + 1);
    if (definition.disposition !== 'pass' && typedState.attempts.length > 0) {
      stateFailure('Only pass runtime steps may retain attempts');
    }
    const attempts = typedState.attempts;
    if (new Set(attempts.map((attempt) => attempt.id)).size !== attempts.length) {
      stateFailure('Runtime checkpoint attempt identifiers must be unique');
    }
    for (const attempt of attempts) {
      if (
        !isRecord(attempt) ||
        !exact(attempt, ['capability', 'createdAt', 'id', 'status']) ||
        !validText(attempt.id, 160) ||
        !ATTEMPT_STATUSES.includes(attempt.status as string) ||
        !validInstant(attempt.createdAt) ||
        definition.disposition !== 'pass' ||
        !same(attempt.capability, definition.capability)
      ) {
        stateFailure('Runtime checkpoint attempt is invalid');
      }
    }
    const prepared = attempts.filter((attempt) => attempt.status === 'prepared');
    if (
      (typedState.status === 'running') !== (prepared.length === 1) ||
      prepared.length > 1 ||
      prepared.some(
        (attempt) =>
          !receiptFor('effect_intent', typedState.id, attempt.id, definition.evidenceDigest)
      )
    ) {
      stateFailure('Runtime checkpoint running state and prepared attempt disagree');
    }
    for (const attempt of attempts) {
      if (
        !receiptFor('effect_intent', typedState.id, attempt.id, definition.evidenceDigest) ||
        (attempt.status === 'succeeded' &&
          !receiptFor('step_succeeded', typedState.id, attempt.id, definition.evidenceDigest)) ||
        (['retryable_failure', 'failed'].includes(attempt.status) &&
          !receiptFor('attempt_failed', typedState.id, attempt.id, definition.evidenceDigest))
      ) {
        stateFailure('Runtime checkpoint attempt is not proven by its receipt history');
      }
    }
    if (
      attempts.some((attempt) => attempt.status === 'succeeded') &&
      typedState.status !== 'succeeded'
    ) {
      stateFailure('Runtime checkpoint cannot requeue a succeeded pass attempt');
    }
    if (attempts.some((attempt) => attempt.status === 'failed') && typedState.status !== 'failed') {
      stateFailure('Runtime checkpoint cannot requeue a terminally failed pass attempt');
    }
    if (
      typedState.status === 'ready' &&
      attempts.some((attempt) => attempt.status === 'retryable_failure')
    ) {
      const recovered = receipts.at(-1);
      if (
        !recovered ||
        recovered.eventType !== 'recovered' ||
        recovered.status !== 'queued' ||
        recovered.runVersion !== run.version ||
        recovered.stepId !== typedState.id ||
        recovered.stepVersion !== typedState.version ||
        recovered.attemptId !== null ||
        recovered.evidenceDigest !== definition.evidenceDigest ||
        recovered.actorSubject === null ||
        recovered.verifier !== 'manual-fallback' ||
        recovered.outcome !== 'manual fallback requeued the failed step'
      ) {
        stateFailure('Runtime checkpoint retry recovery is not bound to its requeued step');
      }
    }
    const abandoned = attempts.filter((attempt) => attempt.status === 'abandoned');
    const terminalEvent =
      run.status === 'blocked' ? 'blocked' : run.status === 'cancelled' ? 'cancelled' : null;
    if (
      abandoned.length > 0 &&
      (terminalEvent === null ||
        typedState.status !== run.status ||
        !receiptFor(terminalEvent, typedState.id, null, definition.evidenceDigest))
    ) {
      stateFailure('Runtime checkpoint abandoned attempt is not bound to its terminal state');
    }
    if (typedState.status === 'succeeded') {
      if (
        definition.disposition === 'stop' ||
        (definition.disposition === 'pass' &&
          !attempts.some(
            (attempt) =>
              attempt.status === 'succeeded' &&
              receiptFor('step_succeeded', typedState.id, attempt.id, definition.evidenceDigest)
          )) ||
        (definition.disposition === 'wait' &&
          !receipts.some(
            (receipt) =>
              receipt.stepId === typedState.id &&
              receipt.eventType === 'approval_decided' &&
              receipt.outcome === 'exact approval accepted'
          ))
      ) {
        stateFailure('Runtime checkpoint success has no matching verified receipt');
      }
    }
    if (
      (typedState.status === 'retryable_failure' &&
        (definition.disposition !== 'pass' ||
          !attempts.some((attempt) => attempt.status === 'retryable_failure'))) ||
      (typedState.status === 'failed' &&
        (definition.disposition !== 'pass' ||
          !attempts.some((attempt) => attempt.status === 'failed')))
    ) {
      stateFailure('Runtime checkpoint failure state and attempt history disagree');
    }
    if (typedState.status === 'waiting_for_approval') {
      const expectedApproval = await approval(
        manifest,
        { ...run, version: run.version - 1 },
        { ...typedState, version: typedState.version - 1 }
      );
      if (
        definition.disposition !== 'wait' ||
        typedState.version < 2 ||
        !isRecord(typedState.approval) ||
        !exact(typedState.approval, ['bindingSha256', 'expiresAt', 'id', 'policyId']) ||
        !validText(typedState.approval.id, 240) ||
        !DIGEST.test(typedState.approval.bindingSha256) ||
        !same(typedState.approval, expectedApproval) ||
        typedState.approval.policyId !== definition.approval.policyId ||
        typedState.approval.expiresAt !== definition.approval.expiresAt ||
        !receiptFor('wait_created', typedState.id, null, definition.evidenceDigest)
      ) {
        stateFailure('Runtime checkpoint approval binding is invalid');
      }
    } else if (typedState.approval !== null) {
      stateFailure('Runtime checkpoint retains approval data outside an approval wait');
    }
    const dependenciesSucceeded = definition.dependsOn.every(
      (dependency) => stateById.get(dependency)?.status === 'succeeded'
    );
    if (
      (typedState.status === 'pending' && dependenciesSucceeded) ||
      ([
        'ready',
        'running',
        'waiting_for_approval',
        'succeeded',
        'retryable_failure',
        'failed'
      ].includes(typedState.status) &&
        !dependenciesSucceeded)
    ) {
      stateFailure('Runtime checkpoint step dependencies and status disagree');
    }
  }

  const count = (status: string) => statusCounts.get(status) ?? 0;
  if (
    (run.status === 'queued' && count('ready') !== 1) ||
    (run.status === 'running' && count('running') !== 1) ||
    (run.status === 'waiting_for_approval' && count('waiting_for_approval') !== 1) ||
    (run.status === 'retryable_failure' && count('retryable_failure') !== 1) ||
    (run.status === 'blocked' && count('blocked') !== 1) ||
    (run.status === 'failed' && count('failed') !== 1) ||
    (run.status === 'cancelled' && count('cancelled') !== 1) ||
    (run.status === 'completed' && count('succeeded') !== states.length)
  ) {
    stateFailure('Runtime checkpoint run and step statuses disagree');
  }

  const receiptFields = [
    'activationId',
    'activationPolicySha256',
    'activationVersion',
    'actorSubject',
    'artifactManifestSha256',
    'attemptId',
    'checkpointSha256',
    'createdAt',
    'definitionHash',
    'evidenceDigest',
    'eventIndex',
    'eventType',
    'id',
    'outcome',
    'previousReceiptSha256',
    'receiptSha256',
    'runId',
    'runVersion',
    'runtimeManifestSha256',
    'schema',
    'status',
    'stepId',
    'stepVersion',
    'verifier',
    'workflowId',
    'workflowVersion'
  ];
  for (const receipt of receipts) {
    if (
      !isRecord(receipt) ||
      !exact(receipt, receiptFields) ||
      receipt.schema !== 'create-something/control-run-receipt@2' ||
      !RECEIPT_EVENTS.includes(receipt.eventType as string) ||
      !RUN_STATUSES.includes(receipt.status as string) ||
      !Number.isInteger(receipt.runVersion) ||
      receipt.runVersion < 1 ||
      !validInstant(receipt.createdAt) ||
      (receipt.stepId !== null && !manifest.steps.some((step) => step.id === receipt.stepId)) ||
      (receipt.stepVersion !== null &&
        (!Number.isInteger(receipt.stepVersion) || receipt.stepVersion < 1)) ||
      (receipt.actorSubject !== null && !validText(receipt.actorSubject)) ||
      (receipt.verifier !== null && !validText(receipt.verifier)) ||
      !validText(receipt.outcome) ||
      !DIGEST.test(receipt.checkpointSha256) ||
      !DIGEST.test(receipt.receiptSha256)
    ) {
      stateFailure('Runtime checkpoint receipt envelope is invalid');
    }
  }
  const first = receipts[0];
  const last = receipts.at(-1)!;
  if (
    first.eventType !== 'run_admitted' ||
    first.status !== 'queued' ||
    first.runVersion !== 1 ||
    first.stepId !== null ||
    last.status !== run.status ||
    last.runVersion !== run.version ||
    (run.status === 'completed' && last.eventType !== 'run_completed') ||
    (run.status === 'failed' && last.eventType !== 'run_failed') ||
    (run.status === 'blocked' && last.eventType !== 'blocked') ||
    (run.status === 'cancelled' && last.eventType !== 'cancelled')
  ) {
    stateFailure('Runtime checkpoint receipt history does not describe its current state');
  }
}

/**
 * Verifies the immutable core state before a host treats a checkpoint as
 * resumable. This does not choose an action or invoke a capability.
 */
export async function verifyWorkflowRuntimeRun(
  manifestInput: WorkflowRuntimeManifest,
  run: WorkflowRuntimeRun
): Promise<void> {
  const manifest = parseWorkflowRuntimeManifest(manifestInput);
  await assertRunSemantics(manifest, run);
  for (const [index, current] of run.receipts.entries()) {
    const { receiptSha256, ...unsigned } = current;
    if (
      current.id !== `receipt:${run.id}:${index + 1}` ||
      current.eventIndex !== index + 1 ||
      current.runId !== run.id ||
      current.workflowId !== manifest.workflow.id ||
      current.workflowVersion !== manifest.workflow.version ||
      current.definitionHash !== manifest.workflow.definitionHash ||
      current.artifactManifestSha256 !== run.artifactManifestSha256 ||
      current.runtimeManifestSha256 !== run.runtimeManifestSha256 ||
      current.activationId !== run.activation.id ||
      current.activationVersion !== run.activation.version ||
      current.activationPolicySha256 !== run.activation.policySha256 ||
      current.previousReceiptSha256 !==
        (index === 0 ? null : run.receipts[index - 1].receiptSha256) ||
      !DIGEST.test(current.checkpointSha256) ||
      receiptSha256 !== (await workflowRuntimeReceiptHash(unsigned))
    ) {
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Runtime checkpoint receipt chain is invalid'
      );
    }
  }
  if (run.receipts.at(-1)?.checkpointSha256 !== (await workflowRuntimeCheckpointHash(run))) {
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Runtime checkpoint state does not match its latest receipt'
    );
  }
}
