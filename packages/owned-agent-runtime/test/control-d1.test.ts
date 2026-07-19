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
  execFileSync('sqlite3', [path], {
    input: `PRAGMA foreign_keys=ON;
      ${migration}
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
