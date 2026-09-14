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
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
