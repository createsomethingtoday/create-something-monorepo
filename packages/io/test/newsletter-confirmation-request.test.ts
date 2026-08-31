import assert from 'node:assert/strict';
import test from 'node:test';
import {
  requestNewsletterDoubleOptIn,
  type NewsletterConfirmationDatabase
} from '../src/lib/server/newsletter-confirmation-request.ts';

test('an active legacy subscriber receives a fresh double-opt-in confirmation request', async () => {
  const subscriber = {
    id: 7,
    email: 'legacy@example.com',
    active: 1,
    status: 'active',
    unsubscribed_at: null,
    confirmed_at: '2025-11-17T02:23:40.000Z',
    confirmation_token: 'old-token',
    consent_requested_at: '2025-11-17T02:23:40.000Z',
    consent_confirmed_at: null,
    consent_method: 'single_opt_in',
    consent_evidence: 'legacy_signup_form',
    confirmation_email_id: null,
    audience_classification: 'confirmed_subscriber'
  };
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db: NewsletterConfirmationDatabase = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first<T>() {
              return { ...subscriber } as T;
            },
            async run() {
              calls.push({ sql, values });
              return { success: true, meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  const receipt = await requestNewsletterDoubleOptIn(
    db,
    { subscriberId: 7 },
    {
      apiKey: 're_test',
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(JSON.stringify({ id: 'email-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      },
      now: () => new Date('2026-08-31T15:00:00.000Z'),
      token: () => 'fresh-confirmation-token'
    }
  );

  assert.deepEqual(receipt, {
    subscriberId: 7,
    emailId: 'email-123',
    requestedAt: '2026-08-31T15:00:00.000Z'
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0]!.url, 'https://api.resend.com/emails');
  const body = JSON.parse(String(requests[0]!.init?.body));
  assert.equal(body.to, 'legacy@example.com');
  assert.match(body.text, /confirm\?token=fresh-confirmation-token/);
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.sql, /consent_evidence = 'pending_confirmation'/);
  assert.match(calls[0]!.sql, /confirmed_at = NULL/);
  assert.match(calls[1]!.sql, /confirmation_email_id = \?/);
  assert.deepEqual(calls[1]!.values, ['email-123', 7, 'fresh-confirmation-token']);
});

test('a provider failure restores the subscriber consent state', async () => {
  const subscriber = {
    id: 8,
    email: 'legacy@example.com',
    active: 1,
    status: 'active',
    unsubscribed_at: null,
    confirmed_at: '2025-11-17T02:23:40.000Z',
    confirmation_token: 'old-token',
    consent_requested_at: '2025-11-17T02:23:40.000Z',
    consent_confirmed_at: null,
    consent_method: 'single_opt_in',
    consent_evidence: 'legacy_signup_form',
    confirmation_email_id: 'old-email-id',
    audience_classification: 'confirmed_subscriber'
  };
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db: NewsletterConfirmationDatabase = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first<T>() {
              return { ...subscriber } as T;
            },
            async run() {
              calls.push({ sql, values });
              return { success: true, meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };

  await assert.rejects(
    requestNewsletterDoubleOptIn(
      db,
      { subscriberId: 8 },
      {
        apiKey: 're_test',
        fetch: async () =>
          new Response(JSON.stringify({ message: 'provider unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }),
        now: () => new Date('2026-08-31T15:00:00.000Z'),
        token: () => 'fresh-confirmation-token'
      }
    ),
    /prior consent state was restored/
  );

  assert.equal(calls.length, 2);
  assert.match(calls[1]!.sql, /consent_evidence = \?/);
  assert.deepEqual(calls[1]!.values, [
    '2025-11-17T02:23:40.000Z',
    'old-token',
    '2025-11-17T02:23:40.000Z',
    null,
    'single_opt_in',
    'legacy_signup_form',
    'old-email-id',
    8,
    'fresh-confirmation-token'
  ]);
});

test('a network exception also restores the subscriber consent state', async () => {
  const subscriber = {
    id: 9,
    email: 'legacy@example.com',
    active: 1,
    status: 'active',
    unsubscribed_at: null,
    confirmed_at: '2025-11-17T02:23:40.000Z',
    confirmation_token: 'old-token',
    consent_requested_at: '2025-11-17T02:23:40.000Z',
    consent_confirmed_at: null,
    consent_method: 'single_opt_in',
    consent_evidence: 'legacy_signup_form',
    confirmation_email_id: null,
    audience_classification: 'confirmed_subscriber'
  };
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db: NewsletterConfirmationDatabase = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first<T>() {
              return { ...subscriber } as T;
            },
            async run() {
              calls.push({ sql, values });
              return { success: true, meta: { changes: 1 } };
            }
          };
        }
      };
    }
  };

  await assert.rejects(
    requestNewsletterDoubleOptIn(
      db,
      { subscriberId: 9 },
      {
        apiKey: 're_test',
        fetch: async () => {
          throw new Error('network unavailable');
        },
        now: () => new Date('2026-08-31T15:00:00.000Z'),
        token: () => 'fresh-confirmation-token'
      }
    ),
    /prior consent state was restored/
  );

  assert.equal(calls.length, 2);
  assert.match(calls[1]!.sql, /consent_evidence = \?/);
});

test('a failed rollback is reported as requiring manual review', async () => {
  const subscriber = {
    id: 10,
    email: 'legacy@example.com',
    active: 1,
    status: 'active',
    unsubscribed_at: null,
    confirmed_at: '2025-11-17T02:23:40.000Z',
    confirmation_token: 'old-token',
    consent_requested_at: '2025-11-17T02:23:40.000Z',
    consent_confirmed_at: null,
    consent_method: 'single_opt_in',
    consent_evidence: 'legacy_signup_form',
    confirmation_email_id: null,
    audience_classification: 'confirmed_subscriber'
  };
  let runCount = 0;
  const db: NewsletterConfirmationDatabase = {
    prepare() {
      return {
        bind() {
          return {
            async first<T>() {
              return { ...subscriber } as T;
            },
            async run() {
              runCount += 1;
              return runCount === 1
                ? { success: true, meta: { changes: 1 } }
                : { success: false, meta: { changes: 0 } };
            }
          };
        }
      };
    }
  };

  await assert.rejects(
    requestNewsletterDoubleOptIn(
      db,
      { subscriberId: 10 },
      {
        apiKey: 're_test',
        fetch: async () =>
          new Response(JSON.stringify({ message: 'provider unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }),
        now: () => new Date('2026-08-31T15:00:00.000Z'),
        token: () => 'fresh-confirmation-token'
      }
    ),
    /could not be restored.*manual review/i
  );
});
