import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { processSubscription } from '../../canon/src/lib/newsletter/subscribe.ts';
import {
  markNewsletterConfirmed,
  ELIGIBLE_SUBSCRIBERS_SQL
} from '../src/lib/server/newsletter-lifecycle.ts';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    `CREATE TABLE newsletter_subscribers(id INTEGER PRIMARY KEY,email TEXT UNIQUE,subscribed_at TEXT,unsubscribe_token TEXT,confirmation_token TEXT,confirmed_at TEXT,source TEXT,consent_requested_at TEXT,consent_confirmed_at TEXT,consent_method TEXT,consent_evidence TEXT,active INTEGER,status TEXT,audience_classification TEXT,confirmation_email_id TEXT,welcome_email_id TEXT,unsubscribed_at TEXT,updated_at TEXT);`
  );
  let suppressDuringWrite = false;
  const db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      let values: unknown[] = [];
      const query = {
        bind(...next: unknown[]) {
          values = next;
          return query;
        },
        run: async () => {
          if (suppressDuringWrite && sql.includes('SET confirmation_token =')) {
            suppressDuringWrite = false;
            sqlite.exec("UPDATE newsletter_subscribers SET status='suppressed',active=0");
          }
          return {
            success: true,
            meta: { changes: Number(statement.run(...(values as [])).changes) }
          };
        },
        first: async <T>() => (statement.get(...(values as [])) ?? null) as T | null,
        all: async () => ({ success: true, results: statement.all(...(values as [])) })
      };
      return query;
    },
    batch: async () => []
  };
  const seed = (classification: string, status = 'unsubscribed') => {
    sqlite.exec('DELETE FROM newsletter_subscribers');
    sqlite
      .prepare(
        "INSERT INTO newsletter_subscribers(id,email,unsubscribe_token,confirmation_token,confirmed_at,consent_confirmed_at,consent_method,consent_evidence,active,status,audience_classification,unsubscribed_at) VALUES(1,'reader@example.com','old-unsubscribe','old-confirmation','2026-09-01','2026-09-01','single_opt_in','legacy_signup_form',0,?,?, '2026-09-02')"
      )
      .run(status, classification);
  };
  const request = () =>
    processSubscription(
      { email: 'reader@example.com', analyticsEnabled: false },
      { DB: db, RESEND_API_KEY: 'offline' } as never,
      '127.0.0.1',
      'io'
    );
  return {
    sqlite,
    db,
    seed,
    request,
    suppressOnWrite: () => {
      suppressDuringWrite = true;
    }
  };
}

test('a fresh re-subscription qualifies legacy records only after direct confirmation', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => Response.json({ id: 'fresh-confirmation-receipt' });
  for (const classification of ['legacy_or_unknown', 'pending_review']) {
    f.seed(classification);
    assert.equal((await f.request()).status, 200);
    assert.equal(f.sqlite.prepare(ELIGIBLE_SUBSCRIBERS_SQL).all().length, 0);
    assert.equal(await markNewsletterConfirmed(f.db, 1, 'old-confirmation'), false);
    const token = String(
      f.sqlite.prepare('SELECT confirmation_token FROM newsletter_subscribers').get()!
        .confirmation_token
    );
    assert.equal(await markNewsletterConfirmed(f.db, 1, token), true);
    assert.equal(f.sqlite.prepare(ELIGIBLE_SUBSCRIBERS_SQL).all().length, 1, classification);
    assert.equal(
      f.sqlite.prepare('SELECT consent_evidence FROM newsletter_subscribers').get()!
        .consent_evidence,
      'confirmation_link'
    );
  }
});

test('fresh signup cannot clear terminal suppression, including a concurrent suppression event', async (t) => {
  const f = fixture();
  t.after(() => f.sqlite.close());
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let sends = 0;
  globalThis.fetch = async () => {
    sends++;
    return Response.json({ id: 'unexpected' });
  };
  for (const status of ['bounced', 'complained', 'suppressed']) {
    f.seed('pending_review', status);
    assert.equal((await f.request()).status, 400);
  }
  f.seed('legacy_or_unknown');
  f.suppressOnWrite();
  assert.equal((await f.request()).status, 409);
  assert.equal(sends, 0);
  assert.equal(
    f.sqlite.prepare('SELECT status FROM newsletter_subscribers').get()!.status,
    'suppressed'
  );
  assert.equal(f.sqlite.prepare(ELIGIBLE_SUBSCRIBERS_SQL).all().length, 0);
});
