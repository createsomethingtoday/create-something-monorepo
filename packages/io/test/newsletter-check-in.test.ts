import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hashNewsletterCheckInToken,
  loadNewsletterCheckIn,
  saveNewsletterCheckIn,
  validateNewsletterCheckInInput,
  type NewsletterCheckInDatabase
} from '../src/lib/server/newsletter-check-in.ts';

test('check-in token hashing is deterministic and does not retain the raw token', async () => {
  const first = await hashNewsletterCheckInToken('token-safe');
  const second = await hashNewsletterCheckInToken('token-safe');

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /token-safe/);
});

test('ready check-in returns no email and records an open receipt', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = createDatabase(
    {
      token_id: 'token-1',
      campaign_id: 'campaign-1',
      subscriber_id: 24,
      expires_at: '2026-09-12T00:00:00.000Z',
      revoked_at: null,
      campaign_status: 'sent',
      subscriber_status: 'active',
      active: 1,
      unsubscribed_at: null,
      unsubscribe_token: 'unsubscribe-safe',
      original_reason: null,
      still_interested: null,
      updates_seen: null,
      wanted_next: null,
      responded_at: null
    },
    calls
  );

  const result = await loadNewsletterCheckIn(
    db,
    'token-safe',
    new Date('2026-08-12T00:00:00.000Z')
  );

  assert.equal(result.state, 'ready');
  assert.equal('email' in result, false);
  assert.equal(result.unsubscribeToken, 'unsubscribe-safe');
  assert.equal(
    calls.some(({ sql }) => sql.includes('first_opened_at')),
    true
  );
});

test('response validation is bounded and save is idempotent per campaign and subscriber', async () => {
  const input = validateNewsletterCheckInInput({
    originalReason: 'I wanted practical operating patterns.',
    stillInterested: 'yes',
    updatesSeen: 'some',
    wantedNext: 'More field reports with the failure states included.'
  });
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = createDatabase(null, calls);

  await saveNewsletterCheckIn(
    db,
    { campaignId: 'campaign-1', subscriberId: 24 },
    input,
    '2026-08-12T00:00:00.000Z'
  );

  assert.equal(calls.length, 2);
  assert.match(calls[0]!.sql, /DELETE FROM newsletter_reengagement_responses/);
  assert.match(calls[1]!.sql, /ON CONFLICT\(campaign_id, subscriber_id\) DO UPDATE/);
  assert.match(calls[1]!.sql, /retention_expires_at/);
  assert.equal(calls[1]!.values.includes('reader@example.com'), false);
});

function createDatabase(
  record: Record<string, unknown> | null,
  calls: Array<{ sql: string; values: unknown[] }>
): NewsletterCheckInDatabase {
  return {
    prepare(sql) {
      let values: unknown[] = [];
      return {
        bind(...nextValues) {
          values = nextValues;
          return this;
        },
        async first() {
          calls.push({ sql, values });
          return record;
        },
        async run() {
          calls.push({ sql, values });
          return { success: true };
        }
      };
    }
  };
}
