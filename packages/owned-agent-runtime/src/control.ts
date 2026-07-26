export const CONTROL_RUN_STATUSES = Object.freeze([
  'queued',
  'running',
  'waiting_for_approval',
  'stopped',
  'cancelled',
  'failed',
  'fallback_required',
  'recovering',
  'recovered',
  'completed',
  'terminated'
] as const);

export type ControlRunStatus = (typeof CONTROL_RUN_STATUSES)[number];
export type ControlActorRole = 'account_owner' | 'agency_operator' | 'account_reader' | 'control_scheduler';

export interface ControlScope {
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
}

export interface ControlActor {
  subject: string;
  role: ControlActorRole;
}

export interface FrozenControlActivation extends ControlScope {
  id: string;
  activationVersion: number;
  activationKind: 'initial' | 'supersession' | 'rollback';
  status: 'active';
  mapId: string;
  mapVersionId: string;
  mapVersion: number;
  mapCanvasSha256: string;
  handoffId: string;
  handoffReceiptSha256: string;
  buildReleaseId: string;
  buildManifestSha256: string;
  buildArtifactSetSha256: string;
  buildAcceptanceReceiptId: string;
  buildAcceptanceReceiptSha256: string;
  policyVersion: string;
  policySha256: string;
  contractSha256: string;
  entitlementSnapshotSha256: string;
  allowedTools: string[];
  allowedResources: string[];
}

export interface ControlRunReceipt {
  schema: 'create-something/control-run-receipt@1';
  id: string;
  runId: string;
  eventIndex: number;
  status: ControlRunStatus;
  activationId: string;
  activationVersion: number;
  activationKind: FrozenControlActivation['activationKind'];
  mapId: string;
  mapVersionId: string;
  mapVersion: number;
  mapCanvasSha256: string;
  handoffId: string;
  handoffReceiptSha256: string;
  buildReleaseId: string;
  buildManifestSha256: string;
  buildArtifactSetSha256: string;
  buildAcceptanceReceiptId: string;
  buildAcceptanceReceiptSha256: string;
  policyVersion: string;
  policySha256: string;
  contractSha256: string;
  entitlementSnapshotSha256: string;
  actorSubject: string;
  actorRole: ControlActorRole;
  verifier: string;
  outcome: string;
  recovery: string | null;
  previousReceiptSha256: string | null;
  receiptSha256: string;
  createdAt: string;
}

export interface ControlRunRecord extends ControlScope {
  id: string;
  activation: FrozenControlActivation;
  status: ControlRunStatus;
  version: number;
  attempt: number;
  concurrencyKey: string;
  requestedTools: string[];
  requestedResources: string[];
  pendingApprovalKind: string | null;
  recovery: string | null;
  lastError: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  receipts: ControlRunReceipt[];
}

export type ControlRunExecutorOutcome =
  | { type: 'completed'; outcome: string; verifier: string }
  | { type: 'waiting_for_approval'; reason: string; approvalKind: string }
  | { type: 'dependency_failed'; reason: string; fallback: string }
  | { type: 'failed'; reason: string; retryable: boolean };

export interface ControlRunExecutor {
  supports(activation: FrozenControlActivation): boolean;
  execute(input: {
    run: ControlRunRecord;
    activation: FrozenControlActivation;
    allowedTools: readonly string[];
    allowedResources: readonly string[];
  }): Promise<ControlRunExecutorOutcome>;
}

export interface ControlActivationAuthority {
  findActive(scope: ControlScope, activationId: string): Promise<FrozenControlActivation | undefined>;
}

type ApplyCommandInput = {
  scope: ControlScope;
  idempotencyKey: string;
  commandSha256: string;
  expectedVersion: number | null;
  run: ControlRunRecord;
};

export interface ControlRunRepository {
  find(scope: ControlScope, runId: string): Promise<ControlRunRecord | undefined>;
  replay(
    scope: ControlScope,
    idempotencyKey: string,
    commandSha256: string
  ): Promise<ControlRunRecord | undefined>;
  apply(input: ApplyCommandInput): Promise<{ run: ControlRunRecord; applied: boolean }>;
}

type StoredCommand = {
  commandSha256: string;
  result: ControlRunRecord;
};

function cloneRun(run: ControlRunRecord): ControlRunRecord {
  return structuredClone(run);
}

function scopeKey(scope: ControlScope): string {
  return `${scope.accountId}\u0000${scope.tenantId}\u0000${scope.workspaceAccountId}`;
}

function sameScope(left: ControlScope, right: ControlScope): boolean {
  return (
    left.accountId === right.accountId &&
    left.tenantId === right.tenantId &&
    left.workspaceAccountId === right.workspaceAccountId
  );
}

const CONCURRENCY_HOLDING_STATUSES = new Set<ControlRunStatus>([
  'queued',
  'running',
  'waiting_for_approval',
  'recovering'
]);

export class MemoryControlRunRepository implements ControlRunRepository {
  private readonly runs = new Map<string, ControlRunRecord>();
  private readonly commands = new Map<string, StoredCommand>();

  async find(scope: ControlScope, runId: string): Promise<ControlRunRecord | undefined> {
    const run = this.runs.get(runId);
    return run && sameScope(scope, run) ? cloneRun(run) : undefined;
  }

  async replay(scope: ControlScope, idempotencyKey: string, commandSha256: string) {
    const stored = this.commands.get(`${scopeKey(scope)}\u0000${idempotencyKey}`);
    if (!stored) return undefined;
    if (stored.commandSha256 !== commandSha256) {
      throw new ControlRunConflictError('Idempotency key was already used for another command');
    }
    const current = stored.result.status === 'running' ? this.runs.get(stored.result.id) : undefined;
    return cloneRun(current && sameScope(scope, current) ? current : stored.result);
  }

  async apply(input: ApplyCommandInput) {
    const commandKey = `${scopeKey(input.scope)}\u0000${input.idempotencyKey}`;
    const replay = this.commands.get(commandKey);
    if (replay) {
      if (replay.commandSha256 !== input.commandSha256) {
        throw new ControlRunConflictError('Idempotency key was already used for another command');
      }
      const current = replay.result.status === 'running' ? this.runs.get(replay.result.id) : undefined;
      return {
        run: cloneRun(current && sameScope(input.scope, current) ? current : replay.result),
        applied: false
      };
    }

    const current = this.runs.get(input.run.id);
    if (input.expectedVersion === null) {
      if (current) throw new ControlRunConflictError('Run ID already exists');
    } else if (!current || current.version !== input.expectedVersion || !sameScope(current, input.scope)) {
      throw new ControlRunConflictError('Run changed concurrently');
    }
    if (CONCURRENCY_HOLDING_STATUSES.has(input.run.status)) {
      const collision = [...this.runs.values()].find(
        (candidate) =>
          candidate.id !== input.run.id &&
          sameScope(candidate, input.scope) &&
          candidate.concurrencyKey === input.run.concurrencyKey &&
          CONCURRENCY_HOLDING_STATUSES.has(candidate.status)
      );
      if (collision) throw new ControlRunConflictError('Concurrency key already has an active run');
    }

    const stored = cloneRun(input.run);
    this.runs.set(stored.id, stored);
    this.commands.set(commandKey, { commandSha256: input.commandSha256, result: cloneRun(stored) });
    return { run: cloneRun(stored), applied: true };
  }
}

export class ControlRunAccessError extends Error {
  readonly code = 'control_run_not_found';
  constructor(message = 'Control run was not found in this tenant scope') {
    super(message);
    this.name = 'ControlRunAccessError';
  }
}

export class ControlRunConflictError extends Error {
  readonly code = 'control_run_conflict';
  constructor(message: string) {
    super(message);
    this.name = 'ControlRunConflictError';
  }
}

export class ControlRunPolicyError extends Error {
  readonly code = 'control_run_policy_denied';
  constructor(message: string) {
    super(message);
    this.name = 'ControlRunPolicyError';
  }
}

export class ControlRunValidationError extends Error {
  readonly code = 'control_run_invalid';
  constructor(message: string) {
    super(message);
    this.name = 'ControlRunValidationError';
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function text(value: string, label: string, max = 240): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new ControlRunValidationError(`${label} is required`);
  if (normalized.length > max) throw new ControlRunValidationError(`${label} is too long`);
  return normalized;
}

function normalizeIdempotencyKey(value: string, internal = false): string {
  const normalized = text(value, 'Idempotency key', 180);
  if (!internal && normalized.startsWith('__control_internal__')) {
    throw new ControlRunValidationError('Idempotency key uses a reserved runtime prefix');
  }
  return normalized;
}

function normalizedSet(values: string[], label: string): string[] {
  if (!Array.isArray(values)) throw new ControlRunValidationError(`${label} must be an array`);
  return [...new Set(values.map((value) => text(value, label, 300)))].sort();
}

function requireWriteActor(actor: ControlActor): void {
  text(actor.subject, 'Actor subject');
  if (actor.role !== 'account_owner' && actor.role !== 'agency_operator') {
    throw new ControlRunAccessError('Control run mutation requires account owner or agency operator');
  }
}

function requireScheduler(actor: ControlActor): void {
  text(actor.subject, 'Actor subject');
  if (actor.role !== 'control_scheduler') {
    throw new ControlRunAccessError('Control run processing requires the scheduler role');
  }
}

function assertPolicySubset(requested: string[], allowed: string[], label: string): void {
  const allowedSet = new Set(allowed);
  const denied = requested.find((value) => !allowedSet.has(value));
  if (denied) throw new ControlRunPolicyError(`${label} is not allowed by the frozen activation: ${denied}`);
}

export function createControlRunService(options: {
  repository: ControlRunRepository;
  activations: ControlActivationAuthority;
  executor?: ControlRunExecutor;
  id?: () => string;
  clock?: () => Date;
  maxAttempts?: number;
}) {
  const newId = options.id ?? (() => crypto.randomUUID());
  const clock = options.clock ?? (() => new Date());
  const maxAttempts = options.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
    throw new ControlRunValidationError('Maximum attempts must be an integer from 1 through 20');
  }

  async function appendReceipt(
    run: ControlRunRecord,
    actor: ControlActor,
    status: ControlRunStatus,
    input: { outcome: string; verifier: string; recovery?: string | null }
  ): Promise<void> {
    const activation = run.activation;
    const previous = run.receipts.at(-1)?.receiptSha256 ?? null;
    const unsigned = {
      schema: 'create-something/control-run-receipt@1' as const,
      id: newId(),
      runId: run.id,
      eventIndex: run.receipts.length + 1,
      status,
      activationId: activation.id,
      activationVersion: activation.activationVersion,
      activationKind: activation.activationKind,
      mapId: activation.mapId,
      mapVersionId: activation.mapVersionId,
      mapVersion: activation.mapVersion,
      mapCanvasSha256: activation.mapCanvasSha256,
      handoffId: activation.handoffId,
      handoffReceiptSha256: activation.handoffReceiptSha256,
      buildReleaseId: activation.buildReleaseId,
      buildManifestSha256: activation.buildManifestSha256,
      buildArtifactSetSha256: activation.buildArtifactSetSha256,
      buildAcceptanceReceiptId: activation.buildAcceptanceReceiptId,
      buildAcceptanceReceiptSha256: activation.buildAcceptanceReceiptSha256,
      policyVersion: activation.policyVersion,
      policySha256: activation.policySha256,
      contractSha256: activation.contractSha256,
      entitlementSnapshotSha256: activation.entitlementSnapshotSha256,
      actorSubject: actor.subject,
      actorRole: actor.role,
      verifier: text(input.verifier, 'Verifier'),
      outcome: text(input.outcome, 'Outcome', 1000),
      recovery: input.recovery ?? run.recovery,
      previousReceiptSha256: previous,
      createdAt: clock().toISOString()
    };
    run.receipts.push({ ...unsigned, receiptSha256: await sha256(canonicalJson(unsigned)) });
  }

  async function activeActivation(scope: ControlScope, activationId: string) {
    const activation = await options.activations.findActive(scope, text(activationId, 'Activation ID'));
    if (!activation || !sameScope(scope, activation)) throw new ControlRunAccessError();
    return structuredClone(activation);
  }

  async function existing(scope: ControlScope, runId: string): Promise<ControlRunRecord> {
    const run = await options.repository.find(scope, text(runId, 'Run ID'));
    if (!run) throw new ControlRunAccessError();
    return run;
  }

  async function apply(
    scope: ControlScope,
    idempotencyKey: string,
    operation: string,
    expectedVersion: number | null,
    run: ControlRunRecord,
    command: unknown,
    internal = false
  ) {
    const key = normalizeIdempotencyKey(idempotencyKey, internal);
    const commandSha256 = await commandDigest(scope, key, operation, command);
    return (
      await options.repository.apply({
        scope,
        idempotencyKey: key,
        commandSha256,
        expectedVersion,
        run
      })
    ).run;
  }

  async function commandDigest(
    scope: ControlScope,
    idempotencyKey: string,
    operation: string,
    command: unknown
  ) {
    return sha256(canonicalJson({ operation, scope, key: idempotencyKey, command }));
  }

  async function replay(
    scope: ControlScope,
    idempotencyKey: string,
    operation: string,
    command: unknown
  ) {
    const key = normalizeIdempotencyKey(idempotencyKey);
    return options.repository.replay(
      scope,
      key,
      await commandDigest(scope, key, operation, command)
    );
  }

  async function transition(input: {
    scope: ControlScope;
    actor: ControlActor;
    runId: string;
    idempotencyKey: string;
    operation: string;
    allowedFrom: ControlRunStatus[];
    status: ControlRunStatus;
    outcome: string;
    verifier?: string;
    command?: unknown;
    mutate?: (run: ControlRunRecord) => void;
  }) {
    requireWriteActor(input.actor);
    const normalizedRunId = text(input.runId, 'Run ID');
    const command = { runId: normalizedRunId, input: input.command ?? {} };
    const replayed = await replay(
      input.scope,
      input.idempotencyKey,
      input.operation,
      command
    );
    if (replayed) return replayed;
    const run = await existing(input.scope, normalizedRunId);
    if (!input.allowedFrom.includes(run.status)) {
      throw new ControlRunConflictError(`${input.operation} is not allowed from ${run.status}`);
    }
    const expectedVersion = run.version;
    input.mutate?.(run);
    run.status = input.status;
    if (input.status !== 'waiting_for_approval') run.pendingApprovalKind = null;
    run.version += 1;
    run.updatedAt = clock().toISOString();
    await appendReceipt(run, input.actor, input.status, {
      outcome: input.outcome,
      verifier: input.verifier ?? input.actor.subject
    });
    return apply(
      input.scope,
      input.idempotencyKey,
      input.operation,
      expectedVersion,
      run,
      command
    );
  }

  return {
    async get(
      scope: ControlScope,
      actor: ControlActor,
      runId: string,
      schedulerActivationId?: string
    ) {
      text(actor.subject, 'Actor subject');
      const run = await existing(scope, runId);
      if (
        actor.role === 'control_scheduler' &&
        (!schedulerActivationId || run.activation.id !== text(schedulerActivationId, 'Scheduler activation ID'))
      ) {
        throw new ControlRunAccessError();
      }
      return run;
    },

    async start(
      scope: ControlScope,
      actor: ControlActor,
      input: {
        activationId: string;
        idempotencyKey: string;
        requestedTools: string[];
        requestedResources: string[];
        concurrencyKey: string;
      }
    ) {
      requireWriteActor(actor);
      const activationId = text(input.activationId, 'Activation ID');
      const requestedTools = normalizedSet(input.requestedTools, 'Requested tool');
      const requestedResources = normalizedSet(input.requestedResources, 'Requested resource');
      const concurrencyKey = text(input.concurrencyKey, 'Concurrency key', 180);
      const command = { activationId, requestedTools, requestedResources, concurrencyKey };
      const replayed = await replay(scope, input.idempotencyKey, 'start', command);
      if (replayed) return replayed;
      const activation = await activeActivation(scope, activationId);
      if (!options.executor || !options.executor.supports(activation)) {
        throw new ControlRunConflictError(
          'Exact Build release executor is not registered on the owned runtime'
        );
      }
      assertPolicySubset(requestedTools, activation.allowedTools, 'Requested tool');
      assertPolicySubset(requestedResources, activation.allowedResources, 'Requested resource');
      const createdAt = clock().toISOString();
      const run: ControlRunRecord = {
        id: newId(),
        ...scope,
        activation,
        status: 'queued',
        version: 1,
        attempt: 1,
        concurrencyKey,
        requestedTools,
        requestedResources,
        pendingApprovalKind: null,
        recovery: null,
        lastError: null,
        createdBy: actor.subject,
        createdAt,
        updatedAt: createdAt,
        receipts: []
      };
      await appendReceipt(run, actor, 'queued', {
        outcome: 'Run admitted against the frozen activation',
        verifier: 'control_activation_authority'
      });
      return apply(scope, input.idempotencyKey, 'start', null, run, command);
    },

    async process(
      scope: ControlScope,
      actor: ControlActor,
      runId: string,
      idempotencyKey: string,
      schedulerActivationId?: string
    ) {
      requireScheduler(actor);
      if (!options.executor) throw new ControlRunConflictError('Control executor is not configured');
      const normalizedRunId = text(runId, 'Run ID');
      const normalizedActivationId = text(schedulerActivationId ?? '', 'Scheduler activation ID');
      const command = { runId: normalizedRunId, activationId: normalizedActivationId };
      const replayed = await replay(scope, idempotencyKey, 'process', command);
      if (replayed) return replayed;
      const processKey = normalizeIdempotencyKey(idempotencyKey);
      const claimKey = `__control_internal__process_claim:${await sha256(processKey)}`;
      const claimedReplay = await options.repository.replay(
        scope,
        claimKey,
        await commandDigest(scope, claimKey, 'claim_process', command)
      );
      if (claimedReplay) return claimedReplay;
      const run = await existing(scope, normalizedRunId);
      if (run.activation.id !== normalizedActivationId) {
        throw new ControlRunAccessError('Scheduler token is not bound to the run activation');
      }
      if (run.status !== 'queued') {
        throw new ControlRunConflictError(`process is not allowed from ${run.status}`);
      }
      const queuedVersion = run.version;
      run.status = 'running';
      run.version += 1;
      run.updatedAt = clock().toISOString();
      await appendReceipt(run, actor, 'running', {
        outcome: 'Scheduler claimed the queued run',
        verifier: actor.subject
      });
      const claim = await options.repository.apply({
        scope,
        idempotencyKey: claimKey,
        commandSha256: await commandDigest(scope, claimKey, 'claim_process', command),
        expectedVersion: queuedVersion,
        run
      });
      if (!claim.applied) return claim.run;
      const claimed = claim.run;

      let finished = cloneRun(claimed);
      try {
        let outcome: ControlRunExecutorOutcome;
        try {
          outcome = await options.executor.execute({
            run: cloneRun(claimed),
            activation: structuredClone(claimed.activation),
            allowedTools: [...claimed.requestedTools],
            allowedResources: [...claimed.requestedResources]
          });
        } catch {
          outcome = { type: 'failed', reason: 'executor_failed', retryable: true };
        }

        finished.pendingApprovalKind = null;
        if (outcome.type === 'completed') {
          finished.status = 'completed';
          finished.lastError = null;
          await appendReceipt(finished, actor, 'completed', {
            outcome: outcome.outcome,
            verifier: outcome.verifier
          });
        } else if (outcome.type === 'waiting_for_approval') {
          finished.status = 'waiting_for_approval';
          finished.pendingApprovalKind = text(outcome.approvalKind, 'Approval kind');
          await appendReceipt(finished, actor, 'waiting_for_approval', {
            outcome: outcome.reason,
            verifier: 'frozen_policy'
          });
        } else if (outcome.type === 'dependency_failed') {
          finished.status = 'fallback_required';
          finished.lastError = text(outcome.reason, 'Dependency failure', 1000);
          finished.recovery = text(outcome.fallback, 'Fallback');
          await appendReceipt(finished, actor, 'fallback_required', {
            outcome: finished.lastError,
            verifier: 'dependency_boundary',
            recovery: finished.recovery
          });
        } else {
          finished.status = 'failed';
          finished.lastError = text(outcome.reason, 'Execution failure', 1000);
          await appendReceipt(finished, actor, 'failed', {
            outcome: finished.lastError,
            verifier: outcome.retryable ? 'retryable_failure' : 'terminal_failure'
          });
        }
      } catch {
        finished = cloneRun(claimed);
        finished.status = 'failed';
        finished.pendingApprovalKind = null;
        finished.recovery = null;
        finished.lastError = 'invalid_executor_outcome';
        await appendReceipt(finished, actor, 'failed', {
          outcome: finished.lastError,
          verifier: 'terminal_failure'
        });
      }
      finished.version += 1;
      finished.updatedAt = clock().toISOString();
      return apply(
        scope,
        processKey,
        'process',
        claimed.version,
        finished,
        command
      );
    },

    approve(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string, reason: string) {
      return transition({
        scope,
        actor,
        runId,
        idempotencyKey,
        operation: 'approve',
        allowedFrom: ['waiting_for_approval'],
        status: 'queued',
        outcome: text(reason, 'Approval reason', 1000),
        command: { reason },
        mutate(run) { run.pendingApprovalKind = null; }
      });
    },

    stop(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string, reason: string) {
      return transition({ scope, actor, runId, idempotencyKey, operation: 'stop', allowedFrom: ['queued', 'running', 'waiting_for_approval'], status: 'stopped', outcome: text(reason, 'Stop reason', 1000), command: { reason } });
    },

    cancel(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string, reason: string) {
      return transition({ scope, actor, runId, idempotencyKey, operation: 'cancel', allowedFrom: ['queued', 'running', 'waiting_for_approval', 'stopped', 'failed', 'fallback_required', 'recovering', 'recovered'], status: 'cancelled', outcome: text(reason, 'Cancellation reason', 1000), command: { reason } });
    },

    reject(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string, reason: string) {
      return transition({ scope, actor, runId, idempotencyKey, operation: 'reject', allowedFrom: ['waiting_for_approval'], status: 'terminated', outcome: text(reason, 'Rejection reason', 1000), command: { reason }, mutate(run) { run.pendingApprovalKind = null; } });
    },

    terminate(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string, reason: string) {
      return transition({ scope, actor, runId, idempotencyKey, operation: 'terminate', allowedFrom: ['queued', 'running', 'waiting_for_approval', 'stopped', 'failed', 'fallback_required', 'recovering', 'recovered'], status: 'terminated', outcome: text(reason, 'Termination reason', 1000), command: { reason } });
    },

    retry(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string) {
      return transition({ scope, actor, runId, idempotencyKey, operation: 'retry', allowedFrom: ['stopped', 'failed', 'recovered'], status: 'queued', outcome: 'Run queued for another bounded attempt', mutate(run) {
        if (
          run.status === 'failed' &&
          run.receipts.at(-1)?.verifier !== 'retryable_failure'
        ) {
          throw new ControlRunConflictError('Run failed terminally and cannot be retried');
        }
        if (run.attempt >= maxAttempts) {
          throw new ControlRunConflictError(`Run reached its maximum of ${maxAttempts} attempts`);
        }
        run.attempt += 1;
        run.lastError = null;
      } });
    },

    beginRecovery(scope: ControlScope, actor: ControlActor, runId: string, idempotencyKey: string, recovery: string) {
      return transition({ scope, actor, runId, idempotencyKey, operation: 'begin_recovery', allowedFrom: ['stopped', 'failed', 'fallback_required'], status: 'recovering', outcome: `Recovery started: ${text(recovery, 'Recovery path')}`, command: { recovery }, mutate(run) {
        if (
          run.status === 'failed' &&
          run.receipts.at(-1)?.verifier !== 'retryable_failure'
        ) {
          throw new ControlRunConflictError('Run failed terminally and cannot enter recovery');
        }
        run.recovery = text(recovery, 'Recovery path');
      } });
    },

    async finishRecovery(
      scope: ControlScope,
      actor: ControlActor,
      runId: string,
      idempotencyKey: string,
      outcome: string,
      schedulerActivationId?: string
    ) {
      requireScheduler(actor);
      const normalizedRunId = text(runId, 'Run ID');
      const normalizedOutcome = text(outcome, 'Recovery outcome', 1000);
      const normalizedActivationId = text(schedulerActivationId ?? '', 'Scheduler activation ID');
      const command = {
        runId: normalizedRunId,
        activationId: normalizedActivationId,
        outcome: normalizedOutcome
      };
      const replayed = await replay(scope, idempotencyKey, 'finish_recovery', command);
      if (replayed) return replayed;
      const run = await existing(scope, normalizedRunId);
      if (run.activation.id !== normalizedActivationId) {
        throw new ControlRunAccessError('Scheduler token is not bound to the run activation');
      }
      if (run.status !== 'recovering') throw new ControlRunConflictError(`finish_recovery is not allowed from ${run.status}`);
      const expectedVersion = run.version;
      run.status = 'recovered';
      run.version += 1;
      run.updatedAt = clock().toISOString();
      await appendReceipt(run, actor, 'recovered', { outcome: normalizedOutcome, verifier: actor.subject });
      return apply(scope, idempotencyKey, 'finish_recovery', expectedVersion, run, command);
    }
  };
}
