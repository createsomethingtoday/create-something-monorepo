import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const migration = new URL('../migrations/0055_restore_agency_identity_seeds.sql', import.meta.url);
test('restores a missing authority table without granting access or changing existing seeds', () => {
  const directory = mkdtempSync(join(tmpdir(), 'seed-repair-'));
  const database = join(directory, 'test.sqlite');
  const sql = (input: string) =>
    execFileSync('sqlite3', [database], { input, encoding: 'utf8' }).trim();
  try {
    const repair = readFileSync(migration, 'utf8');
    sql(repair);
    assert.equal(sql('SELECT COUNT(*) FROM agency_identity_seeds;'), '0');
    sql(
      "INSERT INTO agency_identity_seeds(normalized_email,account_id,tenant_id,metadata_json) VALUES('operator@example.com','acct_a','tenant_a','{\"keep\":true}');"
    );
    const before = sql('SELECT * FROM agency_identity_seeds;');
    sql(repair);
    assert.equal(sql('SELECT * FROM agency_identity_seeds;'), before);
    assert.equal(
      sql("SELECT service_tier || '|' || policy_accepted FROM agency_identity_seeds;"),
      'mcp_only|0'
    );
    assert.equal(
      sql(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_agency_identity_seeds_%';"
      ),
      '3'
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
