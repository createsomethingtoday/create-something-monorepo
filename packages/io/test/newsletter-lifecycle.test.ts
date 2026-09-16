import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ELIGIBLE_SUBSCRIBERS_SQL,
  markNewsletterConfirmed,
  type NewsletterLifecycleDatabase
} from '../src/lib/server/newsletter-lifecycle.ts';

test('direct confirmation records explicit consent evidence and restores active state', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db: NewsletterLifecycleDatabase = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() {
              calls.push({ sql, values });
              return { success: true, meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };

  const confirmed = await markNewsletterConfirmed(
    db,
    24,
    'presented-token',
    '2026-08-12T17:00:00.000Z'
  );

  assert.equal(confirmed, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0]!.sql, /consent_method = 'double_opt_in'/);
  assert.match(calls[0]!.sql, /consent_evidence = 'confirmation_link'/);
  assert.match(calls[0]!.sql, /active = 1/);
  assert.match(calls[0]!.sql, /status = 'active'/);
  assert.doesNotMatch(calls[0]!.sql, /confirmation_token = NULL/);
  assert.match(calls[0]!.sql, /confirmation_token = \?/);
  assert.deepEqual(calls[0]!.values, [
    '2026-08-12T17:00:00.000Z',
    '2026-08-12T17:00:00.000Z',
    24,
    'presented-token'
  ]);
});

test('direct confirmation cannot reactivate a subscriber who opted out after the request', async () => {
  let sql = '';
  const db: NewsletterLifecycleDatabase = {
    prepare(value) {
      sql = value;
      return {
        bind() {
          return {
            async run() {
              return { success: true, meta: { changes: 0 } };
            }
          };
        }
      };
    }
  };

  const confirmed = await markNewsletterConfirmed(
    db,
    24,
    'presented-token',
    '2026-08-12T17:00:00.000Z'
  );

  assert.equal(confirmed, false);
  assert.match(sql, /unsubscribed_at IS NULL/);
  assert.match(sql, /active = 1/);
  assert.match(sql, /status = 'active'/);
});

test('direct confirmation binds the presented token so a replaced request wins', async () => {
  let values: unknown[] = [];
  const db: NewsletterLifecycleDatabase = {
    prepare(sql) {
      assert.match(sql, /confirmation_token = \?/);
      return {
        bind(...boundValues) {
          values = boundValues;
          return {
            async run() {
              return { success: true, meta: { changes: 0 } };
            }
          };
        }
      };
    }
  };

  const confirmed = await markNewsletterConfirmed(
    db,
    24,
    'stale-token',
    '2026-08-12T17:00:00.000Z'
  );

  assert.equal(confirmed, false);
  assert.equal(values.at(-1), 'stale-token');
});

test('eligible audience requires direct consent and excludes every suppression state', () => {
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /consent_method = 'double_opt_in'/);
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /consent_evidence = 'confirmation_link'/);
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /audience_classification = 'confirmed_subscriber'/);
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /confirmed_at IS NOT NULL/);
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /unsubscribed_at IS NULL/);
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /active = 1/);
  assert.match(ELIGIBLE_SUBSCRIBERS_SQL, /status = 'active'/);
});
