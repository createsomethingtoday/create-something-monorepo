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
import { D1WorkflowRuntimeCheckpointStore } from '../src/workflow-runtime-store.js';
import { createWorkflowRuntimeRun, planWorkflowRuntimeStep, parseWorkflowRuntimeManifest, reduceWorkflowRuntimeRun } from '../../workflow-runtime/src/index.js';

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
  constructor(readonly path: string, readonly sql: string, readonly values: unknown[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.path, this.sql, values); }
  bound() { return bindSql(this.sql, this.values); }
  async first<T>() {
    const output = execFileSync('sqlite3', ['-json', this.path], { input: `PRAGMA foreign_keys=ON; ${this.bound()};`, encoding: 'utf8' }).trim();
    return (output ? (JSON.parse(output) as T[]) : [])[0] ?? null;
  }
  async all<T>() {
    const output = execFileSync('sqlite3', ['-json', this.path], { input: `PRAGMA foreign_keys=ON; ${this.bound()};`, encoding: 'utf8' }).trim();
    return { success: true, results: output ? (JSON.parse(output) as T[]) : [], meta: {} };
  }
}

function d1(path: string): D1Database {
  return {
    prepare(sql: string) { return new Statement(path, sql) as unknown as D1PreparedStatement; },
    async batch(statements: D1PreparedStatement[]) {
      const body = statements.map((statement) => (statement as unknown as Statement).bound()).join(';\n');
      execFileSync('sqlite3', ['-bail', path], { input: `PRAGMA foreign_keys=ON; BEGIN IMMEDIATE; ${body}; COMMIT;`, encoding: 'utf8' });
      return statements.map(() => ({ success: true, meta: { changes: 1 } })) as D1Result<unknown>[];
    }
  } as unknown as D1Database;
}

const scope: ControlScope = { accountId: 'account-a', tenantId: 'tenant-a', workspaceAccountId: 'workspace-a' };
const owner: ControlActor = { subject: 'owner-a', role: 'account_owner' };
const scheduler: ControlActor = { subject: 'scheduler-a', role: 'control_scheduler' };

function fixture(executor?: ControlRunExecutor) {
  const path = join(mkdtempSync(join(tmpdir(), 'control-run-d1-')), 'runtime.sqlite');
  const migration = readFileSync(new URL('../migrations/0003_control_run_lifecycle.sql', import.meta.url), 'utf8');
  const workflowRuntimeMigration = readFileSync(new URL('../migrations/0004_control_workflow_runtime_zero_write.sql', import.meta.url), 'utf8');
  execFileSync('sqlite3', [path], {
    input: `PRAGMA foreign_keys=ON;
      ${migration}
      ${workflowRuntimeMigration}
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
        'release-a', '${'3'.repeat(64)}', '${'4'.repeat(64)}', 'acceptance-a', '${'5'.repeat(64)}',
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
      async execute() { return { type: 'completed', outcome: 'verified', verifier: 'golden-task' }; }
    },
    id: () => `id-${++id}`,
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
  assert.equal(execFileSync('sqlite3', ['-noheader', path], { input: 'SELECT COUNT(*) FROM control_run_receipts;' }).toString().trim(), '3');
  assert.deepEqual(await service.process(scope, scheduler, run.id, 'process-1', input.activationId), run);
});

test('D1 repository denies cross-tenant reads, active concurrency collisions, and idempotency drift', async () => {
  const { service } = fixture();
  const run = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'start-1', requestedTools: [], requestedResources: [], concurrencyKey: 'exclusive'
  });
  await assert.rejects(
    service.start(scope, owner, {
      activationId: 'activation-a', idempotencyKey: 'start-2', requestedTools: [], requestedResources: [], concurrencyKey: 'exclusive'
    }),
    ControlRunConflictError
  );
  await assert.rejects(
    service.start(scope, owner, {
      activationId: 'activation-a', idempotencyKey: 'start-1', requestedTools: ['mcp:read'], requestedResources: [], concurrencyKey: 'exclusive'
    }),
    ControlRunConflictError
  );
  await assert.rejects(service.get({ ...scope, tenantId: 'tenant-b' }, owner, run.id), /not found/i);
});

test('D1 command replay records a conflict when stop wins an in-flight process race', async () => {
  let release: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  let signalExecutionBegan: (() => void) | undefined;
  const executionBegan = new Promise<void>((resolve) => { signalExecutionBegan = resolve; });
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
    }).toString().trim(),
    '{"error":"concurrent_update"}'
  );
});

const runtimeDigest = (value: string): `sha256:${string}` => `sha256:${value.repeat(64).slice(0, 64)}`;
const runtimeManifest = parseWorkflowRuntimeManifest({
  schemaVersion: 'workflow_runtime_manifest.v0.1',
  runtimeCompatibility: 'workflow-runtime.v0.1',
  target: 'create-something/control-runtime.v1',
  workflow: {
    id: 'control.d1.fixture', version: '0.1.0', definitionHash: runtimeDigest('a'),
    compilerVersion: 'workflow-compiler-v0.1', compiledBundleSchema: 'compiled_workflow_bundle.v0.3'
  },
  artifacts: {
    governedInteractionSha256: runtimeDigest('b'), decisionInventorySha256: runtimeDigest('c'),
    approvalSurfacesSha256: runtimeDigest('d'), toolContractsSha256: runtimeDigest('e')
  },
  steps: [{
    id: 'collect', actionId: 'collect', dependsOn: [], disposition: 'pass',
    capability: { id: 'fixture:collect', parameterDigest: runtimeDigest('f') },
    evidenceDigest: runtimeDigest('1'), recovery: 'manual_fallback'
  }]
});

test('D1 checkpoint store survives a process restart, replays exactly, and retains the core receipt chain', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'parent-runtime',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = new D1WorkflowRuntimeCheckpointStore(d1(path));
  const admitted = await store.apply({
    scope, run: initial, expectedVersion: null, idempotencyKey: 'runtime-admit', commandDigest: 'a'.repeat(64)
  });
  assert.equal(admitted.applied, true);
  assert.deepEqual(await new D1WorkflowRuntimeCheckpointStore(d1(path)).find(scope, parent.id), initial);
  assert.deepEqual(await store.replay(scope, 'runtime-admit', 'a'.repeat(64)), initial);

  const planned = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'effect_intent', stepId: 'collect', attemptId: 'attempt-1',
    capability: { id: 'fixture:collect', parameterDigest: runtimeDigest('f') },
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  const committed = await store.apply({
    scope, run: planned, expectedVersion: initial.version,
    idempotencyKey: 'runtime-intent', commandDigest: 'b'.repeat(64)
  });
  assert.equal(committed.run.version, 2);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: "SELECT COUNT(*) FROM control_workflow_runtime_checkpoints;"
    }).toString().trim(),
    '2'
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: "SELECT COUNT(*) FROM control_workflow_runtime_receipts;"
    }).toString().trim(),
    '2'
  );
  await assert.rejects(
    store.replay(scope, 'runtime-admit', 'c'.repeat(64)),
    /Idempotency key was already used/
  );
});

test('D1 leaves a stale operator-stop command retryable until it commits the latest checkpoint', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'parent-runtime-stop',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-stop'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = new D1WorkflowRuntimeCheckpointStore(d1(path));
  await store.apply({
    scope, run: initial, expectedVersion: null, idempotencyKey: 'stop-admit', commandDigest: 'a'.repeat(64)
  });
  const initialDefinition = runtimeManifest.steps[0];
  assert.equal(initialDefinition.disposition, 'pass');
  const advanced = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'effect_intent', stepId: 'collect', attemptId: 'stop-advance',
    capability: initialDefinition.capability,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  await store.apply({
    scope, run: advanced, expectedVersion: initial.version,
    idempotencyKey: 'stop-advance', commandDigest: 'b'.repeat(64)
  });
  const staleStop = await reduceWorkflowRuntimeRun(runtimeManifest, initial, {
    type: 'stop_requested', stepId: 'collect', reason: 'operator stop', actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  await assert.rejects(
    store.apply({
      scope, run: staleStop, expectedVersion: initial.version,
      idempotencyKey: 'operator-stop', commandDigest: 'c'.repeat(64)
    }),
    /Runtime run changed concurrently/
  );
  await assert.rejects(
    store.apply({
      scope, run: staleStop, expectedVersion: initial.version,
      idempotencyKey: 'operator-stop', commandDigest: 'd'.repeat(64)
    }),
    /Idempotency key was already used for another command/
  );
  const current = await store.find(scope, parent.id);
  assert.equal(current?.version, advanced.version);
  const stopped = await reduceWorkflowRuntimeRun(runtimeManifest, current!, {
    type: 'stop_requested', stepId: 'collect', reason: 'operator stop', actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:03.000Z'
  });
  const committed = await store.apply({
    scope, run: stopped, expectedVersion: current!.version,
    idempotencyKey: 'operator-stop', commandDigest: 'c'.repeat(64)
  });
  assert.equal(committed.applied, true);
  assert.equal(committed.run.status, 'blocked');
  assert.deepEqual(await store.replay(scope, 'operator-stop', 'c'.repeat(64)), committed.run);
});

test('D1 checkpoint idempotency is unique across the complete Control scope', async () => {
  const { path, service } = fixture();
  const firstParent = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'parent-runtime-first',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-first'
  });
  const secondParent = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'parent-runtime-second',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-second'
  });
  const store = new D1WorkflowRuntimeCheckpointStore(d1(path));
  for (const [runId, key, digest] of [
    [firstParent.id, 'scope-first', 'a'],
    [secondParent.id, 'scope-second', 'b']
  ] as const) {
    const run = await createWorkflowRuntimeRun(runtimeManifest, {
      runId,
      activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
      artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
      clock: '2026-08-25T00:00:00.000Z'
    });
    await store.apply({ scope, run, expectedVersion: null, idempotencyKey: key, commandDigest: digest.repeat(64) });
  }
  assert.throws(
    () => execFileSync('sqlite3', ['-bail', path], {
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
    activationId: 'activation-a', idempotencyKey: 'parent-activation-match',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-activation-match'
  });
  const run = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'forged-activation', version: 1, policySha256: runtimeDigest('6') },
    artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  await assert.rejects(
    new D1WorkflowRuntimeCheckpointStore(d1(path)).apply({
      scope, run, expectedVersion: null,
      idempotencyKey: 'forged-activation-admission', commandDigest: 'a'.repeat(64)
    }),
    /Workflow Runtime command did not persist/
  );
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    }).toString().trim(),
    '0'
  );
});

test('D1 does not accept a second admission command for an existing runtime checkpoint', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'parent-existing-runtime',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-existing'
  });
  const initial = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = new D1WorkflowRuntimeCheckpointStore(d1(path));
  await store.apply({
    scope, run: initial, expectedVersion: null,
    idempotencyKey: 'existing-runtime-admission', commandDigest: 'a'.repeat(64)
  });
  const forged = await createWorkflowRuntimeRun(runtimeManifest, {
    runId: parent.id,
    activation: { id: 'forged-activation', version: 1, policySha256: runtimeDigest('6') },
    artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  await assert.rejects(
    store.apply({
      scope, run: forged, expectedVersion: null,
      idempotencyKey: 'forged-existing-runtime-admission', commandDigest: 'b'.repeat(64)
    }),
    /Workflow Runtime command did not persist/
  );
  assert.deepEqual(await store.find(scope, parent.id), initial);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_commands;'
    }).toString().trim(),
    '1'
  );
});

test('D1 rolls back a losing same-key admission without leaving an orphaned runtime row', async () => {
  const { path, service } = fixture();
  const [firstParent, secondParent] = await Promise.all([
    service.start(scope, owner, {
      activationId: 'activation-a', idempotencyKey: 'parent-race-first',
      requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-race-first'
    }),
    service.start(scope, owner, {
      activationId: 'activation-a', idempotencyKey: 'parent-race-second',
      requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-race-second'
    })
  ]);
  const store = new D1WorkflowRuntimeCheckpointStore(d1(path));
  const create = (runId: string) =>
    createWorkflowRuntimeRun(runtimeManifest, {
      runId,
      activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
      artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
      clock: '2026-08-25T00:00:00.000Z'
    });
  const [first, second] = await Promise.all([firstParent.id, secondParent.id].map(async (runId) =>
    store.apply({
      scope, run: await create(runId), expectedVersion: null,
      idempotencyKey: 'shared-admission', commandDigest: 'a'.repeat(64)
    })
  ));
  assert.equal(first.run.id, second.run.id);
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'
    }).toString().trim(),
    '1'
  );
});

test('D1 checkpoint store records the exact approval binding and decision without an executable request', async () => {
  const { path, service } = fixture();
  const parent = await service.start(scope, owner, {
    activationId: 'activation-a', idempotencyKey: 'parent-approval',
    requestedTools: [], requestedResources: [], concurrencyKey: 'runtime-approval'
  });
  const manifest = parseWorkflowRuntimeManifest({
    ...runtimeManifest,
    workflow: { ...runtimeManifest.workflow, id: 'control.d1.approval' },
    steps: [
      runtimeManifest.steps[0],
      {
        id: 'review', actionId: 'review', dependsOn: ['collect'], disposition: 'wait',
        approval: { policyId: 'account-owner', expiresAt: '2026-08-26T00:00:00.000Z' },
        evidenceDigest: runtimeDigest('2'), recovery: 'manual_fallback'
      }
    ]
  });
  const initial = await createWorkflowRuntimeRun(manifest, {
    runId: parent.id,
    activation: { id: 'activation-a', version: 1, policySha256: runtimeDigest('6') },
    artifactManifestSha256: runtimeDigest('7'), runtimeManifestSha256: runtimeDigest('8'),
    clock: '2026-08-25T00:00:00.000Z'
  });
  const store = new D1WorkflowRuntimeCheckpointStore(d1(path));
  await store.apply({ scope, run: initial, expectedVersion: null, idempotencyKey: 'approval-admit', commandDigest: 'c'.repeat(64) });
  const pass = await planWorkflowRuntimeStep(manifest, initial);
  assert.equal(pass.type, 'pass');
  const prepared = await reduceWorkflowRuntimeRun(manifest, initial, {
    type: 'effect_intent', stepId: 'collect', attemptId: 'approval-attempt', capability: pass.capability,
    observedAt: '2026-08-25T00:00:01.000Z'
  });
  await store.apply({ scope, run: prepared, expectedVersion: initial.version, idempotencyKey: 'approval-intent', commandDigest: 'd'.repeat(64) });
  const collected = await reduceWorkflowRuntimeRun(manifest, prepared, {
    type: 'step_succeeded', stepId: 'collect', attemptId: 'approval-attempt', verifier: 'fixture-verifier',
    observedAt: '2026-08-25T00:00:02.000Z'
  });
  await store.apply({ scope, run: collected, expectedVersion: prepared.version, idempotencyKey: 'approval-collected', commandDigest: 'e'.repeat(64) });
  const wait = await planWorkflowRuntimeStep(manifest, collected);
  assert.equal(wait.type, 'wait');
  assert.equal('capability' in wait, false);
  const waiting = await reduceWorkflowRuntimeRun(manifest, collected, {
    type: 'wait_created', stepId: 'review', approval: wait.approval,
    observedAt: '2026-08-25T00:00:03.000Z'
  });
  await store.apply({ scope, run: waiting, expectedVersion: collected.version, idempotencyKey: 'approval-wait', commandDigest: 'f'.repeat(64) });
  const decided = await reduceWorkflowRuntimeRun(manifest, waiting, {
    type: 'approval_decided', stepId: 'review', approvalId: wait.approval.id,
    approvalBindingSha256: wait.approval.bindingSha256, decision: 'approved', actorSubject: owner.subject,
    observedAt: '2026-08-25T00:00:04.000Z'
  });
  await store.apply({ scope, run: decided, expectedVersion: waiting.version, idempotencyKey: 'approval-decide', commandDigest: '1'.repeat(64) });
  assert.equal(decided.status, 'completed');
  assert.equal(
    execFileSync('sqlite3', ['-noheader', path], {
      input: "SELECT decision || ':' || binding_sha256 FROM control_workflow_runtime_approvals;"
    }).toString().trim(),
    `approved:${wait.approval.bindingSha256}`
  );
});
