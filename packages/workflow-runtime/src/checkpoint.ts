import {
  createWorkflowRuntimeRun,
  planWorkflowRuntimeStep,
  reduceWorkflowRuntimeRun,
  verifyWorkflowRuntimeRun
} from './runtime.js';
import {
  RuntimeValidationError,
  type WorkflowRuntimeAdmission,
  type WorkflowRuntimeEvent,
  type WorkflowRuntimeManifest,
  type WorkflowRuntimePlan,
  type WorkflowRuntimeRun
} from './types.js';

export interface WorkflowRuntimeScope {
  accountId: string;
  tenantId: string;
  workspaceAccountId: string;
}

export interface WorkflowRuntimeCheckpointStore {
  find(scope: WorkflowRuntimeScope, runId: string): Promise<WorkflowRuntimeRun | undefined>;
  replay(
    scope: WorkflowRuntimeScope,
    idempotencyKey: string,
    commandDigest: string
  ): Promise<WorkflowRuntimeRun | undefined>;
  apply(input: {
    scope: WorkflowRuntimeScope;
    run: WorkflowRuntimeRun;
    expectedVersion: number | null;
    idempotencyKey: string;
    commandDigest: string;
  }): Promise<{ run: WorkflowRuntimeRun; applied: boolean }>;
}

export interface WorkflowRuntimeHostPorts {
  storage: WorkflowRuntimeCheckpointStore;
  clock: () => string;
  identity: {
    assert(
      scope: WorkflowRuntimeScope,
      actorSubject: string | null,
      requiredApprovalPolicy: string | null
    ): Promise<string | null>;
  };
  queue: {
    enqueue(input: { runId: string; expectedVersion: number }): Promise<void>;
  };
  receiptSink: {
    write(run: WorkflowRuntimeRun): Promise<void>;
  };
  executor: never;
}

function scopeKey(scope: WorkflowRuntimeScope): string {
  return `${scope.accountId}\u0000${scope.tenantId}\u0000${scope.workspaceAccountId}`;
}

function key(scope: WorkflowRuntimeScope, idempotencyKey: string): string {
  return `${scopeKey(scope)}\u0000${idempotencyKey}`;
}

function cloned(run: WorkflowRuntimeRun): WorkflowRuntimeRun {
  return structuredClone(run);
}

function bounded(value: string, label: string): string {
  if (!value.trim() || value.trim().length > 180)
    throw new RuntimeValidationError('INVALID_EVENT', `${label} is required`);
  return value.trim();
}

function sha256Hex(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new RuntimeValidationError(
      'INVALID_EVENT',
      'Workflow Runtime command digest must be a sha256 hex digest'
    );
  }
  return value;
}

function canonicalCommand(value: unknown, ancestors = new WeakSet<object>()): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Runtime command contains an invalid number'
      );
    }
    return JSON.stringify(value);
  }
  if (value !== null && typeof value === 'object') {
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    ) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Runtime command must contain plain data only'
      );
    }
    if (ancestors.has(value)) {
      throw new RuntimeValidationError('INVALID_EVENT', 'Runtime command must not contain a cycle');
    }
    ancestors.add(value);
    const result = Array.isArray(value)
      ? `[${value.map((entry) => canonicalCommand(entry, ancestors)).join(',')}]`
      : `{${Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => `${JSON.stringify(key)}:${canonicalCommand(child, ancestors)}`)
          .join(',')}}`;
    ancestors.delete(value);
    return result;
  }
  throw new RuntimeValidationError('INVALID_EVENT', 'Runtime command must contain JSON data only');
}

async function semanticCommandDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalCommand(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function actorSubject(event: WorkflowRuntimeEvent): string | null {
  return 'actorSubject' in event ? bounded(event.actorSubject, 'Runtime actor subject') : null;
}

function activeStopStep(run: WorkflowRuntimeRun): string {
  const expected =
    run.status === 'queued'
      ? 'ready'
      : run.status === 'running'
        ? 'running'
        : run.status === 'waiting_for_approval'
          ? 'waiting_for_approval'
          : null;
  const active = expected ? run.steps.filter((step) => step.status === expected) : [];
  if (active.length !== 1) {
    throw new RuntimeValidationError('INVALID_STATE', 'Runtime stop requires one live step');
  }
  return active[0].id;
}

/**
 * Fixture-only durable port. It serializes commits so stale expected versions
 * cannot create a second planned effect. Production D1 implements this port in
 * the owned Control host; this class never invokes a capability.
 */
export class MemoryWorkflowRuntimeCheckpointStore implements WorkflowRuntimeCheckpointStore {
  private readonly runs = new Map<string, WorkflowRuntimeRun>();
  private readonly commands = new Map<string, { commandDigest: string; run: WorkflowRuntimeRun }>();
  private tail: Promise<void> = Promise.resolve();

  async find(scope: WorkflowRuntimeScope, runId: string): Promise<WorkflowRuntimeRun | undefined> {
    const result = this.runs.get(`${scopeKey(scope)}\u0000${runId}`);
    return result ? cloned(result) : undefined;
  }

  async replay(
    scope: WorkflowRuntimeScope,
    idempotencyKey: string,
    commandDigest: string
  ): Promise<WorkflowRuntimeRun | undefined> {
    const entry = this.commands.get(key(scope, bounded(idempotencyKey, 'Idempotency key')));
    if (!entry) return undefined;
    if (entry.commandDigest !== sha256Hex(commandDigest)) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Idempotency key was already used for another command'
      );
    }
    return cloned(entry.run);
  }

  apply(input: Parameters<WorkflowRuntimeCheckpointStore['apply']>[0]) {
    const operation = this.tail.then(async () => {
      const commandKey = key(input.scope, bounded(input.idempotencyKey, 'Idempotency key'));
      const digest = sha256Hex(input.commandDigest);
      const replay = this.commands.get(commandKey);
      if (replay) {
        if (replay.commandDigest !== digest)
          throw new RuntimeValidationError(
            'INVALID_EVENT',
            'Idempotency key was already used for another command'
          );
        return { run: cloned(replay.run), applied: false };
      }
      const runKey = `${scopeKey(input.scope)}\u0000${input.run.id}`;
      const current = this.runs.get(runKey);
      if (input.expectedVersion === null) {
        if (current)
          throw new RuntimeValidationError('INVALID_STATE', 'Runtime run already exists');
      } else if (!current || current.version !== input.expectedVersion) {
        throw new RuntimeValidationError('INVALID_STATE', 'Runtime run changed concurrently');
      }
      this.runs.set(runKey, cloned(input.run));
      this.commands.set(commandKey, { commandDigest: digest, run: cloned(input.run) });
      return { run: cloned(input.run), applied: true };
    });
    this.tail = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }
}

export class ZeroWriteWorkflowRuntimeHost {
  constructor(
    private readonly manifest: WorkflowRuntimeManifest,
    private readonly ports: WorkflowRuntimeHostPorts
  ) {}

  async admit(
    scope: WorkflowRuntimeScope,
    admission: WorkflowRuntimeAdmission,
    idempotencyKey: string,
    _commandDigest: string
  ) {
    if ((await this.ports.identity.assert(scope, null, null)) !== null) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Runtime admission must not record an unaudited actor subject'
      );
    }
    const derivedCommandDigest = await semanticCommandDigest({
      operation: 'admit',
      scope,
      idempotencyKey: bounded(idempotencyKey, 'Idempotency key'),
      target: { runId: admission.runId },
      expectedVersion: null,
      actorSubject: null,
      payload: {
        activation: admission.activation,
        artifactManifestSha256: admission.artifactManifestSha256,
        runtimeManifestSha256: admission.runtimeManifestSha256
      }
    });
    const replay = await this.ports.storage.replay(scope, idempotencyKey, derivedCommandDigest);
    if (replay) return replay;
    const run = await createWorkflowRuntimeRun(this.manifest, {
      ...admission,
      clock: this.ports.clock()
    });
    const committed = await this.ports.storage.apply({
      scope,
      run,
      expectedVersion: null,
      idempotencyKey,
      commandDigest: derivedCommandDigest
    });
    if (committed.applied) {
      await this.ports.receiptSink.write(committed.run);
      await this.ports.queue.enqueue({
        runId: committed.run.id,
        expectedVersion: committed.run.version
      });
    }
    return committed.run;
  }

  async plan(scope: WorkflowRuntimeScope, runId: string): Promise<WorkflowRuntimePlan> {
    const run = await this.required(scope, runId);
    return planWorkflowRuntimeStep(this.manifest, run);
  }

  async transition(
    scope: WorkflowRuntimeScope,
    runId: string,
    expectedVersion: number,
    event: WorkflowRuntimeEvent,
    idempotencyKey: string,
    _commandDigest: string
  ): Promise<WorkflowRuntimeRun> {
    const claimedActorSubject = actorSubject(event);
    const approvalRun =
      event.type === 'approval_decided' ? await this.required(scope, runId) : undefined;
    const requiredApprovalPolicy =
      approvalRun?.steps.find((step) => step.id === event.stepId)?.approval?.policyId ?? null;
    const authenticatedActorSubject = await this.ports.identity.assert(
      scope,
      claimedActorSubject,
      requiredApprovalPolicy
    );
    if (authenticatedActorSubject !== claimedActorSubject) {
      throw new RuntimeValidationError(
        'INVALID_EVENT',
        'Runtime event actor subject does not match the authenticated identity'
      );
    }
    const observedEvent = {
      ...event,
      ...(claimedActorSubject === null ? {} : { actorSubject: authenticatedActorSubject }),
      observedAt: this.ports.clock()
    } as WorkflowRuntimeEvent;
    const { observedAt: _observedAt, ...payload } = observedEvent;
    const derivedCommandDigest = await semanticCommandDigest({
      operation: 'transition',
      scope,
      idempotencyKey: bounded(idempotencyKey, 'Idempotency key'),
      target: { runId },
      expectedVersion,
      actorSubject: authenticatedActorSubject,
      payload
    });
    const replay = await this.ports.storage.replay(scope, idempotencyKey, derivedCommandDigest);
    if (replay) return replay;
    const isOperatorStop = observedEvent.type === 'stop_requested';
    for (let attempt = 0; attempt < (isOperatorStop ? 3 : 1); attempt += 1) {
      const current = await this.required(scope, runId);
      if (!isOperatorStop && current.version !== expectedVersion) {
        throw new RuntimeValidationError('INVALID_STATE', 'Runtime run changed before transition');
      }
      const eventForCurrent = isOperatorStop
        ? ({ ...observedEvent, stepId: activeStopStep(current) } as WorkflowRuntimeEvent)
        : observedEvent;
      const run = await reduceWorkflowRuntimeRun(this.manifest, current, eventForCurrent);
      await verifyWorkflowRuntimeRun(this.manifest, run);
      try {
        // An operator stop is a control-plane safeguard, not an executable
        // request. On a stale snapshot it re-evaluates the latest active run
        // so an automatic approval cannot outrun the stop command.
        const committed = await this.ports.storage.apply({
          scope,
          run,
          expectedVersion: isOperatorStop ? current.version : expectedVersion,
          idempotencyKey,
          commandDigest: derivedCommandDigest
        });
        if (committed.applied) {
          await this.ports.receiptSink.write(committed.run);
          if (committed.run.status === 'queued')
            await this.ports.queue.enqueue({ runId, expectedVersion: committed.run.version });
        }
        return committed.run;
      } catch (error) {
        if (
          !isOperatorStop ||
          !(error instanceof RuntimeValidationError) ||
          error.message !== 'Runtime run changed concurrently'
        ) {
          throw error;
        }
      }
    }
    throw new RuntimeValidationError(
      'INVALID_STATE',
      'Operator stop could not obtain a stable active checkpoint'
    );
  }

  private async required(scope: WorkflowRuntimeScope, runId: string): Promise<WorkflowRuntimeRun> {
    const run = await this.ports.storage.find(scope, runId);
    if (!run)
      throw new RuntimeValidationError(
        'INVALID_STATE',
        'Runtime run is not available in this scope'
      );
    await verifyWorkflowRuntimeRun(this.manifest, run);
    return run;
  }
}
