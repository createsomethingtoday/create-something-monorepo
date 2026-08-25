import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

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

test('Control activation binding is the Agency-owned D1', () => {
  const runtimeConfig = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  const agencyConfig = readFileSync(
    new URL('../../agency/wrangler.jsonc', import.meta.url),
    'utf8'
  );
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
  execFileSync('sqlite3', [path], {
    input: `PRAGMA foreign_keys=ON;\n${migration}\n${workflowRuntimeMigration}\n${workflowRuntimeEffectAmbiguityMigration}\n${workflowRuntimeDispatchMigration}\n${workflowRuntimeProofMigration}`
  });
  return path;
}

function databaseBeforeEffectAmbiguityMigration() {
  const path = join(mkdtempSync(join(tmpdir(), 'control-run-')), 'runtime.sqlite');
  execFileSync('sqlite3', [path], {
    input: `PRAGMA foreign_keys=ON;\n${migration}\n${workflowRuntimeMigration}`
  });
  return path;
}

function sql(path: string, statement: string): string {
  return execFileSync('sqlite3', ['-batch', '-noheader', path], {
    input: `PRAGMA foreign_keys=ON;\n${statement}`
  })
    .toString()
    .trim();
}

function expectSqlFailure(path: string, statement: string, message: RegExp) {
  const result = spawnSync('sqlite3', ['-batch', path], {
    input: `PRAGMA foreign_keys=ON;\n${statement}`,
    encoding: 'utf8'
  });
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
  assert.equal(sql(path, 'SELECT COUNT(*) FROM control_runs;'), '0');
  assert.equal(sql(path, 'SELECT COUNT(*) FROM control_run_commands;'), '0');
  assert.equal(sql(path, 'SELECT COUNT(*) FROM control_run_receipts;'), '0');
  assert.equal(sql(path, 'SELECT COUNT(*) FROM control_workflow_runtime_runs;'), '0');
  assert.equal(sql(path, 'SELECT COUNT(*) FROM control_workflow_runtime_checkpoints;'), '0');
  assert.equal(sql(path, 'SELECT COUNT(*) FROM control_workflow_runtime_dispatches;'), '0');
  assert.equal(
    sql(
      path,
      "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'control_run_%';"
    ),
    '8'
  );
});

test('effect-ambiguity migration preserves attempts and permits an uncertain effect state', () => {
  const path = databaseBeforeEffectAmbiguityMigration();
  const hash = (value: string) => `sha256:${value.repeat(64).slice(0, 64)}`;
  sql(path, insertRun);
  sql(
    path,
    `INSERT INTO control_workflow_runtime_runs (
    run_id, admission_command_id, artifact_manifest_sha256, runtime_manifest_sha256, status, version,
    run_json, created_at, updated_at
  ) VALUES (
    'run-a', 'runtime-admission-a', '${hash('a')}', '${hash('b')}', 'queued', 1, '{}',
    '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
  );
  INSERT INTO control_workflow_runtime_steps (
    run_id, step_id, status, version, step_json
  ) VALUES ('run-a', 'step-a', 'running', 1, '{}');
  INSERT INTO control_workflow_runtime_attempts (
    run_id, step_id, attempt_id, status, attempt_json, created_at
  ) VALUES ('run-a', 'step-a', 'attempt-a', 'prepared', '{}', '2026-07-19T00:00:00.000Z');`
  );
  sql(path, workflowRuntimeEffectAmbiguityMigration);
  assert.equal(
    sql(path, "SELECT status FROM control_workflow_runtime_attempts WHERE attempt_id='attempt-a';"),
    'prepared'
  );
  sql(
    path,
    "UPDATE control_workflow_runtime_attempts SET status='effect_ambiguous' WHERE attempt_id='attempt-a';"
  );
  assert.equal(
    sql(path, "SELECT status FROM control_workflow_runtime_attempts WHERE attempt_id='attempt-a';"),
    'effect_ambiguous'
  );
});

test('observation dispatches retain only bounded evidence and cannot rewrite their prepared identity', () => {
  const path = database();
  const hash = (value: string) => `sha256:${value.repeat(64).slice(0, 64)}`;
  sql(path, insertRun);
  sql(
    path,
    `INSERT INTO control_workflow_runtime_runs (
    run_id, admission_command_id, artifact_manifest_sha256, runtime_manifest_sha256, status, version,
    run_json, created_at, updated_at
  ) VALUES (
    'run-a', 'runtime-admission-a', '${hash('a')}', '${hash('b')}', 'running', 2, '{}',
    '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
  );
  INSERT INTO control_workflow_runtime_steps (
    run_id, step_id, status, version, step_json
  ) VALUES ('run-a', 'observe', 'running', 2, '{}');
  INSERT INTO control_workflow_runtime_attempts (
    run_id, step_id, attempt_id, status, attempt_json, created_at
  ) VALUES ('run-a', 'observe', 'attempt-a', 'prepared', '{}', '2026-07-19T00:00:00.000Z');
  INSERT INTO control_workflow_runtime_dispatches (
    run_id, step_id, attempt_id, capability_id, capability_parameter_sha256,
    request_sha256, source_idempotency_key, source_service, source_resource,
    source_tool, status, created_at, updated_at
  ) VALUES (
    'run-a', 'observe', 'attempt-a', 'template-review.queue.observe.v1', '${hash('c')}',
    '${hash('d')}', 'template-review-observation:fixture', 'webflow-template-review-mcp',
    'template-review-queue', 'template_review_list_queue', 'prepared',
    '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
  );`
  );
  assert.equal(
    sql(
      path,
      "SELECT COUNT(*) FROM pragma_table_info('control_workflow_runtime_dispatches') WHERE name LIKE '%raw%';"
    ),
    '0'
  );
  expectSqlFailure(
    path,
    "UPDATE control_workflow_runtime_dispatches SET source_tool='other', updated_at='2026-07-19T00:00:01.000Z' WHERE run_id='run-a';",
    /dispatch identity is immutable/
  );
  expectSqlFailure(
    path,
    `UPDATE control_workflow_runtime_dispatches
     SET status='effect_unknown', source_invocation_sha256='${hash('e')}',
         response_sha256='${hash('f')}', observed_item_count=1,
         source_invocation_evidence_sha256='${hash('g')}',
         failure_code='private@example.com', updated_at='2026-07-19T00:00:01.000Z'
     WHERE run_id='run-a';`,
    /CHECK constraint failed/
  );
  sql(
    path,
    `UPDATE control_workflow_runtime_dispatches
     SET status='effect_unknown', source_invocation_sha256='${hash('e')}',
         response_sha256='${hash('f')}', observed_item_count=1,
         source_invocation_evidence_sha256='${hash('g')}',
         failure_code='source_correlation_unavailable', updated_at='2026-07-19T00:00:01.000Z'
     WHERE run_id='run-a';`
  );
  assert.equal(
    sql(
      path,
      "SELECT status || ':' || response_sha256 || ':' || failure_code FROM control_workflow_runtime_dispatches WHERE run_id='run-a';"
    ),
    `effect_unknown:${hash('f')}:source_correlation_unavailable`
  );
  expectSqlFailure(
    path,
    "DELETE FROM control_workflow_runtime_dispatches WHERE run_id='run-a';",
    /dispatches cannot be deleted/
  );
});

test('proof projection migration makes approval identity and decisions append-only', () => {
  const path = database();
  const hash = (value: string) => `sha256:${value.repeat(64).slice(0, 64)}`;
  sql(path, insertRun);
  sql(
    path,
    `INSERT INTO control_workflow_runtime_runs (
      run_id, admission_command_id, artifact_manifest_sha256, runtime_manifest_sha256, status, version,
      run_json, created_at, updated_at
    ) VALUES (
      'run-a', 'runtime-admission-a', '${hash('a')}', '${hash('b')}', 'waiting_for_approval', 2, '{}',
      '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
    );
    INSERT INTO control_workflow_runtime_steps (run_id, step_id, status, version, step_json)
    VALUES ('run-a', 'review', 'waiting_for_approval', 2, '{}');
    INSERT INTO control_workflow_runtime_approvals (
      approval_id, run_id, step_id, binding_sha256, decision, approval_json, created_at, decided_at
    ) VALUES (
      'approval-a', 'run-a', 'review', '${hash('c')}', NULL,
      '{"id":"approval-a","bindingSha256":"${hash('c')}","policyId":"account-owner","expiresAt":"2026-07-20T00:00:00.000Z"}',
      '2026-07-19T00:00:00.000Z', NULL
    );`
  );
  sql(
    path,
    "UPDATE control_workflow_runtime_approvals SET decision='approved', decided_at='2026-07-19T00:01:00.000Z' WHERE approval_id='approval-a';"
  );
  expectSqlFailure(
    path,
    `INSERT INTO control_workflow_runtime_approvals (
      approval_id, run_id, step_id, binding_sha256, decision, approval_json, created_at, decided_at
    ) VALUES (
      'approval-b', 'run-a', 'review', '${hash('d')}', 'approved',
      '{"id":"approval-b","bindingSha256":"${hash('d')}","policyId":"account-owner","expiresAt":"2026-07-20T00:00:00.000Z"}',
      '2026-07-19T00:00:00.000Z', '2026-07-19T00:01:00.000Z'
    );`,
    /approval must begin pending/
  );
  expectSqlFailure(
    path,
    "UPDATE control_workflow_runtime_approvals SET decision='rejected', decided_at='2026-07-19T00:02:00.000Z' WHERE approval_id='approval-a';",
    /approval identity or decision is immutable/
  );
  expectSqlFailure(
    path,
    "UPDATE control_workflow_runtime_approvals SET binding_sha256='sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' WHERE approval_id='approval-a';",
    /approval identity or decision is immutable/
  );
  expectSqlFailure(
    path,
    "DELETE FROM control_workflow_runtime_approvals WHERE approval_id='approval-a';",
    /approvals cannot be deleted/
  );
  expectSqlFailure(
    path,
    `INSERT INTO control_workflow_runtime_approvals (
      approval_id, run_id, step_id, binding_sha256, decision, approval_json, created_at, decided_at
    ) VALUES (
      'approval-c', 'run-a', 'review', '${hash('e')}', NULL,
      '{"id":"approval-c","bindingSha256":"${hash('e')}","policyId":"account-owner","expiresAt":"2026-07-20T00:00:00.000Z"}',
      '2026-07-19T00:02:00.000Z', NULL
    );`,
    /UNIQUE constraint failed/
  );
});

test('zero-write Workflow Runtime tables retain a Control-owned run, immutable checkpoints, and a valid receipt chain', () => {
  const path = database();
  sql(path, insertRun);
  const hash = (value: string) => `sha256:${value.repeat(64).slice(0, 64)}`;
  sql(
    path,
    `INSERT INTO control_workflow_runtime_runs (
    run_id, admission_command_id, artifact_manifest_sha256, runtime_manifest_sha256, status, version,
    run_json, created_at, updated_at
  ) VALUES (
    'run-a', 'runtime-admission-a', '${hash('a')}', '${hash('b')}', 'queued', 1, '{}',
    '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
  );
  INSERT INTO control_workflow_runtime_steps (
    run_id, step_id, status, version, step_json
  ) VALUES ('run-a', 'step-a', 'ready', 1, '{}');
  INSERT INTO control_workflow_runtime_receipts (
    id, run_id, event_index, receipt_json, receipt_sha256,
    previous_receipt_sha256, created_at
  ) VALUES (
    'runtime-receipt-1', 'run-a', 1, '{}', '${hash('c')}', NULL,
    '2026-07-19T00:00:00.000Z'
  );
  INSERT INTO control_workflow_runtime_checkpoints (
    id, run_id, run_version, run_sha256, receipt_sha256, checkpoint_json, created_at
  ) VALUES (
    'checkpoint-1', 'run-a', 1, '${hash('d')}', '${hash('c')}', '{}',
    '2026-07-19T00:00:00.000Z'
  );`
  );
  assert.equal(
    sql(path, "SELECT COUNT(*) FROM control_workflow_runtime_steps WHERE run_id='run-a';"),
    '1'
  );
  expectSqlFailure(
    path,
    `INSERT INTO control_workflow_runtime_receipts (
      id, run_id, event_index, receipt_json, receipt_sha256,
      previous_receipt_sha256, created_at
    ) VALUES (
      'runtime-receipt-2', 'run-a', 2, '{}', '${hash('e')}', '${hash('x')}',
      '2026-07-19T00:00:01.000Z'
    );`,
    /receipt chain is invalid/
  );
  expectSqlFailure(
    path,
    "UPDATE control_workflow_runtime_checkpoints SET checkpoint_json='{" +
      '"changed"' +
      ":true}' WHERE id='checkpoint-1';",
    /checkpoints are immutable/
  );
  expectSqlFailure(
    path,
    "DELETE FROM control_workflow_runtime_receipts WHERE id='runtime-receipt-1';",
    /receipts cannot be deleted/
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
  sql(
    path,
    `INSERT INTO control_run_receipts
    (id, run_id, account_id, tenant_id, workspace_account_id, event_index, status,
     receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
   VALUES ('receipt-1', 'run-a', 'account-a', 'tenant-a', 'workspace-a', 1,
     'queued', '{}', '${'1'.repeat(64)}', NULL, '2026-07-19T00:00:00.000Z');`
  );
  expectSqlFailure(
    path,
    "DELETE FROM control_run_receipts WHERE id='receipt-1';",
    /cannot be deleted/
  );
  sql(
    path,
    `INSERT INTO control_run_commands
    (id, account_id, tenant_id, workspace_account_id, run_id, idempotency_key,
     command_sha256, result_json, created_at)
   VALUES ('command-1', 'account-a', 'tenant-a', 'workspace-a', 'run-a', 'start-1',
     '${'3'.repeat(64)}', '{"run":"run-a"}', '2026-07-19T00:00:00.000Z');`
  );
  expectSqlFailure(
    path,
    'UPDATE control_run_commands SET result_json=\'{"run":"other"}\' WHERE id=\'command-1\';',
    /terminal result are immutable/
  );
});

test('database permits only explicitly retryable failed runs to requeue', () => {
  const terminalPath = database();
  sql(terminalPath, insertRun);
  sql(
    terminalPath,
    `
    UPDATE control_runs SET status='failed', version=2,
      updated_at='2026-07-19T00:00:01.000Z' WHERE id='run-a';
    INSERT INTO control_run_receipts
      (id, run_id, account_id, tenant_id, workspace_account_id, event_index, status,
       receipt_json, receipt_sha256, previous_receipt_sha256, created_at)
    VALUES ('terminal', 'run-a', 'account-a', 'tenant-a', 'workspace-a', 1,
      'failed', '{"verifier":"terminal_failure"}', '${'9'.repeat(64)}', NULL,
      '2026-07-19T00:00:01.000Z');
  `
  );
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
  sql(
    retryablePath,
    `
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
  `
  );
  assert.equal(
    sql(retryablePath, "SELECT status || ':' || attempt FROM control_runs WHERE id='run-a';"),
    'queued:2'
  );
});
