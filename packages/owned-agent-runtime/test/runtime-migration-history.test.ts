import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('pending runtime migrations preserve populated legacy ledger bytes and relationships', () => {
  const directory = mkdtempSync(join(tmpdir(), 'runtime-migration-history-'));
  const path = join(directory, 'history.sqlite');
  const migrations = new URL('../migrations/', import.meta.url);
  const sql = (input: string) => execFileSync('sqlite3', ['-bail', '-json', path], {
    input: `PRAGMA foreign_keys=ON;\n${input}`, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  const quote = (value: unknown) => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
  const insert = (table: string, row: Record<string, unknown>) => sql(
    `INSERT INTO ${table} (${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(quote).join(',')});`);
  const digest = 'sha256:' + 'a'.repeat(64);
  const clock = '2026-09-01T00:00:00.000Z';
  try {
    for (const name of ['0003_control_run_lifecycle.sql', '0004_control_workflow_runtime_zero_write.sql'])
      sql(readFileSync(new URL(name, migrations), 'utf8'));
    insert('control_runs', { id: 'legacy', account_id: 'a', tenant_id: 't', workspace_account_id: 'w',
      activation_id: 'activation', activation_version: 1, activation_json: '{"historical":true}',
      status: 'running', version: 1, attempt: 1, concurrency_key: 'legacy', requested_tools_json: '[]',
      requested_resources_json: '[]', created_by: 'operator', created_at: clock, updated_at: clock });
    insert('control_workflow_runtime_runs', { run_id: 'legacy', admission_command_id: 'admit',
      artifact_manifest_sha256: digest, runtime_manifest_sha256: digest, status: 'running', version: 1,
      run_json: '{"schema":"workflow_runtime_run.v0.1","historical":true}', created_at: clock, updated_at: clock });
    for (const [index, status] of ['prepared', 'succeeded', 'retryable_failure', 'failed', 'abandoned'].entries()) {
      const step = `step-${index}`;
      insert('control_workflow_runtime_steps', { run_id: 'legacy', step_id: step, status: 'running',
        version: 1, step_json: JSON.stringify({ id: step, legacy: true }) });
      insert('control_workflow_runtime_attempts', { run_id: 'legacy', step_id: step, attempt_id: `attempt-${index}`,
        status, attempt_json: JSON.stringify({ status, historicalBytes: 'preserve me' }), created_at: clock });
      insert('control_workflow_runtime_approvals', { approval_id: `approval-${index}`, run_id: 'legacy', step_id: step,
        binding_sha256: digest, decision: index === 0 ? null : index % 2 ? 'approved' : 'rejected',
        approval_json: JSON.stringify({ step, legacy: true }), created_at: clock, decided_at: index === 0 ? null : clock });
    }
    insert('control_workflow_runtime_commands', { id: 'admit', run_id: 'legacy', account_id: 'a', tenant_id: 't',
      workspace_account_id: 'w', idempotency_key: 'admit', command_sha256: 'a'.repeat(64), expected_version: null,
      result_json: '{"historicalResult":true}', created_at: clock });
    for (let index = 1; index <= 2; index++) {
      const hash = 'sha256:' + String(index).repeat(64);
      insert('control_workflow_runtime_receipts', { id: `receipt-${index}`, run_id: 'legacy', event_index: index,
        receipt_json: JSON.stringify({ eventIndex: index, historical: true }), receipt_sha256: hash,
        previous_receipt_sha256: index === 1 ? null : 'sha256:' + '1'.repeat(64), created_at: clock });
      insert('control_workflow_runtime_checkpoints', { id: `checkpoint-${index}`, run_id: 'legacy', run_version: index,
        run_sha256: digest, receipt_sha256: hash, checkpoint_json: JSON.stringify({ version: index }), created_at: clock });
    }
    // Capture every pre-existing column, not merely counts or selected IDs.
    const tables = JSON.parse(sql("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")) as {name:string}[];
    const history = tables.map(({ name }) => {
      const columns = (JSON.parse(sql(`PRAGMA table_info(${name})`)) as {name:string}[]).map(column => column.name);
      const query = `SELECT ${columns.join(',')} FROM ${name} ORDER BY 1,2,3`;
      return { query, bytes: sql(query) };
    });
    for (const migration of readdirSync(migrations).filter(name => /^\d{4}_control.*\.sql$/.test(name) && name >= '0005').sort()) {
      sql(`BEGIN;\n${readFileSync(new URL(migration, migrations), 'utf8')}\nCOMMIT;`);
      for (const row of history) assert.equal(sql(row.query), row.bytes, `${migration} changed historical rows`);
      assert.equal(sql('PRAGMA foreign_key_check'), '', `${migration} broke a foreign key`);
      assert.deepEqual(JSON.parse(sql('PRAGMA integrity_check')), [{ integrity_check: 'ok' }]);
    }
    assert.deepEqual(JSON.parse(sql('SELECT build_binding_version FROM control_workflow_runtime_runs')),
      [{ build_binding_version: 1 }], 'legacy rows must not become verified Build admissions');
    assert.throws(() => sql("UPDATE control_workflow_runtime_receipts SET receipt_json='{}'"), /immutable/);
    assert.throws(() => sql("DELETE FROM control_workflow_runtime_checkpoints"), /cannot be deleted/);
    assert.throws(() => sql("UPDATE control_workflow_runtime_commands SET result_json='{}'"), /immutable/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
