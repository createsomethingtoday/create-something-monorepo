import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ControlRunAccessError,
  ControlRunConflictError,
  ControlRunPolicyError,
  MemoryControlRunRepository,
  createControlRunService,
  type ControlActivationAuthority,
  type ControlActor,
  type ControlRunExecutor,
  type ControlScope,
  type FrozenControlActivation
} from '../src/control.js';
import { RegisteredControlWorkflowExecutor } from '../src/control-executor.js';

const scope: ControlScope = {
  accountId: 'account-a',
  tenantId: 'tenant-a',
  workspaceAccountId: 'workspace-a'
};

const owner: ControlActor = {
  subject: 'identity-owner',
  role: 'account_owner'
};

const scheduler: ControlActor = {
  subject: 'identity-scheduler',
  role: 'control_scheduler'
};

const activation: FrozenControlActivation = {
  id: 'activation-a',
  activationVersion: 1,
  activationKind: 'initial',
  status: 'active',
  accountId: scope.accountId,
  tenantId: scope.tenantId,
  workspaceAccountId: scope.workspaceAccountId,
  mapId: 'map-a',
  mapVersionId: 'map-version-a',
  mapVersion: 3,
  mapCanvasSha256: '1'.repeat(64),
  handoffId: 'handoff-a',
  handoffReceiptSha256: '2'.repeat(64),
  buildReleaseId: 'release-a',
  buildManifestSha256: '3'.repeat(64),
  buildArtifactSetSha256: '4'.repeat(64),
  buildAcceptanceReceiptId: 'acceptance-a',
  buildAcceptanceReceiptSha256: '5'.repeat(64),
  policyVersion: 'policy-v1',
  policySha256: '6'.repeat(64),
  contractSha256: '7'.repeat(64),
  entitlementSnapshotSha256: '8'.repeat(64),
  allowedTools: ['mcp:read', 'mcp:write'],
  allowedResources: ['resource:public']
};

class MemoryActivationAuthority implements ControlActivationAuthority {
  constructor(private readonly records = [activation]) {}

  async findActive(inputScope: ControlScope, activationId: string) {
    return this.records.find(
      (record) =>
        record.id === activationId &&
        record.status === 'active' &&
        record.accountId === inputScope.accountId &&
        record.tenantId === inputScope.tenantId &&
        record.workspaceAccountId === inputScope.workspaceAccountId
    );
  }
}

function service(executor?: ControlRunExecutor) {
  let next = 0;
  return createControlRunService({
    repository: new MemoryControlRunRepository(),
    activations: new MemoryActivationAuthority(),
    executor: executor ?? {
      supports: () => true,
      async execute() {
        return { type: 'completed', outcome: 'default test outcome', verifier: 'test' };
      }
    },
    id: () => `id-${++next}`,
    clock: () => new Date(`2026-07-19T00:00:${String(next).padStart(2, '0')}.000Z`)
  });
}

test('starts only from an active in-scope activation and freezes its evidence', async () => {
  const runs = service();
  const started = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-1',
    requestedTools: ['mcp:read'],
    requestedResources: ['resource:public'],
    concurrencyKey: 'daily-sync'
  });

  assert.equal(started.status, 'queued');
  assert.equal(started.activation.contractSha256, activation.contractSha256);
  assert.equal(started.receipts.length, 1);
  assert.equal(started.receipts[0].status, 'queued');
  assert.equal(started.receipts[0].mapVersionId, activation.mapVersionId);
  assert.equal(started.receipts[0].buildReleaseId, activation.buildReleaseId);
  assert.equal(started.receipts[0].policySha256, activation.policySha256);
  assert.match(started.receipts[0].receiptSha256, /^[a-f0-9]{64}$/);

  const replay = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-1',
    requestedTools: ['mcp:read'],
    requestedResources: ['resource:public'],
    concurrencyKey: 'daily-sync'
  });
  assert.equal(replay.id, started.id);
  assert.equal(replay.receipts.length, 1);
});

test('denies cross-tenant access and policy expansion without leaking existence', async () => {
  const runs = service();
  await assert.rejects(
    runs.start({ ...scope, tenantId: 'tenant-b' }, owner, {
      activationId: activation.id,
      idempotencyKey: 'cross-tenant',
      requestedTools: ['mcp:read'],
      requestedResources: [],
      concurrencyKey: 'x'
    }),
    ControlRunAccessError
  );
  await assert.rejects(
    runs.start(scope, owner, {
      activationId: activation.id,
      idempotencyKey: 'tool-expansion',
      requestedTools: ['mcp:delete'],
      requestedResources: [],
      concurrencyKey: 'x'
    }),
    ControlRunPolicyError
  );
});

test('binds scheduler reads to the activation carried by its credential', async () => {
  const secondActivation: FrozenControlActivation = {
    ...activation,
    id: 'activation-b',
    mapId: 'map-b',
    mapVersionId: 'map-version-b',
    handoffId: 'handoff-b',
    buildReleaseId: 'release-b',
    buildAcceptanceReceiptId: 'acceptance-b'
  };
  const runs = createControlRunService({
    repository: new MemoryControlRunRepository(),
    activations: new MemoryActivationAuthority([activation, secondActivation]),
    executor: {
      supports: () => true,
      async execute() {
        return { type: 'completed', outcome: 'test', verifier: 'test' };
      }
    }
  });
  const first = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'scheduler-read-a',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'read-a'
  });
  const second = await runs.start(scope, owner, {
    activationId: secondActivation.id,
    idempotencyKey: 'scheduler-read-b',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'read-b'
  });

  assert.equal((await runs.get(scope, scheduler, first.id, activation.id)).id, first.id);
  await assert.rejects(
    runs.get(scope, scheduler, second.id, activation.id),
    ControlRunAccessError
  );
  await assert.rejects(runs.get(scope, scheduler, first.id), ControlRunAccessError);
});

test('enforces concurrency and idempotency independently', async () => {
  const runs = service();
  await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-a',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'exclusive'
  });
  await assert.rejects(
    runs.start(scope, owner, {
      activationId: activation.id,
      idempotencyKey: 'start-b',
      requestedTools: [],
      requestedResources: [],
      concurrencyKey: 'exclusive'
    }),
    ControlRunConflictError
  );
});

test('enforces concurrency when a stopped run is retried', async () => {
  const runs = service();
  let first = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-first',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'exclusive'
  });
  first = await runs.stop(scope, owner, first.id, 'stop-first', 'operator stop');
  await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-second',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'exclusive'
  });
  await assert.rejects(
    runs.retry(scope, owner, first.id, 'retry-first'),
    ControlRunConflictError
  );
});

test('does not create authoritative run rows without an exact promoted executor', async () => {
  for (const executor of [undefined, new RegisteredControlWorkflowExecutor([])]) {
    const repository = new MemoryControlRunRepository();
    const runs = createControlRunService({
      repository,
      activations: new MemoryActivationAuthority(),
      executor
    });
    await assert.rejects(
      runs.start(scope, owner, {
        activationId: activation.id,
        idempotencyKey: 'start',
        requestedTools: [],
        requestedResources: [],
        concurrencyKey: 'exclusive'
      }),
      ControlRunConflictError
    );
    assert.equal(await repository.find(scope, 'not-created'), undefined);
  }
});

test('executes approval, stop, retry, dependency fallback, and recovery paths', async () => {
  const outcomes: Array<Awaited<ReturnType<ControlRunExecutor['execute']>>> = [
    { type: 'waiting_for_approval', reason: 'destructive tool', approvalKind: 'tool' },
    { type: 'dependency_failed', reason: 'crm unavailable', fallback: 'manual' },
    { type: 'completed', outcome: 'manual recovery completed', verifier: 'golden-task-7' }
  ];
  const runs = service({ supports: () => true, async execute() { return outcomes.shift()!; } });
  let run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start',
    requestedTools: ['mcp:write'],
    requestedResources: [],
    concurrencyKey: 'workflow'
  });

  run = await runs.process(scope, scheduler, run.id, 'process-1', activation.id);
  assert.equal(run.status, 'waiting_for_approval');
  run = await runs.approve(scope, owner, run.id, 'approve-1', 'approved by owner');
  assert.equal(run.status, 'queued');
  run = await runs.process(scope, scheduler, run.id, 'process-2', activation.id);
  assert.equal(run.status, 'fallback_required');
  run = await runs.beginRecovery(scope, owner, run.id, 'recover-1', 'manual_fallback');
  assert.equal(run.status, 'recovering');
  run = await runs.finishRecovery(
    scope,
    scheduler,
    run.id,
    'recover-2',
    'operator restored dependency',
    activation.id
  );
  assert.equal(run.status, 'recovered');
  run = await runs.retry(scope, owner, run.id, 'retry-1');
  assert.equal(run.status, 'queued');
  run = await runs.process(scope, scheduler, run.id, 'process-3', activation.id);
  assert.equal(run.status, 'completed');
  assert.equal(run.receipts.at(-1)?.verifier, 'golden-task-7');
  assert.equal(run.receipts.at(-1)?.recovery, 'manual_fallback');

  const firstProcessReplay = await runs.process(scope, scheduler, run.id, 'process-1', activation.id);
  assert.equal(firstProcessReplay.status, 'waiting_for_approval');
  assert.equal(firstProcessReplay.receipts.at(-1)?.outcome, 'destructive tool');

  for (let index = 1; index < run.receipts.length; index += 1) {
    assert.equal(run.receipts[index].previousReceiptSha256, run.receipts[index - 1].receiptSha256);
  }
});

test('binds action idempotency to the target run', async () => {
  const runs = service();
  const first = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'action-run-first',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'first'
  });
  const second = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'action-run-second',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'second'
  });

  await runs.stop(scope, owner, first.id, 'shared-action-key', 'operator stop');
  await assert.rejects(
    runs.stop(scope, owner, second.id, 'shared-action-key', 'operator stop'),
    ControlRunConflictError
  );
  assert.equal((await runs.get(scope, owner, second.id)).status, 'queued');
});

test('binds scheduler recovery completion to the frozen run activation', async () => {
  const runs = service({
    supports: () => true,
    async execute() {
      return { type: 'dependency_failed', reason: 'dependency unavailable', fallback: 'manual' };
    }
  });
  let run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'recovery-binding-start',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'recovery-binding'
  });
  run = await runs.process(scope, scheduler, run.id, 'recovery-binding-process', activation.id);
  run = await runs.beginRecovery(scope, owner, run.id, 'recovery-binding-begin', 'manual');

  await assert.rejects(
    runs.finishRecovery(
      scope,
      scheduler,
      run.id,
      'recovery-binding-wrong',
      'dependency restored',
      'activation-b'
    ),
    ControlRunAccessError
  );
  const recovered = await runs.finishRecovery(
    scope,
    scheduler,
    run.id,
    'recovery-binding-finish',
    'dependency restored',
    activation.id
  );
  assert.equal(recovered.status, 'recovered');
});

test('clears approval metadata whenever a run leaves approval wait', async () => {
  const runs = service({
    supports: () => true,
    async execute() {
      return { type: 'waiting_for_approval', reason: 'destructive tool', approvalKind: 'tool' };
    }
  });
  let run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'approval-start',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'approval-workflow'
  });
  run = await runs.process(scope, scheduler, run.id, 'approval-process', activation.id);
  assert.equal(run.pendingApprovalKind, 'tool');
  run = await runs.stop(scope, owner, run.id, 'approval-stop', 'operator stop');
  assert.equal(run.pendingApprovalKind, null);
  run = await runs.retry(scope, owner, run.id, 'approval-retry');
  assert.equal(run.pendingApprovalKind, null);
});

test('stop, cancel, rejection, and provider failures reach declared terminal or retryable states', async () => {
  const runs = service({
    supports: () => true,
    async execute() {
      return { type: 'failed', reason: 'provider unavailable', retryable: true };
    }
  });
  let run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'workflow'
  });
  run = await runs.stop(scope, owner, run.id, 'stop-1', 'operator stop');
  assert.equal(run.status, 'stopped');
  run = await runs.retry(scope, owner, run.id, 'retry-1');
  run = await runs.process(scope, scheduler, run.id, 'process-1', activation.id);
  assert.equal(run.status, 'failed');
  run = await runs.cancel(scope, owner, run.id, 'cancel-1', 'no longer required');
  assert.equal(run.status, 'cancelled');
});

test('terminal executor failures cannot be retried', async () => {
  const runs = service({
    supports: () => true,
    async execute() {
      return { type: 'failed', reason: 'contract is permanently invalid', retryable: false };
    }
  });
  let run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-terminal',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'terminal-workflow'
  });
  run = await runs.process(scope, scheduler, run.id, 'process-terminal', activation.id);
  assert.equal(run.status, 'failed');
  assert.equal(run.receipts.at(-1)?.verifier, 'terminal_failure');
  await assert.rejects(
    runs.retry(scope, owner, run.id, 'retry-terminal'),
    /failed terminally/
  );
  await assert.rejects(
    runs.beginRecovery(scope, owner, run.id, 'recover-terminal', 'manual override'),
    /failed terminally/
  );
});

test('malformed executor outcomes fail closed without stranding a running claim', async () => {
  const malformed = [
    { type: 'completed', outcome: 'done', verifier: 'x'.repeat(241) },
    { type: 'waiting_for_approval', reason: 'approval required', approvalKind: '' },
    { type: 'dependency_failed', reason: 'dependency unavailable', fallback: '' }
  ];

  for (const [index, outcome] of malformed.entries()) {
    const runs = service({
      supports: () => true,
      async execute() {
        return outcome as Awaited<ReturnType<ControlRunExecutor['execute']>>;
      }
    });
    let run = await runs.start(scope, owner, {
      activationId: activation.id,
      idempotencyKey: `malformed-start-${index}`,
      requestedTools: [],
      requestedResources: [],
      concurrencyKey: `malformed-${index}`
    });
    run = await runs.process(scope, scheduler, run.id, `malformed-process-${index}`, activation.id);
    assert.equal(run.status, 'failed');
    assert.equal(run.lastError, 'invalid_executor_outcome');
    assert.equal(run.receipts.at(-1)?.verifier, 'terminal_failure');
    assert.equal(
      (await runs.process(scope, scheduler, run.id, `malformed-process-${index}`, activation.id)).status,
      'failed'
    );
    await assert.rejects(
      runs.retry(scope, owner, run.id, `malformed-retry-${index}`),
      /failed terminally/
    );
  }
});

test('an admitted run executes from frozen activation evidence after supersession', async () => {
  let currentActivationIsActive = true;
  const authority: ControlActivationAuthority = {
    async findActive() {
      return currentActivationIsActive ? activation : undefined;
    }
  };
  const repository = new MemoryControlRunRepository();
  const runs = createControlRunService({
    repository,
    activations: authority,
    executor: {
      supports: () => true,
      async execute() {
        return { type: 'completed', outcome: 'frozen contract completed', verifier: 'golden-task' };
      }
    }
  });
  const run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start-before-supersession',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'frozen-workflow'
  });
  currentActivationIsActive = false;
  await assert.rejects(
    runs.process(scope, scheduler, run.id, 'wrong-activation', 'activation-other'),
    ControlRunAccessError
  );
  const completed = await runs.process(
    scope,
    scheduler,
    run.id,
    'process-after-supersession',
    activation.id
  );
  assert.equal(completed.status, 'completed');
  assert.equal(completed.activation.activationVersion, 1);
});

test('persists the running claim before paid execution so stop wins an in-flight race', async () => {
  let release: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  let signalExecutionBegan: (() => void) | undefined;
  const executionBegan = new Promise<void>((resolve) => { signalExecutionBegan = resolve; });
  let executions = 0;
  const repository = new MemoryControlRunRepository();
  const runs = createControlRunService({
    repository,
    activations: new MemoryActivationAuthority(),
    executor: {
      supports: () => true,
      async execute() {
        executions += 1;
        signalExecutionBegan?.();
        await blocked;
        return { type: 'completed', outcome: 'late result', verifier: 'provider' };
      }
    }
  });
  let run = await runs.start(scope, owner, {
    activationId: activation.id,
    idempotencyKey: 'start',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'workflow'
  });
  const processing = runs.process(scope, scheduler, run.id, 'process', activation.id);
  await executionBegan;
  run = await runs.get(scope, owner, run.id);
  assert.equal(run.status, 'running');
  const duplicate = await runs.process(scope, scheduler, run.id, 'process', activation.id);
  assert.equal(duplicate.status, 'running');
  assert.equal(executions, 1);
  run = await runs.stop(scope, owner, run.id, 'stop', 'operator stop');
  release?.();
  await assert.rejects(processing, ControlRunConflictError);
  assert.equal((await runs.get(scope, owner, run.id)).status, 'stopped');
});

test('provider-neutral executor identity never changes the receipt contract', async () => {
  for (const provider of ['openai', 'future-provider']) {
    const runs = service({
      supports: () => true,
      async execute() {
        return { type: 'completed', outcome: `${provider} completed`, verifier: provider };
      }
    });
    let run = await runs.start(scope, owner, {
      activationId: activation.id,
      idempotencyKey: `start-${provider}`,
      requestedTools: [],
      requestedResources: [],
      concurrencyKey: provider
    });
    run = await runs.process(scope, scheduler, run.id, `process-${provider}`, activation.id);
    assert.equal(run.status, 'completed');
    assert.equal(run.receipts.at(-1)?.schema, 'create-something/control-run-receipt@1');
    assert.equal('provider' in run.receipts.at(-1)!, false);
  }
});

test('executor registry requires the exact accepted Build release and contract hash', async () => {
  const missing = new RegisteredControlWorkflowExecutor([]);
  assert.deepEqual(
    await missing.execute({
      run: {} as never,
      activation,
      allowedTools: [],
      allowedResources: []
    }),
    {
      type: 'dependency_failed',
      reason: 'Exact Build release executor is not registered on the owned runtime',
      fallback: 'manual_fallback'
    }
  );

  const exact = new RegisteredControlWorkflowExecutor([{
    buildReleaseId: activation.buildReleaseId,
    contractSha256: activation.contractSha256,
    async execute() { return { type: 'completed', outcome: 'exact release', verifier: 'build-registry' }; }
  }]);
  assert.deepEqual(
    await exact.execute({ run: {} as never, activation, allowedTools: [], allowedResources: [] }),
    { type: 'completed', outcome: 'exact release', verifier: 'build-registry' }
  );
  assert.deepEqual(
    await exact.execute({
      run: {} as never,
      activation: { ...activation, contractSha256: '9'.repeat(64) },
      allowedTools: [],
      allowedResources: []
    }),
    {
      type: 'dependency_failed',
      reason: 'Exact Build release executor is not registered on the owned runtime',
      fallback: 'manual_fallback'
    }
  );
});
