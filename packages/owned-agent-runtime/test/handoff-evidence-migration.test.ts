import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('handoff evidence requires an attempt, valid disposition, and immutable exact identity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'handoff-evidence-'));
  const db = join(dir, 'test.db');
  const sql = (value: string) =>
    execFileSync('sqlite3', [db], {
      input: 'PRAGMA foreign_keys=ON;\n' + value,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  try {
    sql(
      'CREATE TABLE control_workflow_runtime_attempts(run_id TEXT, step_id TEXT, attempt_id TEXT, PRIMARY KEY(run_id,step_id,attempt_id));'
    );
    sql(
      readFileSync(
        new URL('../migrations/0011_control_handoff_observations.sql', import.meta.url),
        'utf8'
      )
    );
    const digest = 'sha256:' + '1'.repeat(64);
    const insert = `INSERT INTO control_workflow_runtime_handoff_observations VALUES ('run','step','attempt','${digest}','${digest}','2026-09-14T23:00:01.000Z','confirmed','review_ready','await_review','${digest}','2026-09-14T23:00:00.000Z','2026-09-14T23:00:02.000Z',30000);`;
    assert.throws(() => sql(insert));
    sql("INSERT INTO control_workflow_runtime_attempts VALUES('run','step','attempt');");
    for (const altered of [
      insert.replace("'review_ready'", "'version_missing'"),
      insert.replace("'await_review'", "'resubmit'"),
      insert.replace(digest, 'bad'),
      insert.replace('23:00:02.000Z', '22:59:59.000Z')
    ])
      assert.throws(() => sql(altered));
    sql(insert);
    assert.throws(() => sql(insert));
    assert.throws(() => sql(insert.replace('INSERT INTO', 'INSERT OR REPLACE INTO')));
    assert.throws(() =>
      sql(
        "UPDATE control_workflow_runtime_handoff_observations SET reason='review_progressed',next_action='inspect_review_outcome';"
      )
    );
    assert.throws(() => sql('DELETE FROM control_workflow_runtime_handoff_observations;'));
    assert.throws(() => sql('DELETE FROM control_workflow_runtime_attempts;'));
    assert.equal(
      sql('SELECT observation_state FROM control_workflow_runtime_handoff_observations;'),
      'confirmed'
    );
    const before = sql('SELECT json_array(run_id,step_id,attempt_id,request_sha256,source_invocation_sha256,observed_at,observation_state,reason,next_action,evidence_sha256,dispatched_at,received_at,maximum_age_ms) FROM control_workflow_runtime_handoff_observations;');
    sql(readFileSync(new URL('../migrations/0012_control_handoff_clock_policy.sql', import.meta.url), 'utf8'));
    assert.equal(sql('SELECT json_array(run_id,step_id,attempt_id,request_sha256,source_invocation_sha256,observed_at,observation_state,reason,next_action,evidence_sha256,dispatched_at,received_at,maximum_age_ms) FROM control_workflow_runtime_handoff_observations;'), before);
    assert.equal(sql('SELECT maximum_clock_skew_ms FROM control_workflow_runtime_handoff_observations;'), '0');
    sql("INSERT INTO control_workflow_runtime_attempts VALUES('run','step','skew-attempt');");
    const skewInsert = insert.replaceAll("'attempt'", "'skew-attempt'")
      .replaceAll(digest, 'sha256:' + '2'.repeat(64))
      .replace('23:00:01.000Z', '22:59:59.500Z').replace(',30000)', ',500,30000)');
    assert.throws(() => sql(skewInsert.replace(',500,30000)', ',499,30000)')));
    sql(skewInsert);
    assert.throws(() => sql(skewInsert.replace('INSERT INTO', 'INSERT OR REPLACE INTO')));
    assert.throws(() => sql('UPDATE control_workflow_runtime_handoff_observations SET maximum_clock_skew_ms=60000;'));
    assert.throws(() => sql('DELETE FROM control_workflow_runtime_handoff_observations;'));
    sql("INSERT INTO control_workflow_runtime_attempts VALUES('run','step','ahead-old');");
    const aheadInsert = insert.replaceAll(digest, 'sha256:'+'3'.repeat(64)).replaceAll("'attempt'", "'ahead-old'")
      .replace('23:00:01.000Z','23:01:00.000Z').replace('23:00:02.000Z','23:00:40.000Z')
      .replace(',30000)',',60000,30000)');
    sql(aheadInsert);
    const oldRows = sql('SELECT * FROM control_workflow_runtime_handoff_observations ORDER BY attempt_id;');
    sql(readFileSync(new URL('../migrations/0013_control_handoff_age_policy.sql', import.meta.url), 'utf8'));
    assert.equal(sql('SELECT COUNT(*) FROM control_workflow_runtime_handoff_observations WHERE age_policy_version=1;'),'3');
    assert.equal(sql('SELECT * FROM control_workflow_runtime_handoff_observations ORDER BY attempt_id;'),oldRows.split('\n').map(row=>row+'|1').join('\n'));
    sql("INSERT INTO control_workflow_runtime_attempts VALUES('run','step','ahead-new');");
    const legacyInsert = aheadInsert.replaceAll('ahead-old','ahead-new').replaceAll('sha256:'+'3'.repeat(64),'sha256:'+'4'.repeat(64));
    // Old writers omit the added column. Existing version-1 rows remain readable,
    // but neither omission nor explicit version 1 may admit new evidence.
    const legacyColumns = 'run_id,step_id,attempt_id,request_sha256,source_invocation_sha256,observed_at,observation_state,reason,next_action,evidence_sha256,dispatched_at,received_at,maximum_clock_skew_ms,maximum_age_ms';
    assert.throws(()=>sql(legacyInsert.replace(' VALUES',` (${legacyColumns}) VALUES`)),/current_age_policy_required/);
    assert.throws(()=>sql(legacyInsert.replace(',60000,30000)',',60000,30000,1)')),/current_age_policy_required/);
    const newInsert = aheadInsert.replaceAll('sha256:'+'3'.repeat(64),'sha256:'+'4'.repeat(64)).replaceAll('ahead-old','ahead-new').replace(',60000,30000)',',60000,30000,2)');
    assert.throws(()=>sql(newInsert),/age_budget_exceeded/);
    assert.throws(()=>sql(newInsert.replace(',30000,2)',',39999,2)')),/age_budget_exceeded/);
    sql(newInsert.replace(',30000,2)',',40000,2)'));
    sql("INSERT INTO control_workflow_runtime_attempts VALUES('run','step','aligned-new');");
    const alignedInsert = newInsert.replaceAll('ahead-new','aligned-new')
      .replaceAll('sha256:'+'4'.repeat(64),'sha256:'+'5'.repeat(64))
      .replace('23:01:00.000Z','23:00:00.000Z').replace('23:00:40.000Z','23:00:02.000Z');
    assert.throws(()=>sql(alignedInsert.replace(',30000,2)',',1999,2)')),/age_budget_exceeded/);
    sql(alignedInsert.replace(',30000,2)',',2000,2)'));
    assert.throws(()=>sql('UPDATE control_workflow_runtime_handoff_observations SET age_policy_version=2;'),/immutable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
