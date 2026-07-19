import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const migration = readFileSync(new URL('../migrations/0003_control_run_lifecycle.sql', import.meta.url), 'utf8');

test('Control activation binding is the Agency-owned D1', () => {
  const runtimeConfig = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const agencyConfig = readFileSync(new URL('../../agency/wrangler.jsonc', import.meta.url), 'utf8');
  const controlBinding = runtimeConfig.match(
    /"binding":\s*"CONTROL_DB"[\s\S]*?"database_name":\s*"([^"]+)"[\s\S]*?"database_id":\s*"([^"]+)"/
  );
  const agencyBinding = agencyConfig.match(
    /"binding":\s*"DB"[\s\S]*?"database_name":\s*"([^"]+)"[\s\S]*?"database_id":\s*"([^"]+)"/
  );
  assert.ok(controlBinding);
  assert.ok(agencyBinding);
  assert.deepEqual(controlBinding.slice(1), agencyBinding.slice(1));
});

function database() {
  const path = join(mkdtempSync(join(tmpdir(), 'control-run-')), 'runtime.sqlite');
  execFileSync('sqlite3', [path], { input: `PRAGMA foreign_keys=ON;\n${migration}` });
  return path;
}

function sql(path: string, statement: string): string {
  return execFileSync('sqlite3', ['-batch', '-noheader', path], { input: `PRAGMA foreign_keys=ON;\n${statement}` }).toString().trim();
}

function expectSqlFailure(path: string, statement: string, message: RegExp) {
  const result = spawnSync('sqlite3', ['-batch', path], { input: `PRAGMA foreign_keys=ON;\n${statement}`, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, message);
}

const insertRun = `INSERT INTO control_runs (
  id, account_id, tenant_id, workspace_account_id, activation_id, activation_version,
  activation_json, status, version, attempt, concurrency_key, requested_tools_json,
  requested_resources_json, created_by, created_at, updated_at
) VALUES (
  'run-a', 'account-a', 'tenant-a', 'workspace-a', 'activation-a', 1,
  '{"id":"activation-a"}', 'queued', 1, 1, 'exclusive', '[]', '[]',
  'owner-a', '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
);`;

test('migration creates an empty fail-closed Control run ledger', () => {
  const path = database();
  assert.equal(sql(path, "SELECT COUNT(*) FROM control_runs;"), '0');
  assert.equal(sql(path, "SELECT COUNT(*) FROM control_run_commands;"), '0');
  assert.equal(sql(path, "SELECT COUNT(*) FROM control_run_receipts;"), '0');
  assert.equal(
    sql(path, "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'control_run_%';"),
    '8'
  );
});

test('database rejects concurrency collisions, frozen-source mutation, invalid transitions, and broken receipt chains', () => {
  const path = database();
  sql(path, insertRun);
  expectSqlFailure(
    path,
    insertRun.replaceAll('run-a', 'run-b').replace("'owner-a'", "'owner-b'"),
    /UNIQUE constraint failed/
  );
  expectSqlFailure(
    path,
    "UPDATE control_runs SET activation_id='other', version=2, updated_at='2026-07-19T00:00:01.000Z' WHERE id='run-a';",
    /activation, scope, policy request, and creator are immutable/
  );
  expectSqlFailure(
    path,
    "UPDATE control_runs SET status='recovered', version=2, updated_at='2026-07-19T00:00:01.000Z' WHERE id='run-a';",
    /state transition is invalid/
  );
  expectSqlFailure(
    path,
    `INSERT INTO control_run_receipts
      (id, run_id, account_id, tenant_id, workspace_account_id, event_index, status,
       receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
     VALUES ('receipt-2', 'run-a', 'account-a', 'tenant-a', 'workspace-a', 2,
       'queued', '{}', '${'2'.repeat(64)}', '${'1'.repeat(64)}', '2026-07-19T00:00:00.000Z');`,
    /scope or hash chain is invalid/
  );
});

test('receipts and completed command results are append-only', () => {
  const path = database();
  sql(path, insertRun);
  sql(path, `INSERT INTO control_run_receipts
    (id, run_id, account_id, tenant_id, workspace_account_id, event_index, status,
     receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
   VALUES ('receipt-1', 'run-a', 'account-a', 'tenant-a', 'workspace-a', 1,
     'queued', '{}', '${'1'.repeat(64)}', NULL, '2026-07-19T00:00:00.000Z');`);
  expectSqlFailure(path, "DELETE FROM control_run_receipts WHERE id='receipt-1';", /cannot be deleted/);
  sql(path, `INSERT INTO control_run_commands
    (id, account_id, tenant_id, workspace_account_id, run_id, idempotency_key,
     command_sha256, result_json, created_at)
   VALUES ('command-1', 'account-a', 'tenant-a', 'workspace-a', 'run-a', 'start-1',
     '${'3'.repeat(64)}', '{"run":"run-a"}', '2026-07-19T00:00:00.000Z');`);
  expectSqlFailure(
    path,
    "UPDATE control_run_commands SET result_json='{\"run\":\"other\"}' WHERE id='command-1';",
    /terminal result are immutable/
  );
});

test('database permits only explicitly retryable failed runs to requeue', () => {
  const terminalPath = database();
  sql(terminalPath, insertRun);
  sql(terminalPath, `
    UPDATE control_runs SET status='failed', version=2,
      updated_at='2026-07-19T00:00:01.000Z' WHERE id='run-a';
    INSERT INTO control_run_receipts
      (id, run_id, account_id, tenant_id, workspace_account_id, event_index, status,
       receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
    VALUES ('terminal', 'run-a', 'account-a', 'tenant-a', 'workspace-a', 1,
      'failed', '{"verifier":"terminal_failure"}', '${'9'.repeat(64)}', NULL,
      '2026-07-19T00:00:01.000Z');
  `);
  expectSqlFailure(
    terminalPath,
    "UPDATE control_runs SET status='queued', version=3, attempt=2, updated_at='2026-07-19T00:00:02.000Z' WHERE id='run-a';",
    /state transition is invalid/
  );
  expectSqlFailure(
    terminalPath,
    "UPDATE control_runs SET status='recovering', version=3, updated_at='2026-07-19T00:00:02.000Z' WHERE id='run-a';",
    /state transition is invalid/
  );

  const retryablePath = database();
  sql(retryablePath, insertRun);
  sql(retryablePath, `
    UPDATE control_runs SET status='failed', version=2,
      updated_at='2026-07-19T00:00:01.000Z' WHERE id='run-a';
    INSERT INTO control_run_receipts
      (id, run_id, account_id, tenant_id, workspace_account_id, event_index, status,
       receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
    VALUES ('retryable', 'run-a', 'account-a', 'tenant-a', 'workspace-a', 1,
      'failed', '{"verifier":"retryable_failure"}', '${'8'.repeat(64)}', NULL,
      '2026-07-19T00:00:01.000Z');
    UPDATE control_runs SET status='queued', version=3, attempt=2,
      updated_at='2026-07-19T00:00:02.000Z' WHERE id='run-a';
  `);
  assert.equal(sql(retryablePath, "SELECT status || ':' || attempt FROM control_runs WHERE id='run-a';"), 'queued:2');
});
