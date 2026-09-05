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

test('Map monitor migration persists idempotent two-failure operator-alert delivery state', async () => {
  const migration = await readFile(
    new URL('../../../migrations/0044_map_production_monitor_receipts.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS map_production_monitor_alerts/);
  assert.match(migration, /alert_id TEXT PRIMARY KEY/);
  assert.match(migration, /delivery_status TEXT NOT NULL CHECK \(delivery_status IN \('pending', 'delivering', 'delivered'\)\)/);
  assert.match(migration, /failure_streak_started_at TEXT NOT NULL/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS map_production_monitor_alerts_delivery_status/);
});

test('Map monitor migration gives interrupted operator-alert delivery a reclaimable lease', async () => {
  const migration = await readFile(
    new URL('../../../migrations/0044_map_production_monitor_receipts.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /delivery_lease_expires_at TEXT/);
});

test('Map monitor migration fences delivery updates to their active claim', async () => {
  const migration = await readFile(
    new URL('../../../migrations/0044_map_production_monitor_receipts.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /delivery_claim_token TEXT/);
});

test('Map monitor migration retains one alert identity across a resolved streak and notification revisions', async () => {
  const migration = await readFile(
    new URL('../../../migrations/0044_map_production_monitor_receipts.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /notification_revision INTEGER NOT NULL CHECK \(notification_revision >= 1\)/);
  assert.match(migration, /streak_resolved_at TEXT/);
});
