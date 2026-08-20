import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  dispatchNewsletterCheckInFollowUp,
  hashNewsletterCheckInToken,
  loadNewsletterCheckIn,
  saveNewsletterCheckIn,
  validateNewsletterCheckInInput,
  type NewsletterCheckInDatabase
} from '../src/lib/server/newsletter-check-in.ts';

test('an interested response warms one lead and sends one deduplicated operator notification', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'newsletter-follow-up-'));
  const database = join(directory, 'follow-up.db');
  try {
    execFileSync('sqlite3', [database], {
      input: newsletterFollowUpSchema,
      encoding: 'utf8'
    });
    const db = createSqliteD1(database);
    const input = validateNewsletterCheckInInput({
      originalReason: 'I wanted practical <script>alert(1)</script> operating patterns.',
      stillInterested: 'yes',
      updatesSeen: 'some',
      wantedNext: 'More field reports with failure states.'
    });
    const fingerprint = await saveNewsletterCheckIn(
      db,
      { campaignId: 'campaign-1', subscriberId: 24 },
      input,
      '2026-08-12T20:00:00.000Z'
    );
    let fetchCalls = 0;
    let warmLeadCalls = 0;
    const idempotencyKeys: string[] = [];
    const services = {
      apiKey: 'resend-safe',
      warmLead: async (
        leadDb: NewsletterCheckInDatabase,
        lead: { email: string; stage: string }
      ) => {
        warmLeadCalls += 1;
        assert.equal(lead.email, 'reader@example.com');
        assert.equal(lead.stage, 'consideration');
        await leadDb
          .prepare('INSERT INTO leads (id, name, email, stage) VALUES (?, ?, ?, ?)')
          .bind('lead-1', 'Newsletter subscriber', lead.email, lead.stage)
          .run();
        return { id: 'lead-1' };
      },
      fetch: async (_url: string | URL | Request, init?: RequestInit) => {
        fetchCalls += 1;
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(body.reply_to, 'reader@example.com');
        assert.match(String(body.text), /More field reports with failure states/);
        assert.doesNotMatch(String(body.html), /<script>/);
        assert.match(String(body.html), /&lt;script&gt;/);
        idempotencyKeys.push(new Headers(init?.headers).get('Idempotency-Key') ?? '');
        if (fetchCalls === 1) return new Response('{}', { status: 503 });
        return new Response(JSON.stringify({ id: 'notification-1' }), { status: 200 });
      }
    };

    const first = await dispatchNewsletterCheckInFollowUp(
      db,
      { campaignId: 'campaign-1', subscriberId: 24 },
      fingerprint,
      services
    );
    const repeatedFingerprint = await saveNewsletterCheckIn(
      db,
      { campaignId: 'campaign-1', subscriberId: 24 },
      input,
      '2026-08-12T20:01:00.000Z'
    );
    const retry = await dispatchNewsletterCheckInFollowUp(
      db,
      { campaignId: 'campaign-1', subscriberId: 24 },
      repeatedFingerprint,
      services
    );

    assert.deepEqual(first, { notification: 'sent', warmLead: 'updated' });
    assert.deepEqual(retry, { notification: 'skipped', warmLead: 'skipped' });
    assert.equal(fetchCalls, 2);
    assert.equal(idempotencyKeys[0], idempotencyKeys[1]);
    assert.equal(warmLeadCalls, 1);

    const noFingerprint = await saveNewsletterCheckIn(
      db,
      { campaignId: 'campaign-1', subscriberId: 24 },
      { ...input, stillInterested: 'no' },
      '2026-08-12T20:02:00.000Z'
    );
    const noLongerInterested = await dispatchNewsletterCheckInFollowUp(
      db,
      { campaignId: 'campaign-1', subscriberId: 24 },
      noFingerprint,
      services
    );
    assert.deepEqual(noLongerInterested, { notification: 'sent', warmLead: 'skipped' });
    assert.equal(fetchCalls, 3);
    assert.equal(warmLeadCalls, 1);
    assert.equal(sqliteScalar(database, 'SELECT COUNT(*) FROM leads'), '1');
    assert.equal(sqliteScalar(database, 'SELECT stage FROM leads'), 'consideration');
    assert.equal(
      sqliteScalar(database, 'SELECT notification_status FROM newsletter_reengagement_responses'),
      'sent'
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

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
      const execute = {
        async first<T = Record<string, unknown>>() {
          calls.push({ sql, values });
          return record as T | null;
        },
        async run() {
          calls.push({ sql, values });
          return { success: true };
        }
      } satisfies ReturnType<ReturnType<NewsletterCheckInDatabase['prepare']>['bind']>;

      return {
        bind(...nextValues) {
          values = nextValues;
          return execute;
        }
      } satisfies ReturnType<NewsletterCheckInDatabase['prepare']>;
    }
  };
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function bindSql(sql: string, values: unknown[]): string {
  let index = 0;
  return sql.replaceAll('?', () => sqlLiteral(values[index++]));
}

class SqliteD1Statement {
  constructor(
    private readonly database: string,
    private readonly sql: string,
    private readonly values: unknown[] = []
  ) {}

  bind(...values: unknown[]) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  async first<T>() {
    const rows = this.rows<T>();
    return rows[0] ?? null;
  }

  async run() {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: `${bindSql(this.sql, this.values)}; SELECT changes() AS changes;`,
      encoding: 'utf8'
    }).trim();
    const rows = output ? (JSON.parse(output) as Array<{ changes: number }>) : [];
    return { success: true, meta: { changes: Number(rows.at(-1)?.changes ?? 0) } };
  }

  private rows<T>(): T[] {
    const output = execFileSync('sqlite3', ['-json', this.database], {
      input: bindSql(this.sql, this.values),
      encoding: 'utf8'
    }).trim();
    return output ? (JSON.parse(output) as T[]) : [];
  }
}

function createSqliteD1(database: string): NewsletterCheckInDatabase {
  return {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql);
    }
  } as unknown as NewsletterCheckInDatabase;
}

function sqliteScalar(database: string, sql: string): string {
  return execFileSync('sqlite3', [database], { input: sql, encoding: 'utf8' }).trim();
}

const newsletterFollowUpSchema = `
  CREATE TABLE newsletter_subscribers (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL
  );
  INSERT INTO newsletter_subscribers VALUES (24, 'reader@example.com');
  CREATE TABLE newsletter_reengagement_responses (
    id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, subscriber_id INTEGER NOT NULL,
    original_reason TEXT, still_interested TEXT NOT NULL, updates_seen TEXT NOT NULL,
    wanted_next TEXT, responded_at TEXT NOT NULL, retention_expires_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, response_fingerprint TEXT,
    notification_status TEXT NOT NULL DEFAULT 'pending', notification_email_id TEXT,
    notified_at TEXT, warm_lead_status TEXT NOT NULL DEFAULT 'not_applicable',
    warm_lead_id TEXT, notification_error TEXT, warm_lead_error TEXT,
    UNIQUE(campaign_id, subscriber_id)
  );
  CREATE TABLE leads (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, company TEXT, role TEXT,
    linkedin_url TEXT, source TEXT, source_detail TEXT, campaign TEXT, stage TEXT,
    estimated_value REAL, actual_value REAL, service_interest TEXT,
    first_touch_at TEXT, last_touch_at TEXT, discovery_call_at TEXT,
    proposal_sent_at TEXT, closed_at TEXT, notes TEXT, created_at TEXT, updated_at TEXT
  );
`;
