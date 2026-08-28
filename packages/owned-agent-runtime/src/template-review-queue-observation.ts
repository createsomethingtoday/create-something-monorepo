import {
  RuntimeValidationError,
  parseWorkflowRuntimeManifest,
  verifyWorkflowRuntimeRun,
  type RuntimeDigest,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimePlan,
  type WorkflowRuntimeRun,
  type WorkflowRuntimeScope
} from '@createsomething/workflow-runtime';
import type { ControlActivationAuthority } from './control.js';

const LIVE_PARENT_STATUSES = "'queued', 'running', 'waiting_for_approval'";
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const FAILURE_CODE = /^[a-z][a-z0-9_]{0,79}$/;
const VERIFIER = /^[a-z][a-z0-9_-]{0,79}$/;

export const TEMPLATE_REVIEW_QUEUE_OBSERVATION_CAPABILITY = 'template-review.queue.observe.v1';
export const TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE = Object.freeze({
  service: 'webflow-template-review-mcp',
  resource: 'template-review-queue',
  tool: 'template_review_list_queue'
} as const);
export const TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS = Object.freeze({
  status: 'ready_to_review',
  assigned: 'any',
  sort: 'submittedDate_desc',
  limit: 5
} as const);

type TemplateReviewQueueObservationPlan = Extract<WorkflowRuntimePlan, { type: 'pass' }>;

export interface TemplateReviewQueueObservationIntent {
  schema: 'create-something/template-review-queue-observation-intent@1';
  runId: string;
  stepId: string;
  attemptId: string;
  capability: TemplateReviewQueueObservationPlan['capability'];
  requestSha256: RuntimeDigest;
  sourceIdempotencyKey: string;
  parameters: typeof TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS;
}

interface TemplateReviewQueueObservationDispatch {
  schema: 'create-something/template-review-queue-observation-dispatch@1';
  runId: string;
  stepId: string;
  attemptId: string;
  capability: TemplateReviewQueueObservationPlan['capability'];
  requestSha256: RuntimeDigest;
  sourceIdempotencyKey: string;
  source: typeof TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE;
  parameters: typeof TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS;
}

export interface TemplateReviewQueueObservationProjection {
  schema: 'create-something/template-review-queue-projection@1';
  dataClassification: 'count_only_redacted';
  attemptId: string;
  requestSha256: RuntimeDigest;
  source: typeof TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE & { invocationSha256: RuntimeDigest };
  parameters: typeof TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS;
  observedItemCount: number;
  responseSha256: RuntimeDigest;
  sourceInvocationEvidenceSha256: RuntimeDigest;
}

export type TemplateReviewQueueObservationVerifierResult =
  | { type: 'verified'; verifier: string; evidenceSha256: RuntimeDigest }
  | { type: 'unverified'; failureCode: string };

export interface TemplateReviewQueueObservationVerifier {
  verify(input: {
    intent: TemplateReviewQueueObservationIntent;
    projection: TemplateReviewQueueObservationProjection;
  }): Promise<TemplateReviewQueueObservationVerifierResult>;
}

export interface TemplateReviewQueueObservationRegistration {
  capabilityParameterDigest: RuntimeDigest;
}

export type TemplateReviewQueueObservationResult =
  | {
      type: 'verified';
      verifier: string;
      evidenceSha256: RuntimeDigest;
      sourceInvocationSha256: RuntimeDigest;
      sourceInvocationEvidenceSha256: RuntimeDigest;
      observedItemCount: number;
      responseSha256: RuntimeDigest;
    }
  | {
      type: 'effect_unknown';
      failureCode: string;
      sourceInvocationSha256: RuntimeDigest;
      sourceInvocationEvidenceSha256: RuntimeDigest;
      observedItemCount: number;
      responseSha256: RuntimeDigest;
    };

export type TemplateReviewQueueObservationPreparation =
  | { type: 'preflight'; intent: TemplateReviewQueueObservationIntent }
  | { type: 'terminal'; result: TemplateReviewQueueObservationResult };

export class TemplateReviewQueueObservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateReviewQueueObservationError';
  }
}

type DispatchRow = {
  run_id: string;
  step_id: string;
  attempt_id: string;
  capability_id: string;
  capability_parameter_sha256: string;
  request_sha256: string;
  source_idempotency_key: string;
  source_service: string;
  source_resource: string;
  source_tool: string;
  status: 'prepared' | 'verified' | 'effect_unknown';
  source_invocation_sha256: string | null;
  response_sha256: string | null;
  observed_item_count: number | null;
  source_invocation_evidence_sha256: string | null;
  verifier: string | null;
  verifier_evidence_sha256: string | null;
  failure_code: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return keys.length === wanted.length && keys.every((key, index) => key === wanted[index]);
}

function text(value: unknown, label: string, maximum = 180): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new TemplateReviewQueueObservationError(`${label} must be a non-empty bounded string`);
  }
  return value.trim();
}

function digest(value: unknown, label: string): RuntimeDigest {
  if (typeof value !== 'string' || !DIGEST.test(value)) {
    throw new TemplateReviewQueueObservationError(`${label} must be a sha256 digest`);
  }
  return value as RuntimeDigest;
}

function failureCode(value: unknown): string {
  const result = text(value, 'Source verifier failure code', 80);
  if (!FAILURE_CODE.test(result)) {
    throw new TemplateReviewQueueObservationError(
      'Source verifier failure code must be a lower_snake_case machine code'
    );
  }
  return result;
}

function verifier(value: unknown): string {
  const result = text(value, 'Source verifier', 80);
  if (!VERIFIER.test(result)) {
    throw new TemplateReviewQueueObservationError(
      'Source verifier must be a lower-case machine identifier'
    );
  }
  return result;
}

function canonicalize(value: unknown, ancestors = new WeakSet<object>()): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TemplateReviewQueueObservationError('Request contains an invalid number');
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry, ancestors));
  if (isRecord(value)) {
    if (ancestors.has(value))
      throw new TemplateReviewQueueObservationError('Request must not contain a cycle');
    ancestors.add(value);
    const result = Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry, ancestors)])
    );
    ancestors.delete(value);
    return result;
  }
  throw new TemplateReviewQueueObservationError('Request must contain JSON data only');
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

async function sha256(value: unknown): Promise<RuntimeDigest> {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalize(value)));
  const output = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(output)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function exactParameters(value: unknown): typeof TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS {
  if (
    !isRecord(value) ||
    !exact(value, ['assigned', 'limit', 'sort', 'status']) ||
    !same(value, TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS)
  ) {
    throw new TemplateReviewQueueObservationError(
      'Projection does not preserve the fixed queue-selection parameters'
    );
  }
  return TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS;
}

function projection(value: unknown): TemplateReviewQueueObservationProjection {
  if (
    !isRecord(value) ||
    !exact(value, [
      'attemptId',
      'dataClassification',
      'observedItemCount',
      'parameters',
      'requestSha256',
      'responseSha256',
      'schema',
      'source',
      'sourceInvocationEvidenceSha256'
    ]) ||
    value.schema !== 'create-something/template-review-queue-projection@1' ||
    value.dataClassification !== 'count_only_redacted' ||
    !isRecord(value.source) ||
    !exact(value.source, ['invocationSha256', 'resource', 'service', 'tool']) ||
    value.source.service !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE.service ||
    value.source.resource !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE.resource ||
    value.source.tool !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE.tool ||
    !Number.isInteger(value.observedItemCount) ||
    (value.observedItemCount as number) < 0 ||
    (value.observedItemCount as number) > TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS.limit
  ) {
    throw new TemplateReviewQueueObservationError(
      'Projection must use the exact count-only schema'
    );
  }
  return {
    schema: 'create-something/template-review-queue-projection@1',
    dataClassification: 'count_only_redacted',
    attemptId: text(value.attemptId, 'Projection attempt ID'),
    requestSha256: digest(value.requestSha256, 'Projection request digest'),
    source: {
      ...TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE,
      invocationSha256: digest(value.source.invocationSha256, 'Source invocation digest')
    },
    parameters: exactParameters(value.parameters),
    observedItemCount: value.observedItemCount as number,
    responseSha256: digest(value.responseSha256, 'Projection response digest'),
    sourceInvocationEvidenceSha256: digest(
      value.sourceInvocationEvidenceSha256,
      'Source invocation evidence digest'
    )
  };
}

function sourceIdempotencyKey(requestSha256: RuntimeDigest): string {
  return `template-review-observation:${requestSha256.slice('sha256:'.length)}`;
}

function rowDispatch(row: DispatchRow): TemplateReviewQueueObservationDispatch {
  if (
    !DIGEST.test(row.capability_parameter_sha256) ||
    !DIGEST.test(row.request_sha256) ||
    row.source_service !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE.service ||
    row.source_resource !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE.resource ||
    row.source_tool !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE.tool
  ) {
    throw new TemplateReviewQueueObservationError('Stored observation dispatch is invalid');
  }
  return {
    schema: 'create-something/template-review-queue-observation-dispatch@1',
    runId: row.run_id,
    stepId: row.step_id,
    attemptId: row.attempt_id,
    capability: {
      id: row.capability_id,
      parameterDigest: row.capability_parameter_sha256 as RuntimeDigest
    },
    requestSha256: row.request_sha256 as RuntimeDigest,
    sourceIdempotencyKey: row.source_idempotency_key,
    source: TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE,
    parameters: TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS
  };
}

function intentFor(
  dispatch: TemplateReviewQueueObservationDispatch
): TemplateReviewQueueObservationIntent {
  return {
    schema: 'create-something/template-review-queue-observation-intent@1',
    runId: dispatch.runId,
    stepId: dispatch.stepId,
    attemptId: dispatch.attemptId,
    capability: structuredClone(dispatch.capability),
    requestSha256: dispatch.requestSha256,
    sourceIdempotencyKey: dispatch.sourceIdempotencyKey,
    parameters: TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS
  };
}

function sameIntent(
  left: TemplateReviewQueueObservationIntent,
  right: TemplateReviewQueueObservationIntent
): boolean {
  return same(left, right);
}

function sameDispatch(
  left: TemplateReviewQueueObservationDispatch,
  right: TemplateReviewQueueObservationDispatch
): boolean {
  return same(left, right);
}

function storedProjectionEvidence(row: DispatchRow) {
  if (
    row.observed_item_count === null ||
    !row.source_invocation_sha256 ||
    !row.response_sha256 ||
    !row.source_invocation_evidence_sha256
  ) {
    throw new TemplateReviewQueueObservationError(
      'Observation dispatch lacks count-only projection evidence'
    );
  }
  return {
    sourceInvocationSha256: digest(row.source_invocation_sha256, 'Stored source invocation digest'),
    sourceInvocationEvidenceSha256: digest(
      row.source_invocation_evidence_sha256,
      'Stored source invocation evidence digest'
    ),
    observedItemCount: row.observed_item_count,
    responseSha256: digest(row.response_sha256, 'Stored response digest')
  };
}

function storedResult(row: DispatchRow): TemplateReviewQueueObservationResult {
  const projectionEvidence = storedProjectionEvidence(row);
  if (row.status === 'effect_unknown') {
    if (!row.failure_code)
      throw new TemplateReviewQueueObservationError(
        'Stored ambiguous dispatch lacks a failure code'
      );
    return {
      type: 'effect_unknown',
      failureCode: failureCode(row.failure_code),
      ...projectionEvidence
    };
  }
  if (row.status !== 'verified' || !row.verifier || !row.verifier_evidence_sha256) {
    throw new TemplateReviewQueueObservationError('Observation dispatch has no verifier result');
  }
  return {
    type: 'verified',
    verifier: verifier(row.verifier),
    evidenceSha256: digest(row.verifier_evidence_sha256, 'Stored verifier evidence digest'),
    ...projectionEvidence
  };
}

function sameProjection(
  row: DispatchRow,
  value: TemplateReviewQueueObservationProjection
): boolean {
  return (
    row.source_invocation_sha256 === value.source.invocationSha256 &&
    row.response_sha256 === value.responseSha256 &&
    row.observed_item_count === value.observedItemCount &&
    row.source_invocation_evidence_sha256 === value.sourceInvocationEvidenceSha256
  );
}

function verifierResult(
  value: TemplateReviewQueueObservationVerifierResult
): TemplateReviewQueueObservationVerifierResult {
  if (value.type === 'verified') {
    return {
      type: 'verified',
      verifier: verifier(value.verifier),
      evidenceSha256: digest(value.evidenceSha256, 'Source verifier evidence digest')
    };
  }
  if (value.type === 'unverified') {
    return {
      type: 'unverified',
      failureCode: failureCode(value.failureCode)
    };
  }
  throw new TemplateReviewQueueObservationError('Source verifier returned an unsupported result');
}

/**
 * A Control-host seam for the proposed A3 candidate. The seam never calls a
 * source system: a source owner must provide a count-only projection after the
 * returned non-actionable intent was durably prepared. The next host layer may transition
 * the zero-write runtime only after this class returns `verified`.
 */
export class D1TemplateReviewQueueObservationAdapter {
  constructor(
    private readonly database: D1Database,
    private readonly verifier: TemplateReviewQueueObservationVerifier,
    private readonly registration: TemplateReviewQueueObservationRegistration,
    private readonly activations: ControlActivationAuthority,
    private readonly clock: () => string = () => new Date().toISOString()
  ) {}

  async prepare(input: {
    scope: WorkflowRuntimeScope;
    manifest: WorkflowRuntimeManifest;
    run: WorkflowRuntimeRun;
    plan: WorkflowRuntimePlan;
    attemptId: string;
  }): Promise<TemplateReviewQueueObservationPreparation> {
    const manifest = parseWorkflowRuntimeManifest(input.manifest);
    await verifyWorkflowRuntimeRun(manifest, input.run);
    if (input.plan.type !== 'pass') {
      throw new TemplateReviewQueueObservationError('Observation dispatch requires a pass plan');
    }
    const plan = input.plan;
    const registeredParameterDigest = digest(
      this.registration.capabilityParameterDigest,
      'Registered observation capability parameter digest'
    );
    const attemptId = text(input.attemptId, 'Control attempt ID');
    const definition = manifest.steps.find((candidate) => candidate.id === plan.stepId);
    const step = input.run.steps.find((candidate) => candidate.id === plan.stepId);
    const attempt = step?.attempts.find((candidate) => candidate.id === attemptId);
    if (
      plan.capability.id !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_CAPABILITY ||
      plan.capability.parameterDigest !== registeredParameterDigest ||
      !definition ||
      definition.disposition !== 'pass' ||
      !same(definition.capability, plan.capability) ||
      definition.evidenceDigest !== plan.evidenceDigest ||
      input.run.status !== 'running' ||
      step?.status !== 'running' ||
      !attempt ||
      attempt.status !== 'prepared' ||
      !same(attempt.capability, plan.capability) ||
      !input.run.receipts.some(
        (receipt) =>
          receipt.eventType === 'effect_intent' &&
          receipt.stepId === plan.stepId &&
          receipt.attemptId === attemptId &&
          receipt.evidenceDigest === plan.evidenceDigest
      )
    ) {
      throw new TemplateReviewQueueObservationError(
        'Observation dispatch requires the exact prepared pass attempt and effect-intent receipt'
      );
    }
    const requestSha256 = await sha256({
      schema: 'create-something/template-review-queue-observation-request@1',
      scope: input.scope,
      run: {
        id: input.run.id,
        version: input.run.version,
        activation: input.run.activation,
        stepId: plan.stepId,
        stepVersion: step.version,
        attemptId,
        capability: plan.capability
      },
      source: TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE,
      parameters: TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS
    });
    const dispatch: TemplateReviewQueueObservationDispatch = {
      schema: 'create-something/template-review-queue-observation-dispatch@1',
      runId: input.run.id,
      stepId: plan.stepId,
      attemptId,
      capability: structuredClone(plan.capability),
      requestSha256,
      sourceIdempotencyKey: sourceIdempotencyKey(requestSha256),
      source: TEMPLATE_REVIEW_QUEUE_OBSERVATION_SOURCE,
      parameters: TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS
    };
    const existing = await this.find(input.scope, dispatch);
    if (existing) {
      const replay = rowDispatch(existing);
      if (!sameDispatch(replay, dispatch)) {
        throw new TemplateReviewQueueObservationError(
          'Control attempt already has a different dispatch identity'
        );
      }
      if (existing.status !== 'prepared') {
        return { type: 'terminal', result: storedResult(existing) };
      }
      await this.assertPreparedDispatchAuthorized(
        input.scope,
        input.run,
        plan.stepId,
        step.version,
        attemptId
      );
      return { type: 'preflight', intent: intentFor(replay) };
    }
    await this.assertPreparedDispatchAuthorized(
      input.scope,
      input.run,
      plan.stepId,
      step.version,
      attemptId
    );

    const createdAt = text(this.clock(), 'Observation dispatch clock');
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO control_workflow_runtime_dispatches
            (run_id, step_id, attempt_id, capability_id, capability_parameter_sha256,
             request_sha256, source_idempotency_key, source_service, source_resource,
             source_tool, status, created_at, updated_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'prepared', ?11, ?11
           WHERE EXISTS (
             SELECT 1
             FROM control_workflow_runtime_runs runtime
             JOIN control_runs parent ON parent.id = runtime.run_id
             JOIN control_workflow_runtime_steps step
               ON step.run_id = runtime.run_id AND step.step_id = ?2
             JOIN control_workflow_runtime_attempts attempt
               ON attempt.run_id = runtime.run_id AND attempt.step_id = step.step_id AND attempt.attempt_id = ?3
             WHERE runtime.run_id = ?1 AND runtime.version = ?12 AND runtime.run_json = ?13
               AND parent.account_id = ?14 AND parent.tenant_id = ?15 AND parent.workspace_account_id = ?16
               AND parent.status IN (${LIVE_PARENT_STATUSES})
               AND step.status = 'running' AND step.version = ?17 AND attempt.status = 'prepared'
           )
           ON CONFLICT(run_id, step_id, attempt_id) DO NOTHING`
        )
        .bind(
          dispatch.runId,
          dispatch.stepId,
          dispatch.attemptId,
          dispatch.capability.id,
          dispatch.capability.parameterDigest,
          dispatch.requestSha256,
          dispatch.sourceIdempotencyKey,
          dispatch.source.service,
          dispatch.source.resource,
          dispatch.source.tool,
          createdAt,
          input.run.version,
          JSON.stringify(input.run),
          input.scope.accountId,
          input.scope.tenantId,
          input.scope.workspaceAccountId,
          step.version
        )
    ]);
    const persisted = await this.find(input.scope, dispatch);
    if (!persisted) {
      throw new TemplateReviewQueueObservationError(
        'Parent Control run no longer authorizes this prepared observation dispatch'
      );
    }
    const stored = rowDispatch(persisted);
    if (!sameDispatch(stored, dispatch)) {
      throw new TemplateReviewQueueObservationError(
        'Control attempt already has a different dispatch identity'
      );
    }
    return { type: 'preflight', intent: intentFor(stored) };
  }

  async recordProjection(input: {
    scope: WorkflowRuntimeScope;
    dispatch: TemplateReviewQueueObservationIntent;
    projection: unknown;
  }): Promise<TemplateReviewQueueObservationResult> {
    const expected = input.dispatch;
    const value = projection(input.projection);
    const stored = await this.find(input.scope, expected);
    if (!stored || !sameIntent(intentFor(rowDispatch(stored)), expected)) {
      throw new TemplateReviewQueueObservationError(
        'Observation dispatch is not available in this Control scope'
      );
    }
    if (value.attemptId !== expected.attemptId || value.requestSha256 !== expected.requestSha256) {
      throw new TemplateReviewQueueObservationError(
        'Projection is not bound to the prepared Control attempt'
      );
    }
    if (stored.status !== 'prepared') {
      if (!sameProjection(stored, value)) {
        throw new TemplateReviewQueueObservationError(
          'Projection conflicts with the durable observation result for this Control attempt'
        );
      }
      return storedResult(stored);
    }
    if (!(await this.parentAuthorizes(input.scope, expected.runId))) {
      throw new TemplateReviewQueueObservationError(
        'Parent Control run no longer authorizes this source projection'
      );
    }

    let verification: TemplateReviewQueueObservationVerifierResult;
    try {
      verification = verifierResult(
        await this.verifier.verify({ intent: expected, projection: value })
      );
    } catch {
      verification = { type: 'unverified', failureCode: 'source_verifier_unavailable' };
    }
    const updatedAt = text(this.clock(), 'Observation verification clock');
    if (verification.type === 'unverified') {
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE control_workflow_runtime_dispatches
             SET status = 'effect_unknown', source_invocation_sha256 = ?1, response_sha256 = ?2,
                 observed_item_count = ?3, source_invocation_evidence_sha256 = ?4,
                 failure_code = ?5, updated_at = ?6
             WHERE run_id = ?7 AND step_id = ?8 AND attempt_id = ?9 AND status = 'prepared'`
          )
          .bind(
            value.source.invocationSha256,
            value.responseSha256,
            value.observedItemCount,
            value.sourceInvocationEvidenceSha256,
            verification.failureCode,
            updatedAt,
            expected.runId,
            expected.stepId,
            expected.attemptId
          )
      ]);
    } else {
      await this.database.batch([
        this.database
          .prepare(
            `UPDATE control_workflow_runtime_dispatches
             SET status = 'verified', source_invocation_sha256 = ?1, response_sha256 = ?2,
                 observed_item_count = ?3, source_invocation_evidence_sha256 = ?4,
                 verifier = ?5, verifier_evidence_sha256 = ?6, updated_at = ?7
             WHERE run_id = ?8 AND step_id = ?9 AND attempt_id = ?10 AND status = 'prepared'`
          )
          .bind(
            value.source.invocationSha256,
            value.responseSha256,
            value.observedItemCount,
            value.sourceInvocationEvidenceSha256,
            verification.verifier,
            verification.evidenceSha256,
            updatedAt,
            expected.runId,
            expected.stepId,
            expected.attemptId
          )
      ]);
    }
    const persisted = await this.find(input.scope, expected);
    if (!persisted || persisted.status === 'prepared') {
      throw new TemplateReviewQueueObservationError(
        'Parent Control run no longer authorizes this source projection'
      );
    }
    if (!sameProjection(persisted, value)) {
      throw new TemplateReviewQueueObservationError(
        'Projection conflicts with the durable observation result for this Control attempt'
      );
    }
    return storedResult(persisted);
  }

  private async find(
    scope: WorkflowRuntimeScope,
    intent: Pick<TemplateReviewQueueObservationIntent, 'runId' | 'stepId' | 'attemptId'>
  ): Promise<DispatchRow | null> {
    return this.database
      .prepare(
        `SELECT dispatch.run_id, dispatch.step_id, dispatch.attempt_id, dispatch.capability_id,
                dispatch.capability_parameter_sha256, dispatch.request_sha256,
                dispatch.source_idempotency_key, dispatch.source_service, dispatch.source_resource,
                dispatch.source_tool, dispatch.status, dispatch.source_invocation_sha256,
                dispatch.response_sha256, dispatch.observed_item_count,
                dispatch.source_invocation_evidence_sha256, dispatch.verifier,
                dispatch.verifier_evidence_sha256, dispatch.failure_code
         FROM control_workflow_runtime_dispatches dispatch
         JOIN control_runs parent ON parent.id = dispatch.run_id
         WHERE dispatch.run_id = ?1 AND dispatch.step_id = ?2 AND dispatch.attempt_id = ?3
           AND parent.account_id = ?4 AND parent.tenant_id = ?5 AND parent.workspace_account_id = ?6`
      )
      .bind(
        intent.runId,
        intent.stepId,
        intent.attemptId,
        scope.accountId,
        scope.tenantId,
        scope.workspaceAccountId
      )
      .first<DispatchRow>();
  }

  private async assertPreparedDispatchAuthorized(
    scope: WorkflowRuntimeScope,
    run: WorkflowRuntimeRun,
    stepId: string,
    stepVersion: number,
    attemptId: string
  ): Promise<void> {
    const activation = await this.activations.findActive(scope, run.activation.id);
    if (!activation || activation.activationVersion !== run.activation.version) {
      throw new TemplateReviewQueueObservationError(
        'Frozen Agency activation no longer authorizes this source observation dispatch'
      );
    }
    const row = await this.database
      .prepare(
        `SELECT runtime.run_id
         FROM control_workflow_runtime_runs runtime
         JOIN control_runs parent ON parent.id = runtime.run_id
         JOIN control_workflow_runtime_steps step
           ON step.run_id = runtime.run_id AND step.step_id = ?7
         JOIN control_workflow_runtime_attempts attempt
           ON attempt.run_id = runtime.run_id AND attempt.step_id = step.step_id AND attempt.attempt_id = ?9
         WHERE runtime.run_id = ?1 AND parent.account_id = ?2 AND parent.tenant_id = ?3
           AND parent.workspace_account_id = ?4 AND parent.activation_id = ?5
           AND parent.activation_version = ?6 AND parent.status IN (${LIVE_PARENT_STATUSES})
           AND runtime.status = 'running' AND runtime.version = ?8
           AND step.status = 'running' AND step.version = ?10 AND attempt.status = 'prepared'`
      )
      .bind(
        run.id,
        scope.accountId,
        scope.tenantId,
        scope.workspaceAccountId,
        run.activation.id,
        run.activation.version,
        stepId,
        run.version,
        attemptId,
        stepVersion
      )
      .first<{ run_id: string }>();
    if (!row) {
      throw new TemplateReviewQueueObservationError(
        'Current Workflow Runtime attempt no longer authorizes this source observation dispatch'
      );
    }
  }

  private async parentAuthorizes(scope: WorkflowRuntimeScope, runId: string): Promise<boolean> {
    const row = await this.database
      .prepare(
        `SELECT id FROM control_runs
         WHERE id = ?1 AND account_id = ?2 AND tenant_id = ?3 AND workspace_account_id = ?4
           AND status IN (${LIVE_PARENT_STATUSES})`
      )
      .bind(runId, scope.accountId, scope.tenantId, scope.workspaceAccountId)
      .first<{ id: string }>();
    return Boolean(row);
  }
}

export function assertTemplateReviewQueueObservationProjection(
  value: unknown
): TemplateReviewQueueObservationProjection {
  return projection(value);
}

export function assertTemplateReviewQueueObservationIntent(
  value: TemplateReviewQueueObservationIntent
): TemplateReviewQueueObservationIntent {
  if (
    value.schema !== 'create-something/template-review-queue-observation-intent@1' ||
    value.capability.id !== TEMPLATE_REVIEW_QUEUE_OBSERVATION_CAPABILITY ||
    !DIGEST.test(value.capability.parameterDigest) ||
    !DIGEST.test(value.requestSha256) ||
    !same(value.parameters, TEMPLATE_REVIEW_QUEUE_OBSERVATION_PARAMETERS) ||
    value.sourceIdempotencyKey !== sourceIdempotencyKey(value.requestSha256)
  ) {
    throw new RuntimeValidationError(
      'INVALID_EVENT',
      'Template Review observation intent is invalid'
    );
  }
  return structuredClone(value);
}
