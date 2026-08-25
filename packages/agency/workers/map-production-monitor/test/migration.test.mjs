import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Map monitor migration keeps scheduled receipts immutable and retained by the Worker', async () => {
  const migration = await readFile(
    new URL('../../../migrations/0044_map_production_monitor_receipts.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS map_production_monitor_receipts/);
  assert.match(migration, /receipt_id TEXT PRIMARY KEY/);
  assert.match(migration, /trigger TEXT NOT NULL CHECK \(trigger = 'scheduled'\)/);
  assert.match(migration, /status TEXT NOT NULL CHECK \(status IN \('passed', 'failed'\)\)/);
  assert.match(migration, /checks_json TEXT NOT NULL/);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS map_production_monitor_receipts_scheduled_unique/
  );
  assert.doesNotMatch(migration, /DELETE FROM/);
});
