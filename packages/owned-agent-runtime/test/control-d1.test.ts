import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ControlRunConflictError,
  createControlRunService,
  type ControlActor,
  type ControlRunExecutor,
  type ControlScope
} from '../src/control.js';
import { D1ControlActivationAuthority, D1ControlRunRepository } from '../src/control-store.js';
import { D1TemplateReviewQueueObservationAdapter } from '../src/template-review-queue-observation.js';
import { D1WorkflowRuntimeProofReader } from '../src/workflow-runtime-proof-projection.js';
import { D1WorkflowRuntimeCheckpointStore } from '../src/workflow-runtime-store.js';
import {
  createWorkflowRuntimeRun,
  planWorkflowRuntimeStep,
  parseWorkflowRuntimeManifest,
  reduceWorkflowRuntimeRun,
  type RuntimeDigest,
  type WorkflowRuntimeManifest
} from '../../workflow-runtime/src/index.js';

function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql: string, values: unknown[]): string {
  let sequential = 0;
  return sql.replace(/\?(\d+)?/g, (_match, numbered: string | undefined) => {
    const index = numbered ? Number(numbered) - 1 : sequential++;
    if (index < 0 || index >= values.length) throw new Error(`Missing SQL binding ${index + 1}`);
    return literal(values[index]);
  });
}

class Statement {
  constructor(
    readonly path: string,
    readonly sql: string,
    readonly values: unknown[] = []
  ) {}
  bind(...values: unknown[]) {
    return new Statement(this.path, this.sql, values);
  }
  bound() {
    return bindSql(this.sql, this.values);
  }
  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.path], {
      input: `PRAGMA foreign_keys=ON; ${this.bound()};`,
      encoding: 'utf8'
    }).trim();
    return (output ? (JSON.parse(output) as T[]) : [])[0] ?? null;
  }
  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.path], {
      input: `PRAGMA foreign_keys=ON; ${this.bound()};`,
      encoding: 'utf8'
    }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

function d1(path: string): D1Database {
  return {
    prepare(sql: string) {
      return new Statement(path, sql) as unknown as D1PreparedStatement;
    },
    async batch(statements: D1PreparedStatement[]) {
      const body = statements
        .map((statement) => (statement as unknown as Statement).bound())
        .join(';\n');
      execFileSync('sqlite3', ['-bail', path], {
        input: `PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; ${body}; COMMIT;`,
        encoding: 'utf8'
      });
      return statements.map(() => ({ success: true, meta: { changes: 1 } })) as D1Result<unknown>[];
    }
  } as unknown as D1Database;
}

function activeControlActivationAuthority(path: string): D1ControlActivationAuthority {
  return new D1ControlActivationAuthority(d1(path));
}

const scope: ControlScope = {
  accountId: 'account-a',
  tenantId: 'tenant-a',
  workspaceAccountId: 'workspace-a'
};
const owner: ControlActor = { subject: 'owner-a', role: 'account_owner' };
const scheduler: ControlActor = { subject: 'scheduler-a', role: 'control_scheduler' };

function fixture(executor?: ControlRunExecutor, runId?: () => string) {
  const path = join(mkdtempSync(join(tmpdir(), 'control-run-d1-')), 'runtime.sqlite');
  const migration = readFileSync(
    new URL('../migrations/0003_control_run_lifecycle.sql', import.meta.url),
    'utf8'
  );
  const workflowRuntimeMigration = readFileSync(
    new URL('../migrations/0004_control_workflow_runtime_zero_write.sql', import.meta.url),
    'utf8'
  );
  const workflowRuntimeEffectAmbiguityMigration = readFileSync(
    new URL('../migrations/0005_control_workflow_runtime_effect_ambiguity.sql', import.meta.url),
    'utf8'
  );
  const workflowRuntimeDispatchMigration = readFileSync(
    new URL('../migrations/0006_control_workflow_runtime_dispatches.sql', import.meta.url),
    'utf8'
  );
  const workflowRuntimeProofMigration = readFileSync(
    new URL('../migrations/0007_control_workflow_runtime_proof_projection.sql', import.meta.url),
    'utf8'
  );
  const workflowRuntimeApprovalContextMigration = readFileSync(
    new URL('../migrations/0008_control_workflow_runtime_approval_context.sql', import.meta.url),
    'utf8'
  );
  const workflowRuntimeRegistrationBindingMigration = readFileSync(
    new URL(
      '../migrations/0009_control_workflow_runtime_registration_binding.sql',
      import.meta.url
    ),
    'utf8'
  );
  execFileSync('sqlite3', [path], {
    input: `PRAGMA foreign_keys=ON;
      ${migration}
      ${workflowRuntimeMigration}
      ${workflowRuntimeEffectAmbiguityMigration}
      ${workflowRuntimeDispatchMigration}
      ${workflowRuntimeProofMigration}
      ${workflowRuntimeApprovalContextMigration}
      ${workflowRuntimeRegistrationBindingMigration}
      CREATE TABLE customer_control_activations (
        id TEXT PRIMARY KEY, activation_version INTEGER, activation_kind TEXT, status TEXT,
        account_id TEXT, tenant_id TEXT, workspace_account_id TEXT,
        map_id TEXT, map_version_id TEXT, map_version INTEGER, map_canvas_sha256 TEXT,
        handoff_id TEXT, handoff_receipt_sha256 TEXT, build_release_id TEXT,
        build_manifest_sha256 TEXT, build_artifact_set_sha256 TEXT,
        build_acceptance_receipt_id TEXT, build_acceptance_receipt_sha256 TEXT,
        policy_version TEXT, policy_sha256 TEXT, contract_sha256 TEXT,
        entitlement_snapshot_sha256 TEXT, allowed_tools_json TEXT, allowed_resources_json TEXT
      );
      INSERT INTO customer_control_activations VALUES (
        'activation-a', 1, 'initial', 'active', 'account-a', 'tenant-a', 'workspace-a',
        'map-a', 'map-version-a', 2, '${'1'.repeat(64)}', 'handoff-a', '${'2'.repeat(64)}',
        'release-a', '${'7'.repeat(64)}', '${'4'.repeat(64)}', 'acceptance-a', '${'5'.repeat(64)}',
        'policy-v1', '${'6'.repeat(64)}', '${'7'.repeat(64)}', '${'8'.repeat(64)}',
        '["mcp:read"]', '["resource:public"]'
      );`,
    encoding: 'utf8'
  });
  let id = 0;
  const database = d1(path);
  const service = createControlRunService({
    repository: new D1ControlRunRepository(database),
    activations: new D1ControlActivationAuthority(database),
    executor: executor ?? {
      supports: () => true,
      async execute() {
        return { type: 'completed', outcome: 'verified', verifier: 'golden-task' };
      }
    },
    id: runId ?? (() => `id-${++id}`),
    clock: () => new Date(`2026-07-19T01:00:${String(id).padStart(2, '0')}.000Z`)
  });
  return { path, service };
}

test('D1 repository atomically persists and exactly replays hash-chained lifecycle results', async () => {
  const { path, service } = fixture();
  const input = {
    activationId: 'activation-a',
    idempotencyKey: 'start-1',
    requestedTools: ['mcp:read'],
    requestedResources: ['resource:public'],
    concurrencyKey: 'exclusive'
  };
  let run = await service.start(scope, owner, input);
  const replay = await service.start(scope, owner, input);
  assert.deepEqual(replay, run);
  run = await service.process(scope, scheduler, run.id, 'process-1', input.activationId);
  assert.equal(run.status, 'completed');
  assert.equal(run.receipts.length, 3);
  assert.equal(run.receipts[1].previousReceiptSha256, run.receipts[0].receiptSha256);
  assert.equal(run.receipts[2].previousReceiptSha256, run.receipts[1].receiptSha256);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_run_receipts;'
    })
      .toString()
      .trim(),
    '3'
  );
  assert.deepEqual(
    await service.process(scope, scheduler, run.id, 'process-1', input.activationId),
    run
  );
});

test('D1 repository denies cross-tenant reads, active concurrency collisions, and idempotency drift', async () => {
  const { service } = fixture();
  const run = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'start-1',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'exclusive'
  });
  await assert.rejects(
    service.start(scope, owner, {
      activationId: 'activation-a',
      idempotencyKey: 'start-2',
      requestedTools: [],
      requestedResources: [],
      concurrencyKey: 'exclusive'
    }),
    ControlRunConflictError
  );
  await assert.rejects(
    service.start(scope, owner, {
      activationId: 'activation-a',
      idempotencyKey: 'start-1',
      requestedTools: ['mcp:read'],
      requestedResources: [],
      concurrencyKey: 'exclusive'
    }),
    ControlRunConflictError
  );
  await assert.rejects(
    service.get({ ...scope, tenantId: 'tenant-b' }, owner, run.id),
    /not found/i
  );
});

test('D1 command replay records a conflict when stop wins an in-flight process race', async () => {
  let release: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let signalExecutionBegan: (() => void) | undefined;
  const executionBegan = new Promise<void>((resolve) => {
    signalExecutionBegan = resolve;
  });
  const { path, service } = fixture({
    supports: () => true,
    async execute() {
      signalExecutionBegan?.();
      await blocked;
      return { type: 'completed', outcome: 'late result', verifier: 'provider' };
    }
  });
  const run = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'start-race',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'race'
  });
  const processing = service.process(scope, scheduler, run.id, 'process-race', 'activation-a');
  await executionBegan;
  await service.stop(scope, owner, run.id, 'stop-race', 'operator stop');
  release?.();

  await assert.rejects(processing, ControlRunConflictError);
  await assert.rejects(
    service.process(scope, scheduler, run.id, 'process-race', 'activation-a'),
    ControlRunConflictError
  );
  assert.equal((await service.get(scope, owner, run.id)).status, 'stopped');
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: "SELECT result_json FROM control_run_commands WHERE idempotency_key='process-race';"
    })
      .toString()
      .trim(),
    '{"error":"concurrent_update"}'
  );
});

const runtimeDigest = (value: string): `sha256:${string}` =>
  `sha256:${value.repeat(64).slice(0, 64)}`;

function trustedRuntimeManifestAuthority(
  entries: ReadonlyArray<{ digest: RuntimeDigest; manifest: WorkflowRuntimeManifest }>
) {
  return {
    async findByRuntimeManifestSha256(digest: RuntimeDigest) {
      return entries.find((entry) => entry.digest === digest)?.manifest;
    }
  };
}

const runtimeManifest = parseWorkflowRuntimeManifest({
  schemaVersion: 'workflow_runtime_manifest.v0.1',
  runtimeCompatibility: 'workflow-runtime.v0.1',
  target: 'create-something/control-runtime.v1',
  workflow: {
    id: 'control.d1.fixture',
    version: '0.1.0',
    definitionHash: runtimeDigest('a'),
    compilerVersion: 'workflow-compiler-v0.1',
    compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
  },
  artifacts: {
    governedInteractionSha256: runtimeDigest('b'),
    decisionInventorySha256: runtimeDigest('c'),
    approvalSurfacesSha256: runtimeDigest('d'),
    toolContractsSha256: runtimeDigest('e')
  },
  steps: [
    {
      id: 'collect',
      actionId: 'collect',
      dependsOn: [],
      disposition: 'pass',
      capability: { id: 'fixture:collect', parameterDigest: runtimeDigest('f') },
      evidenceDigest: runtimeDigest('1'),
      recovery: 'manual_fallback'
    }
  ]
});

const templateReviewRuntimeManifest = parseWorkflowRuntimeManifest({
  schemaVersion: 'workflow_runtime_manifest.v0.2',
  runtimeCompatibility: 'workflow-runtime.v0.2',
  target: 'create-something/control-runtime.v1',
  workflow: {
    id: 'template-review.queue.observe',
    version: '0.1.0',
    definitionHash: runtimeDigest('a'),
    compilerVersion: 'workflow-compiler-v0.1',
    compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
  },
  artifacts: {
    governedInteractionSha256: runtimeDigest('b'),
    decisionInventorySha256: runtimeDigest('c'),
    approvalSurfacesSha256: runtimeDigest('d'),
    toolContractsSha256: runtimeDigest('e')
  },
  steps: [
    {
      id: 'observe',
      actionId: 'observe_template_review_queue',
      dependsOn: [],
      disposition: 'pass',
      capability: { id: 'template-review.queue.observe.v1', parameterDigest: runtimeDigest('f') },
      evidenceDigest: runtimeDigest('1'),
      recovery: 'manual_fallback'
    }
  ]
});

function checkpointStore(path: string, manifest = runtimeManifest) {
  return new D1WorkflowRuntimeCheckpointStore(
    d1(path),
    trustedRuntimeManifestAuthority([{ digest: runtimeDigest('8'), manifest }])
  );
}

async function persistedTemplateReviewAttempt(input: ReturnType<typeof fixture>) {
  const parent = await input.service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'template-review-parent',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'template-review-observe'
  });
  const initial = await createWorkflowRuntimeRun(templateReviewRuntimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = checkpointStore(input.path, templateReviewRuntimeManifest);
  await store.apply({
    scope,
    run: initial,
    expectedVersion: null,
    idempotencyKey: 'template-review-admit',
    commandDigest: 'a'.repeat(64)
  });
  const plan = await planWorkflowRuntimeStep(templateReviewRuntimeManifest, initial);
  assert.equal(plan.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(templateReviewRuntimeManifest, initial, {
    type: 'effect_intent',
    stepId: 'observe',
    attemptId: 'template-review-attempt-1',
    capability: plan.capability,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  await store.apply({
    scope,
    run: prepared,
    expectedVersion: initial.version,
    idempotencyKey: 'template-review-intent',
    commandDigest: 'b'.repeat(64)
  });
  return { parent, plan, prepared };
}

test('D1 checkpoint store survives a process restart, replays exactly, and retains the core receipt chain', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-runtime',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = checkpointStore(path);
  const admitted = await store.apply({
    scope,
    run: initial,
    expectedVersion: null,
    idempotencyKey: 'runtime-admit',
    commandDigest: 'a'.repeat(64)
  });
  assert.equal(admitted.applied, true);
  assert.deepEqual(
    await new D1WorkflowRuntimeCheckpointStore(d1(path)).find(scope, parent.id),
    initial
  );
  assert.deepEqual(await store.replay(scope, 'runtime-admit', 'a'.repeat(64)), initial);

  const planned = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'attempt-1',
    capability: { id: 'fixture:collect', parameterDigest: runtimeDigest('f') },
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const committed = await store.apply({
    scope,
    run: planned,
    expectedVersion: initial.version,
    idempotencyKey: 'runtime-intent',
    commandDigest: 'b'.repeat(64)
  });
  assert.equal(committed.run.version, 2);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_checkpoints;'
    })
      .toString()
      .trim(),
    '2'
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_receipts;'
    })
      .toString()
      .trim(),
    '2'
  );
  await assert.rejects(
    store.replay(scope, 'runtime-admit', 'c'.repeat(64)),
    /Idempotency key was already used/
  );
});

test('D1 refuses a child transition while its parent Control run is stopped or recovering', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-runtime-stopped',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-stopped'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = checkpointStore(path);
  await store.apply({
    scope,
    run: initial,
    expectedVersion: null,
    idempotencyKey: 'stopped-parent-admission',
    commandDigest: 'a'.repeat(64)
  });
  await service.stop(scope, owner, parent.id, 'stop-runtime-parent', 'operator stopped parent run');
  const definition = runtimeManifest.steps[0];
  assert.equal(definition.disposition, 'pass');
  const intent = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'parent-stopped-attempt',
    capability: definition.capability,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  await assert.rejects(
    store.apply({
      scope,
      run: intent,
      expectedVersion: initial.version,
      idempotencyKey: 'stopped-parent-intent',
      commandDigest: 'b'.repeat(64)
    }),
    /parent Control run no longer authorizes progress/
  );
  await service.beginRecovery(
    scope,
    owner,
    parent.id,
    'begin-runtime-parent-recovery',
    'operator reconciliation'
  );
  await assert.rejects(
    store.apply({
      scope,
      run: intent,
      expectedVersion: initial.version,
      idempotencyKey: 'recovering-parent-intent',
      commandDigest: 'c'.repeat(64)
    }),
    /parent Control run no longer authorizes progress/
  );
  assert.deepEqual(await store.find(scope, parent.id), initial);
});

test('D1 leaves a stale operator-stop command retryable until it commits the latest checkpoint', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-runtime-stop',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-stop'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = checkpointStore(path);
  await store.apply({
    scope,
    run: initial,
    expectedVersion: null,
    idempotencyKey: 'stop-admit',
    commandDigest: 'a'.repeat(64)
  });
  const initialDefinition = runtimeManifest.steps[0];
  assert.equal(initialDefinition.disposition, 'pass');
  const advanced = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'stop-advance',
    capability: initialDefinition.capability,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  await store.apply({
    scope,
    run: advanced,
    expectedVersion: initial.version,
    idempotencyKey: 'stop-advance',
    commandDigest: 'b'.repeat(64)
  });
  const staleStop = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'stop_requested',
    stepId: 'collect',
    reason: 'operator stop',
    actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  await assert.rejects(
    store.apply({
      scope,
      run: staleStop,
      expectedVersion: initial.version,
      idempotencyKey: 'operator-stop',
      commandDigest: 'c'.repeat(64)
    }),
    /Runtime run changed concurrently/
  );
  await assert.rejects(
    store.apply({
      scope,
      run: staleStop,
      expectedVersion: initial.version,
      idempotencyKey: 'operator-stop',
      commandDigest: 'd'.repeat(64)
    }),
    /Idempotency key was already used for another command/
  );
  const current = await store.find(scope, parent.id);
  assert.equal(current?.version, advanced.version);
  const stopped = await reduceWorkflowRuntimeRun(runtimeManifest, current!, {
    type: 'stop_requested',
    stepId: 'collect',
    reason: 'operator stop',
    actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:03.000Z'
  });
  const committed = await store.apply({
    scope,
    run: stopped,
    expectedVersion: current!.version,
    idempotencyKey: 'operator-stop',
    commandDigest: 'c'.repeat(64)
  });
  assert.equal(committed.applied, true);
  assert.equal(committed.run.status, 'blocked');
  assert.deepEqual(await store.replay(scope, 'operator-stop', 'c'.repeat(64)), committed.run);
});

test('D1 checkpoint idempotency is unique across the complete Control scope', async () => {
  const { path, service } = fixture();
  const firstParent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-runtime-first',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-first'
  });
  const secondParent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-runtime-second',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-second'
  });
  const store = checkpointStore(path);
  for (const [runId, key, digest] of [
    [firstParent.id, 'scope-first', 'a'],
    [secondParent.id, 'scope-second', 'b']
  ] as const) {
    const run = await createWorkflowRuntimeRun(runtimeManifest, {
      runId,
      activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
      registration: {
        buildReleaseId: 'release-a',
        contractSha256: runtimeDigest('7'),
        runtimePolicySha256: runtimeDigest('6')
      },
      artifactManifestSha256: runtimeDigest('7'),
      runtimeManifestSha256: runtimeDigest('8'),
      clock: '2026-08-25T00:00:00.000Z'
    });
    await store.apply({
      scope,
      run,
      expectedVersion: null,
      idempotencyKey: key,
      commandDigest: digest.repeat(64)
    });
  }
  assert.throws(
    () =>
      execFileSync('sqlite3', ['-bail', path], {
        input: `INSERT INTO control_workflow_runtime_commands
        (id, run_id, account_id, tenant_id, workspace_account_id, idempotency_key,
         command_sha256, expected_version, result_json, created_at)
        VALUES ('duplicate-scope-key', '${secondParent.id}', 'account-a', 'tenant-a', 'workspace-a',
          'scope-first', '${'c'.repeat(64)}', 1, NULL, '2026-08-25T00:00:00.000Z');`,
        encoding: 'utf8'
      }),
    /UNIQUE constraint failed/
  );
});

test('D1 refuses a runtime admission whose frozen parent activation does not match', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-activation-match',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-activation-match'
  });
  const run = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'forged-activation', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  await assert.rejects(
    checkpointStore(path).apply({
      scope,
      run,
      expectedVersion: null,
      idempotencyKey: 'forged-activation-admission',
      commandDigest: 'a'.repeat(64)
    }),
    /Workflow Runtime command did not persist/
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    })
      .toString()
      .trim(),
    '0'
  );
});

test('D1 refuses a runtime admission whose artifact manifest is not frozen into its parent activation', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-artifact-match',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-artifact-match'
  });
  const run = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('3'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  await assert.rejects(
    checkpointStore(path).apply({
      scope,
      run,
      expectedVersion: null,
      idempotencyKey: 'forged-artifact-admission',
      commandDigest: 'a'.repeat(64)
    }),
    /Workflow Runtime command did not persist/
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    })
      .toString()
      .trim(),
    '0'
  );
});

test('D1 admission verifies the frozen runtime-manifest schema through its trusted authority', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-runtime-schema-match',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-schema-match'
  });
  const run = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const schemaMismatchedManifest = parseWorkflowRuntimeManifest({
    ...runtimeManifest,
    schemaVersion: 'workflow_runtime_manifest.v0.2',
    runtimeCompatibility: 'workflow-runtime.v0.2'
  });
  await assert.rejects(
    checkpointStore(path, schemaMismatchedManifest).apply({
      scope,
      run,
      expectedVersion: null,
      idempotencyKey: 'runtime-schema-mismatch-admission',
      commandDigest: 'a'.repeat(64)
    }),
    /invalid registration/
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    })
      .toString()
      .trim(),
    '0'
  );
});

test('D1 refuses a runtime admission whose Build registration is not frozen into its parent activation', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-registration-match',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-registration-match'
  });
  for (const registration of [
    {
      buildReleaseId: 'forged-release',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('9'),
      runtimePolicySha256: runtimeDigest('6')
    }
  ]) {
    const run = await createWorkflowRuntimeRun(runtimeManifest, {
      runId: parent.id,
      activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
      registration,
      artifactManifestSha256: runtimeDigest('7'),
      runtimeManifestSha256: runtimeDigest('8'),
      clock: '2026-08-25T00:00:00.000Z'
    });
    await assert.rejects(
      checkpointStore(path).apply({
        scope,
        run,
        expectedVersion: null,
        idempotencyKey: `forged-registration-${registration.buildReleaseId}`,
        commandDigest: registration.contractSha256.slice(7)
      }),
      /Workflow Runtime command did not persist/
    );
  }
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    })
      .toString()
      .trim(),
    '0'
  );
});

test('D1 does not accept a second admission command for an existing runtime checkpoint', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-existing-runtime',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-existing'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = checkpointStore(path);
  await store.apply({
    scope,
    run: initial,
    expectedVersion: null,
    idempotencyKey: 'existing-runtime-admission',
    commandDigest: 'a'.repeat(64)
  });
  const forged = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'forged-activation', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  await assert.rejects(
    store.apply({
      scope,
      run: forged,
      expectedVersion: null,
      idempotencyKey: 'forged-existing-runtime-admission',
      commandDigest: 'b'.repeat(64)
    }),
    /Workflow Runtime command did not persist/
  );
  assert.deepEqual(await store.find(scope, parent.id), initial);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_commands;'
    })
      .toString()
      .trim(),
    '1'
  );
});

test('D1 rolls back a losing same-key admission without leaving an orphaned runtime row', async () => {
  const { path, service } = fixture();
  const [firstParent, secondParent] = await Promise.all([
    service.start(scope, owner, {
      activationId: 'activation-a',
      idempotencyKey: 'parent-race-first',
      requestedTools: [],
      requestedResources: [],
      concurrencyKey: 'runtime-race-first'
    }),
    service.start(scope, owner, {
      activationId: 'activation-a',
      idempotencyKey: 'parent-race-second',
      requestedTools: [],
      requestedResources: [],
      concurrencyKey: 'runtime-race-second'
    })
  ]);
  const store = checkpointStore(path);
  const create = (runId: string) =>
    createWorkflowRuntimeRun(runtimeManifest, {
      runId,
      activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
      registration: {
        buildReleaseId: 'release-a',
        contractSha256: runtimeDigest('7'),
        runtimePolicySha256: runtimeDigest('6')
      },
      artifactManifestSha256: runtimeDigest('7'),
      runtimeManifestSha256: runtimeDigest('8'),
      clock: '2026-08-25T00:00:00.000Z'
    });
  const [first, second] = await Promise.all(
    [firstParent.id, secondParent.id].map(async (runId) =>
      store.apply({
        scope,
        run: await create(runId),
        expectedVersion: null,
        idempotencyKey: 'shared-admission',
        commandDigest: 'a'.repeat(64)
      })
    )
  );
  assert.equal(first.run.id, second.run.id);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    })
      .toString()
      .trim(),
    '1'
  );
});

test('D1 checkpoint store records the exact approval binding and decision without an executable request', async () => {
  const longRunId = 'r'.repeat(65);
  const longReviewStepId = 'review-'.padEnd(160, 'r');
  const { path, service } = fixture(undefined, () => longRunId);
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a',
    idempotencyKey: 'parent-approval',
    requestedTools: [],
    requestedResources: [],
    concurrencyKey: 'runtime-approval'
  });
  const manifest = parseWorkflowRuntimeManifest({
    ...runtimeManifest,
    workflow: { ...runtimeManifest.workflow, id: 'control.d1.approval' },
    steps: [
      runtimeManifest.steps[0],
      {
        id: longReviewStepId,
        actionId: 'review',
        dependsOn: ['collect'],
        disposition: 'wait',
        approval: { policyId: 'account-owner', expiresAt: '2026-08-26T00:00:00.000Z' },
        evidenceDigest: runtimeDigest('2'),
        recovery: 'manual_fallback'
      }
    ]
  });
  const initial = await createWorkflowRuntimeRun(manifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    registration: {
      buildReleaseId: 'release-a',
      contractSha256: runtimeDigest('7'),
      runtimePolicySha256: runtimeDigest('6')
    },
    artifactManifestSha256: runtimeDigest('7'),
    runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = new D1WorkflowRuntimeCheckpointStore(
    d1(path),
    trustedRuntimeManifestAuthority([{ digest: runtimeDigest('8'), manifest }])
  );
  await store.apply({
    scope,
    run: initial,
    expectedVersion: null,
    idempotencyKey: 'approval-admit',
    commandDigest: 'c'.repeat(64)
  });
  const pass = await planWorkflowRuntimeStep(manifest, initial);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(manifest, initial, {
    type: 'effect_intent',
    stepId: 'collect',
    attemptId: 'approval-attempt',
    capability: pass.capability,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  await store.apply({
    scope,
    run: prepared,
    expectedVersion: initial.version,
    idempotencyKey: 'approval-intent',
    commandDigest: 'd'.repeat(64)
  });
  const collected = await reduceWorkflowRuntimeRun(manifest, prepared, {
    type: 'step_succeeded',
    stepId: 'collect',
    attemptId: 'approval-attempt',
    verifier: 'fixture-verifier',
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  await store.apply({
    scope,
    run: collected,
    expectedVersion: prepared.version,
    idempotencyKey: 'approval-collected',
    commandDigest: 'e'.repeat(64)
  });
  const wait = await planWorkflowRuntimeStep(manifest, collected);
  assert.equal(wait.type, 'wait');
  assert.equal('capability' in wait, false);
  const waiting = await reduceWorkflowRuntimeRun(manifest, collected, {
    type: 'wait_created',
    stepId: longReviewStepId,
    approval: wait.approval,
    observedAt: '2026-08-25T00:00:03.000Z'
  });
  await assert.rejects(
    new D1WorkflowRuntimeCheckpointStore(d1(path)).apply({
      scope,
      run: waiting,
      expectedVersion: collected.version,
      idempotencyKey: 'approval-wait-without-trusted-manifest',
      commandDigest: '0'.repeat(64)
    }),
    /requires a trusted manifest authority/
  );
  await store.apply({
    scope,
    run: waiting,
    expectedVersion: collected.version,
    idempotencyKey: 'approval-wait',
    commandDigest: 'f'.repeat(64)
  });
  const decided = await reduceWorkflowRuntimeRun(manifest, waiting, {
    type: 'approval_decided',
    stepId: longReviewStepId,
    approvalId: wait.approval.id,
    approvalBindingSha256: wait.approval.bindingSha256,
    decision: 'approved',
    actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:04.000Z'
  });
  await store.apply({
    scope,
    run: decided,
    expectedVersion: waiting.version,
    idempotencyKey: 'approval-decide',
    commandDigest: '1'.repeat(64)
  });
  assert.equal(decided.status, 'completed');
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: "SELECT decision || ':' || binding_sha256 FROM control_workflow_runtime_approvals;"
    })
      .toString()
      .trim(),
    `approved:${wait.approval.bindingSha256}`
  );
  const proof = await new D1WorkflowRuntimeProofReader(
    d1(path),
    trustedRuntimeManifestAuthority([{ digest: runtimeDigest('8'), manifest }])
  ).find({
    scope,
    runId: parent.id
  });
  assert.ok(proof);
  const approvalContext = {
    schema: 'create-something/workflow-runtime-approval-context@2' as const,
    version: 2 as const,
    scope,
    runVersion: waiting.version,
    stepVersion: waiting.steps[1]?.version,
    attempt: { type: 'no_capability_attempt' as const },
    activation: waiting.activation,
    registration: waiting.registration,
    artifactManifestSha256: waiting.artifactManifestSha256,
    runtimeManifestSha256: waiting.runtimeManifestSha256,
    runtimeManifestSchema: manifest.schemaVersion,
    workflow: manifest.workflow,
    actionId: 'review',
    evidenceDigest: runtimeDigest('2')
  };
  assert.deepEqual(proof.approvals, [
    {
      id: wait.approval.id,
      stepId: longReviewStepId,
      bindingSha256: wait.approval.bindingSha256,
      policyId: 'account-owner',
      expiresAt: '2026-08-26T00:00:00.000Z',
      decision: 'approved',
      createdAt: '2026-08-25T00:00:03.000Z',
      decidedAt: '2026-08-25T00:00:04.000Z',
      context: approvalContext
    }
  ]);
  assert.equal(wait.approval.id.length, 238);
  assert.equal(proof.steps[1]?.pendingApproval, null);
  assert.equal(JSON.stringify(proof).includes(owner.subject), false);
  assert.equal(JSON.stringify(proof).includes('outcome'), false);
  const crossScopeContext = JSON.stringify({
    ...approvalContext,
    scope: { ...scope, tenantId: 'other-tenant' }
  }).replaceAll("'", "''");
  execFileSync('sqlite3', [path], {
    input: `DROP TRIGGER control_workflow_runtime_approval_identity_is_immutable;
      DROP TRIGGER control_workflow_runtime_approval_context_is_immutable;
      UPDATE control_workflow_runtime_approvals
      SET approval_context_json = '${crossScopeContext}'
      WHERE approval_id = '${wait.approval.id}';`
  });
  await assert.rejects(
    new D1WorkflowRuntimeProofReader(
      d1(path),
      trustedRuntimeManifestAuthority([{ digest: runtimeDigest('8'), manifest }])
    ).find({ scope, runId: parent.id }),
    /approval context scope mismatches/
  );
});

test('the A3 observation adapter records one prepared attempt before accepting only a verified count-only projection', async () => {
  const input = fixture();
  const { parent, plan, prepared } = await persistedTemplateReviewAttempt(input);
  const verifierCalls: unknown[] = [];
  const wrongRegistration = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return { type: 'unverified', failureCode: 'not_called' } as const;
      }
    },
    { capabilityParameterDigest: runtimeDigest('e') },
    activeControlActivationAuthority(input.path)
  );
  await assert.rejects(
    wrongRegistration.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    /exact prepared pass attempt/
  );
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify(value) {
        verifierCalls.push(value);
        return {
          type: 'verified',
          verifier: 'template-review-source-projection',
          evidenceSha256: runtimeDigest('2')
        };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );

  const [firstPreparation, duplicate] = await Promise.all([
    adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    })
  ]);
  assert.equal(firstPreparation.type, 'preflight');
  assert.deepEqual(duplicate, firstPreparation);
  const dispatch = firstPreparation.intent;
  assert.deepEqual(dispatch.parameters, {
    status: 'ready_to_review',
    assigned: 'any',
    sort: 'submittedDate_desc',
    limit: 5
  });
  assert.equal('source' in dispatch, false);
  assert.match(dispatch.requestSha256, /^sha256:[a-f0-9]{64}$/);
  assert.match(dispatch.sourceIdempotencyKey, /^template-review-observation:/);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_dispatches;'
    })
      .toString()
      .trim(),
    '1'
  );

  const projection = {
    schema: 'create-something/template-review-queue-projection@1',
    dataClassification: 'count_only_redacted',
    attemptId: dispatch.attemptId,
    requestSha256: dispatch.requestSha256,
    source: {
      service: 'webflow-template-review-mcp',
      resource: 'template-review-queue',
      tool: 'template_review_list_queue',
      invocationSha256: runtimeDigest('5')
    },
    parameters: dispatch.parameters,
    observedItemCount: 2,
    responseSha256: runtimeDigest('3'),
    sourceInvocationEvidenceSha256: runtimeDigest('4')
  } as const;
  await assert.rejects(
    adapter.recordProjection({
      scope,
      dispatch,
      projection: { ...projection, records: [{ reviewer: 'private@example.com' }] }
    }),
    /count-only schema/
  );
  const result = await adapter.recordProjection({ scope, dispatch, projection });
  assert.deepEqual(result, {
    type: 'verified',
    verifier: 'template-review-source-projection',
    evidenceSha256: runtimeDigest('2'),
    sourceInvocationSha256: runtimeDigest('5'),
    sourceInvocationEvidenceSha256: runtimeDigest('4'),
    observedItemCount: 2,
    responseSha256: runtimeDigest('3')
  });
  assert.equal(verifierCalls.length, 1);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: "SELECT status || ':' || observed_item_count FROM control_workflow_runtime_dispatches;"
    })
      .toString()
      .trim(),
    'verified:2'
  );
  assert.equal(parent.status, 'queued');
  assert.deepEqual(
    await adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    { type: 'terminal', result }
  );
});

test('the A3 observation adapter refuses a late source projection after its parent Control run stops', async () => {
  const input = fixture();
  const { parent, plan, prepared } = await persistedTemplateReviewAttempt(input);
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return {
          type: 'verified',
          verifier: 'template-review-source-projection',
          evidenceSha256: runtimeDigest('2')
        };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const dispatch = preparation.intent;
  await input.service.stop(
    scope,
    owner,
    parent.id,
    'template-review-stop',
    'operator stopped observation'
  );
  await assert.rejects(
    adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    /no longer authorizes/
  );
  await assert.rejects(
    adapter.recordProjection({
      scope,
      dispatch,
      projection: {
        schema: 'create-something/template-review-queue-projection@1',
        dataClassification: 'count_only_redacted',
        attemptId: dispatch.attemptId,
        requestSha256: dispatch.requestSha256,
        source: {
          service: 'webflow-template-review-mcp',
          resource: 'template-review-queue',
          tool: 'template_review_list_queue',
          invocationSha256: runtimeDigest('5')
        },
        parameters: dispatch.parameters,
        observedItemCount: 1,
        responseSha256: runtimeDigest('3'),
        sourceInvocationEvidenceSha256: runtimeDigest('4')
      }
    }),
    /no longer authorizes/
  );
});

test('the A3 observation adapter does not replay a prepared dispatch after the durable runtime stops', async () => {
  const input = fixture();
  const { parent, plan, prepared } = await persistedTemplateReviewAttempt(input);
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return {
          type: 'verified',
          verifier: 'template-review-source-projection',
          evidenceSha256: runtimeDigest('2')
        };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const store = checkpointStore(input.path, templateReviewRuntimeManifest);
  const current = await store.find(scope, parent.id);
  assert.ok(current);
  const stopped = await reduceWorkflowRuntimeRun(templateReviewRuntimeManifest, current, {
    type: 'stop_requested',
    stepId: 'observe',
    reason: 'operator stopped observation',
    actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  await store.apply({
    scope,
    run: stopped,
    expectedVersion: current.version,
    idempotencyKey: 'template-review-runtime-stop',
    commandDigest: 'c'.repeat(64)
  });
  assert.equal((await input.service.get(scope, owner, parent.id)).status, 'queued');
  await assert.rejects(
    adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    /Current Workflow Runtime attempt no longer authorizes/
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: 'SELECT status FROM control_workflow_runtime_dispatches;'
    })
      .toString()
      .trim(),
    'prepared'
  );
});

test('the A3 observation adapter refuses a new or replayed dispatch after activation suspension', async () => {
  const input = fixture();
  const { plan, prepared } = await persistedTemplateReviewAttempt(input);
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return {
          type: 'verified',
          verifier: 'template-review-source-projection',
          evidenceSha256: runtimeDigest('2')
        };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  execFileSync('sqlite3', [input.path], {
    input: "UPDATE customer_control_activations SET status = 'suspended' WHERE id = 'activation-a';"
  });
  await assert.rejects(
    adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    /Frozen Agency activation no longer authorizes/
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: 'SELECT status FROM control_workflow_runtime_dispatches;'
    })
      .toString()
      .trim(),
    'prepared'
  );
});

test('the A3 observation adapter retains an unverified projection as effect-unknown without a retry', async () => {
  const input = fixture();
  const { plan, prepared } = await persistedTemplateReviewAttempt(input);
  let verifierCalls = 0;
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        verifierCalls += 1;
        return { type: 'unverified', failureCode: 'source_correlation_unavailable' };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const dispatch = preparation.intent;
  const projection = {
    schema: 'create-something/template-review-queue-projection@1',
    dataClassification: 'count_only_redacted',
    attemptId: dispatch.attemptId,
    requestSha256: dispatch.requestSha256,
    source: {
      service: 'webflow-template-review-mcp',
      resource: 'template-review-queue',
      tool: 'template_review_list_queue',
      invocationSha256: runtimeDigest('5')
    },
    parameters: dispatch.parameters,
    observedItemCount: 1,
    responseSha256: runtimeDigest('3'),
    sourceInvocationEvidenceSha256: runtimeDigest('4')
  } as const;
  const result = await adapter.recordProjection({ scope, dispatch, projection });
  assert.deepEqual(result, {
    type: 'effect_unknown',
    failureCode: 'source_correlation_unavailable',
    sourceInvocationSha256: runtimeDigest('5'),
    sourceInvocationEvidenceSha256: runtimeDigest('4'),
    observedItemCount: 1,
    responseSha256: runtimeDigest('3')
  });
  assert.deepEqual(await adapter.recordProjection({ scope, dispatch, projection }), result);
  await assert.rejects(
    adapter.recordProjection({
      scope,
      dispatch,
      projection: { ...projection, responseSha256: runtimeDigest('9') }
    }),
    /conflicts with the durable observation result/
  );
  assert.equal(verifierCalls, 1);
  assert.deepEqual(
    await adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    { type: 'terminal', result }
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: "SELECT status || ':' || failure_code FROM control_workflow_runtime_dispatches;"
    })
      .toString()
      .trim(),
    'effect_unknown:source_correlation_unavailable'
  );
});

test('the A3 observation adapter turns unsafe verifier failure details into a safe machine code', async () => {
  const input = fixture();
  const { plan, prepared } = await persistedTemplateReviewAttempt(input);
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return { type: 'unverified', failureCode: 'private@example.com' };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const dispatch = preparation.intent;
  const result = await adapter.recordProjection({
    scope,
    dispatch,
    projection: {
      schema: 'create-something/template-review-queue-projection@1',
      dataClassification: 'count_only_redacted',
      attemptId: dispatch.attemptId,
      requestSha256: dispatch.requestSha256,
      source: {
        service: 'webflow-template-review-mcp',
        resource: 'template-review-queue',
        tool: 'template_review_list_queue',
        invocationSha256: runtimeDigest('5')
      },
      parameters: dispatch.parameters,
      observedItemCount: 1,
      responseSha256: runtimeDigest('3'),
      sourceInvocationEvidenceSha256: runtimeDigest('4')
    }
  });
  assert.equal(result.type, 'effect_unknown');
  assert.equal(result.failureCode, 'source_verifier_unavailable');
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: 'SELECT failure_code FROM control_workflow_runtime_dispatches;'
    })
      .toString()
      .trim(),
    'source_verifier_unavailable'
  );
});

test('the A3 observation adapter turns an unsafe verifier label into an ambiguous result', async () => {
  const input = fixture();
  const { plan, prepared } = await persistedTemplateReviewAttempt(input);
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return {
          type: 'verified',
          verifier: 'private@example.com',
          evidenceSha256: runtimeDigest('2')
        };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const dispatch = preparation.intent;
  const result = await adapter.recordProjection({
    scope,
    dispatch,
    projection: {
      schema: 'create-something/template-review-queue-projection@1',
      dataClassification: 'count_only_redacted',
      attemptId: dispatch.attemptId,
      requestSha256: dispatch.requestSha256,
      source: {
        service: 'webflow-template-review-mcp',
        resource: 'template-review-queue',
        tool: 'template_review_list_queue',
        invocationSha256: runtimeDigest('5')
      },
      parameters: dispatch.parameters,
      observedItemCount: 1,
      responseSha256: runtimeDigest('3'),
      sourceInvocationEvidenceSha256: runtimeDigest('4')
    }
  });
  assert.equal(result.type, 'effect_unknown');
  assert.equal(result.failureCode, 'source_verifier_unavailable');
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input:
        "SELECT COALESCE(verifier, '') || ':' || failure_code FROM control_workflow_runtime_dispatches;"
    })
      .toString()
      .trim(),
    ':source_verifier_unavailable'
  );
});

test('the A3 observation adapter persists a verifier result when stop races verification', async () => {
  const input = fixture();
  const { parent, plan, prepared } = await persistedTemplateReviewAttempt(input);
  let releaseVerification: (() => void) | undefined;
  const verificationReleased = new Promise<void>((resolve) => {
    releaseVerification = resolve;
  });
  let signalVerificationStarted: (() => void) | undefined;
  const verificationStarted = new Promise<void>((resolve) => {
    signalVerificationStarted = resolve;
  });
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        signalVerificationStarted?.();
        await verificationReleased;
        return {
          type: 'verified',
          verifier: 'template-review-source-projection',
          evidenceSha256: runtimeDigest('2')
        };
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const dispatch = preparation.intent;
  const projection = {
    schema: 'create-something/template-review-queue-projection@1',
    dataClassification: 'count_only_redacted',
    attemptId: dispatch.attemptId,
    requestSha256: dispatch.requestSha256,
    source: {
      service: 'webflow-template-review-mcp',
      resource: 'template-review-queue',
      tool: 'template_review_list_queue',
      invocationSha256: runtimeDigest('5')
    },
    parameters: dispatch.parameters,
    observedItemCount: 1,
    responseSha256: runtimeDigest('3'),
    sourceInvocationEvidenceSha256: runtimeDigest('4')
  } as const;
  const recording = adapter.recordProjection({ scope, dispatch, projection });
  await verificationStarted;
  await input.service.stop(
    scope,
    owner,
    parent.id,
    'template-review-stop-race',
    'operator stopped while verification was in progress'
  );
  releaseVerification?.();
  const result = await recording;
  assert.deepEqual(result, {
    type: 'verified',
    verifier: 'template-review-source-projection',
    evidenceSha256: runtimeDigest('2'),
    sourceInvocationSha256: runtimeDigest('5'),
    sourceInvocationEvidenceSha256: runtimeDigest('4'),
    observedItemCount: 1,
    responseSha256: runtimeDigest('3')
  });
  assert.deepEqual(
    await adapter.prepare({
      scope,
      manifest: templateReviewRuntimeManifest,
      run: prepared,
      plan,
      attemptId: 'template-review-attempt-1'
    }),
    { type: 'terminal', result }
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', input.path], {
      input: "SELECT status || ':' || observed_item_count FROM control_workflow_runtime_dispatches;"
    })
      .toString()
      .trim(),
    'verified:1'
  );
});

test('the Proof reader exposes one redacted count-only A3 observation with exact Control identities', async () => {
  const input = fixture();
  const { parent, plan, prepared } = await persistedTemplateReviewAttempt(input);
  const adapter = new D1TemplateReviewQueueObservationAdapter(
    d1(input.path),
    {
      async verify() {
        return { type: 'unverified', failureCode: 'source_projection_unavailable' } as const;
      }
    },
    { capabilityParameterDigest: runtimeDigest('f') },
    activeControlActivationAuthority(input.path)
  );
  const preparation = await adapter.prepare({
    scope,
    manifest: templateReviewRuntimeManifest,
    run: prepared,
    plan,
    attemptId: 'template-review-attempt-1'
  });
  assert.equal(preparation.type, 'preflight');
  const intent = preparation.intent;
  await adapter.recordProjection({
    scope,
    dispatch: intent,
    projection: {
      schema: 'create-something/template-review-queue-projection@1',
      dataClassification: 'count_only_redacted',
      attemptId: intent.attemptId,
      requestSha256: intent.requestSha256,
      source: {
        service: 'webflow-template-review-mcp',
        resource: 'template-review-queue',
        tool: 'template_review_list_queue',
        invocationSha256: runtimeDigest('5')
      },
      parameters: intent.parameters,
      observedItemCount: 2,
      responseSha256: runtimeDigest('3'),
      sourceInvocationEvidenceSha256: runtimeDigest('4')
    }
  });

  const manifestAuthority = trustedRuntimeManifestAuthority([
    { digest: runtimeDigest('8'), manifest: templateReviewRuntimeManifest }
  ]);
  const proof = await new D1WorkflowRuntimeProofReader(d1(input.path), manifestAuthority).find({
    scope,
    runId: parent.id
  });
  assert.ok(proof);
  assert.equal(proof.schema, 'create-something/workflow-runtime-proof@1');
  assert.equal(proof.run.id, parent.id);
  assert.equal(proof.steps[0]?.attempts[0]?.id, 'template-review-attempt-1');
  assert.deepEqual(proof.capabilityObservations, [
    {
      runId: parent.id,
      stepId: 'observe',
      attemptId: 'template-review-attempt-1',
      capabilityId: 'template-review.queue.observe.v1',
      capabilityParameterSha256: runtimeDigest('f'),
      requestSha256: intent.requestSha256,
      status: 'effect_unknown',
      sourceInvocationSha256: runtimeDigest('5'),
      sourceInvocationEvidenceSha256: runtimeDigest('4'),
      responseSha256: runtimeDigest('3'),
      observedItemCount: 2,
      verifier: null,
      verifierEvidenceSha256: null,
      failureCode: 'source_projection_unavailable'
    }
  ]);
  const serialized = JSON.stringify(proof);
  assert.equal(serialized.includes('webflow-template-review-mcp'), false);
  assert.equal(serialized.includes('template_review_list_queue'), false);
  assert.equal(serialized.includes('actorSubject'), false);
  assert.equal(serialized.includes('outcome'), false);
  assert.equal(
    await new D1WorkflowRuntimeProofReader(d1(input.path), manifestAuthority).find({
      scope: { ...scope, tenantId: 'tenant-b' },
      runId: parent.id
    }),
    undefined
  );
  await assert.rejects(
    new D1WorkflowRuntimeProofReader(d1(input.path), trustedRuntimeManifestAuthority([])).find({
      scope,
      runId: parent.id
    }),
    /manifest is unavailable from the trusted authority/
  );
});
