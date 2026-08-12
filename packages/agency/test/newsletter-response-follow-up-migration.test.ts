import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('response follow-up migration adds separate durable notification and warm-lead receipts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'response-follow-up-migration-'));
  const database = join(directory, 'migration.db');
  try {
    const migration = readFileSync(
      new URL('../migrations/0043_newsletter_response_follow_up.sql', import.meta.url),
      'utf8'
    );
    execFileSync('sqlite3', [database], {
      input: `CREATE TABLE newsletter_reengagement_responses (
        id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, subscriber_id INTEGER NOT NULL,
        original_reason TEXT, still_interested TEXT NOT NULL, updates_seen TEXT NOT NULL,
        wanted_next TEXT, responded_at TEXT NOT NULL, retention_expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL, UNIQUE(campaign_id, subscriber_id)
      );
      ${migration}`,
      encoding: 'utf8'
    });

    const columns = JSON.parse(
      execFileSync('sqlite3', ['-json', database], {
        input: 'PRAGMA table_info(newsletter_reengagement_responses)',
        encoding: 'utf8'
      })
    ) as Array<{ name: string }>;
    const names = columns.map(({ name }) => name);
    assert.deepEqual(names.slice(-8), [
      'response_fingerprint',
      'notification_status',
      'notification_email_id',
      'notified_at',
      'warm_lead_status',
      'warm_lead_id',
      'notification_error',
      'warm_lead_error'
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
