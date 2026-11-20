import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { processSubscription } from '../../canon/src/lib/newsletter/subscribe.ts';
import {
  recordNewsletterSignupAttribution,
  confirmNewsletterAttribution
} from '../../canon/src/lib/newsletter/attribution.ts';
import { markNewsletterConfirmed } from '../src/lib/server/newsletter-lifecycle.ts';

test('out-of-order provider responses cannot pair an old campaign with the current confirmation token', async (t) => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(`CREATE TABLE newsletter_subscribers(id INTEGER PRIMARY KEY,email TEXT UNIQUE,subscribed_at TEXT,unsubscribe_token TEXT,confirmation_token TEXT,confirmed_at TEXT,source TEXT,consent_requested_at TEXT,consent_confirmed_at TEXT,consent_method TEXT,consent_evidence TEXT,active INTEGER,status TEXT,audience_classification TEXT DEFAULT 'confirmed_subscriber',confirmation_email_id TEXT,welcome_email_id TEXT,unsubscribed_at TEXT,updated_at TEXT);
    INSERT INTO newsletter_subscribers(id,email,active,status) VALUES(1,'reader@example.com',1,'active');`);
  for (const file of [
    '004_unified_analytics.sql',
    '006_add_source_property.sql',
    '019_newsletter_signup_attribution.sql'
  ])
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  const db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      let values: unknown[] = [];
      const query = {
        bind(...next: unknown[]) {
          values = next;
          return query;
        },
        run: async () => ({
          success: true,
          meta: { changes: Number(statement.run(...(values as [])).changes) }
        }),
        first: async <T>() => (statement.get(...(values as [])) ?? null) as T | null,
        all: async () => ({ success: true, results: statement.all(...(values as [])) })
      };
      return query;
    },
    batch: async (statements: { run(): Promise<unknown> }[]) =>
      Promise.all(statements.map((s) => s.run()))
  };
  const priorFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = priorFetch;
  });
  let releaseOlder!: () => void;
  let announceOlder!: () => void;
  const olderEntered = new Promise<void>((resolve) => {
    announceOlder = resolve;
  });
  const olderResponse = new Promise<void>((resolve) => {
    releaseOlder = resolve;
  });
  let count = 0;
  globalThis.fetch = async () => {
    const n = ++count;
    if (n === 1) {
      announceOlder();
      await olderResponse;
    }
    return Response.json({ id: n === 1 ? 'older-receipt' : 'newer-receipt' });
  };
  const request = (campaign: string) =>
    processSubscription(
      {
        email: 'reader@example.com',
        analyticsEnabled: true,
        landingUrl: `https://createsomething.io/newsletters?utm_source=newsletter&utm_medium=email&utm_campaign=${campaign}`
      },
      { DB: db, RESEND_API_KEY: 'offline' } as never,
      '127.0.0.1',
      'io'
    );
  const older = request('2026-09-01-the-interface-is-becoming-executable');
  await olderEntered;
  const oldToken = String(
    sqlite.prepare('SELECT confirmation_token FROM newsletter_subscribers').get()!
      .confirmation_token
  );
  assert.equal((await request('2026-09-08-test-the-checker')).status, 200);
  const token = String(
    sqlite.prepare('SELECT confirmation_token FROM newsletter_subscribers').get()!
      .confirmation_token
  );
  releaseOlder();
  assert.equal((await older).status, 200);
  assert.equal(
    sqlite.prepare('SELECT confirmation_email_id FROM newsletter_subscribers').get()!
      .confirmation_email_id,
    'newer-receipt'
  );
  assert.equal(
    sqlite.prepare('SELECT campaign FROM newsletter_signup_attributions').get()!.campaign,
    '2026-09-08-test-the-checker'
  );
  // Even a matching current receipt cannot authorize an obsolete token's attribution.
  await recordNewsletterSignupAttribution(db, {
    email: 'reader@example.com',
    confirmationEmailId: 'newer-receipt',
    confirmationToken: oldToken,
    analyticsEnabled: true,
    landingUrl:
      'https://createsomething.io/newsletters?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-01-the-interface-is-becoming-executable'
  });
  assert.equal(
    sqlite.prepare('SELECT campaign FROM newsletter_signup_attributions').get()!.campaign,
    '2026-09-08-test-the-checker'
  );
  assert.equal(await markNewsletterConfirmed(db, 1, oldToken), false);
  assert.equal(await markNewsletterConfirmed(db, 1, token), true);
  assert.equal(
    (await confirmNewsletterAttribution(db, 1))?.campaign,
    '2026-09-08-test-the-checker'
  );
});
