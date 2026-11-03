import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  handleNewsletterAction,
  readNewsletterWorkflow,
  recordEditionDeliveryReceipt,
  type WorkflowDatabase
} from '../src/lib/server/newsletter-workflow.ts';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE newsletter_subscribers (id INTEGER PRIMARY KEY,email TEXT,source TEXT,unsubscribe_token TEXT,confirmed_at TEXT,consent_confirmed_at TEXT,consent_method TEXT,consent_evidence TEXT,audience_classification TEXT,unsubscribed_at TEXT,active INTEGER,status TEXT);
  INSERT INTO newsletter_subscribers VALUES(1,'reader@example.com','io','reader-token','2026-10-01','2026-10-01','double_opt_in','confirmation_link','confirmed_subscriber',NULL,1,'active');`);
  sqlite.exec(
    readFileSync(new URL('../migrations/018_newsletter_editions.sql', import.meta.url), 'utf8')
  );
  const db = {
    prepare(sql: string) {
      const s = sqlite.prepare(sql);
      let values: unknown[] = [];
      const query = {
        bind(...v: unknown[]) {
          values = v;
          return query;
        },
        async run() {
          const r = s.run(...(values as []));
          return { success: true, meta: { changes: Number(r.changes) } };
        },
        async first() {
          return s.get(...(values as [])) ?? null;
        },
        async all() {
          return { success: true, results: s.all(...(values as [])) };
        }
      };
      return query;
    }
  } as WorkflowDatabase;
  const sent: Record<string, unknown>[] = [];
  let outcome = 'sent';
  const provider = async (_: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      sent.push(JSON.parse(String(init.body)));
      if (outcome === 'timeout') throw new Error('timeout');
      if (outcome === 'rejected') return Response.json({ error: 'bad request' }, { status: 400 });
      return Response.json({ id: `message-${sent.length}` });
    }
    const id = String(_).split('/').at(-1)!;
    const message = sent[Number(id.split('-').at(-1)) - 1];
    return Response.json({
      id,
      subject: message?.subject,
      to: [message?.to],
      html: message?.html,
      text: message?.text,
      last_event: ['complained', 'suppressed', 'opened', 'clicked'].includes(outcome)
        ? outcome
        : 'delivered'
    });
  };
  const now = new Date('2026-11-03T15:00:00Z');
  const run = async (input: Record<string, unknown>) => {
    if (input.action === 'approve') {
      const snapshot = await readNewsletterWorkflow(db);
      input = {
        expected_content_hash: snapshot.editions.find((e) => e.slug === input.slug)?.content_hash,
        expected_audience_fingerprint: snapshot.audience.fingerprint,
        ...input
      };
    }
    return handleNewsletterAction(
      db,
      input,
      { email: 'operator@example.com', id: 'operator' },
      { apiKey: 'test', fetcher: provider, now }
    );
  };
  const edition = {
    slug: '2026-11-03-test',
    title: 'Test the checker',
    subject: 'Test the checker',
    owner: 'Micah Johnson',
    author: 'CREATE SOMETHING',
    source_refs: ['docs/guides/GROUND_SEEDED_TRIAL.md'],
    html: '<p>Useful method</p><a href="{{unsubscribe_url}}">Unsubscribe</a>',
    text: 'Useful method\nUnsubscribe: {{unsubscribe_url}}'
  };
  return {
    sqlite,
    db,
    run,
    edition,
    sent,
    setOutcome: (v: string) => {
      outcome = v;
    }
  };
}

test('preparation and content revisions never grant or preserve approval', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await assert.rejects(
    f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' }),
    /review|seed/i
  );
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  await f.run({
    action: 'prepare',
    edition: { ...f.edition, text: 'Revised {{unsubscribe_url}}' }
  });
  const r = await readNewsletterWorkflow(f.db);
  const e = r.editions.find((e) => e.slug === f.edition.slug)!;
  assert.equal(e.approved_by, null);
  assert.equal(e.editorial_status, 'draft');
  assert.equal(e.seed_email_id, null);
});

test('delivery binds approval to audience, renders unsubscribe and never sends a duplicate', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  await f.run({ action: 'send', slug: f.edition.slug });
  await f.run({ action: 'send', slug: f.edition.slug });
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].to, 'reader@example.com');
  assert.match(String(f.sent[1].html), /unsubscribe\?token=reader-token/);
  assert.doesNotMatch(String(f.sent[1].html), /\{\{/);
});

test('a suppression after approval blocks the send before provider access', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  f.sqlite.exec("UPDATE newsletter_subscribers SET status='unsubscribed' WHERE id=1");
  await assert.rejects(f.run({ action: 'send', slug: f.edition.slug }), /audience/i);
  assert.equal(f.sent.length, 1);
});

test('an uncertain provider write cannot be automatically retried', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  f.setOutcome('timeout');
  await f.run({ action: 'send', slug: f.edition.slug });
  await assert.rejects(f.run({ action: 'send', slug: f.edition.slug }), /uncertain|reconcil/i);
  assert.equal(f.sent.length, 2);
});

test('approval rejects a missing seed, an invalid time, and an empty audience', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await assert.rejects(
    f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' }),
    /seed/i
  );
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await assert.rejects(
    f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-10-01T00:00:00Z' }),
    /time/i
  );
  f.sqlite.exec("UPDATE newsletter_subscribers SET consent_method='single_opt_in'");
  await assert.rejects(
    f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' }),
    /eligible/i
  );
});

test('provider mismatch cannot qualify an operator test and historical sends cannot be overwritten', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await assert.rejects(
    handleNewsletterAction(
      f.db,
      { action: 'reconcile', slug: f.edition.slug },
      { email: 'operator@example.com', id: 'operator' },
      {
        apiKey: 'test',
        fetcher: async () =>
          Response.json({ id: 'wrong', subject: 'Test the checker', last_event: 'delivered' })
      }
    ),
    /mismatch/i
  );
  await assert.rejects(
    f.run({
      action: 'prepare',
      edition: { ...f.edition, slug: '2026-09-01-the-interface-is-becoming-executable' }
    }),
    /preserve/i
  );
  const report = await readNewsletterWorkflow(f.db);
  assert.equal(report.audience.eligible, 1);
  assert.equal(
    report.editions.find((e) => e.slug === '2026-09-01-the-interface-is-becoming-executable')!
      .deliveries.length,
    2
  );
});

test('send cannot run outside the exact approval window or after audience growth', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  await assert.rejects(
    handleNewsletterAction(
      f.db,
      { action: 'send', slug: f.edition.slug },
      { id: 'operator', email: 'operator@example.com' },
      { apiKey: 'test', now: new Date('2026-11-03T15:16:00Z') }
    ),
    /window/i
  );
  f.sqlite.exec(
    "INSERT INTO newsletter_subscribers SELECT 2,'second@example.com',source,'second-token',confirmed_at,consent_confirmed_at,consent_method,consent_evidence,audience_classification,unsubscribed_at,active,status FROM newsletter_subscribers WHERE id=1"
  );
  await assert.rejects(f.run({ action: 'send', slug: f.edition.slug }), /audience/i);
  assert.equal(f.sent.length, 1);
});

test('a known failed request requires explicit reset and fresh approval before retry', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  f.setOutcome('rejected');
  await f.run({ action: 'send', slug: f.edition.slug });
  await assert.rejects(f.run({ action: 'send', slug: f.edition.slug }), /started|reconcil/i);
  await f.run({ action: 'retry_failed', slug: f.edition.slug });
  await assert.rejects(f.run({ action: 'send', slug: f.edition.slug }), /approval/i);
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  f.setOutcome('sent');
  await f.run({ action: 'send', slug: f.edition.slug });
  assert.equal(f.sent.length, 3);
  assert.equal(
    (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
      .email_status,
    'sent'
  );
});

test('parallel sends reserve one dispatch and retain an exact uncertain receipt for recovery', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  f.setOutcome('timeout');
  const results = await Promise.allSettled([
    f.run({ action: 'send', slug: f.edition.slug }),
    f.run({ action: 'send', slug: f.edition.slug })
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(f.sent.length, 2);
  const edition = (await readNewsletterWorkflow(f.db)).editions.find(
    (e) => e.slug === f.edition.slug
  )!;
  const receipt = edition.deliveries.find((d) => d.kind === 'audience')!;
  await f.run({
    action: 'attach_receipt',
    slug: f.edition.slug,
    delivery_id: receipt.id,
    provider_email_id: 'message-2'
  });
  assert.equal(
    (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
      .email_status,
    'sent'
  );
  await f.run({ action: 'send', slug: f.edition.slug });
  assert.equal(f.sent.length, 2);
});

test('delivery webhook retains terminal state and ignores open tracking', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await recordEditionDeliveryReceipt(f.db, 'message-1', 'email.delivered');
  await recordEditionDeliveryReceipt(f.db, 'message-1', 'email.sent');
  await recordEditionDeliveryReceipt(f.db, 'message-1', 'email.opened');
  assert.equal(
    (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
      .seed_status,
    'delivered'
  );
  await recordEditionDeliveryReceipt(f.db, 'message-1', 'email.complained');
  await recordEditionDeliveryReceipt(f.db, 'message-1', 'email.delivered');
  assert.equal(
    (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
      .seed_status,
    'failed'
  );
});

test('database failures do not become an empty successful workflow report', async () => {
  const statement = {
    bind() {
      return statement;
    },
    async run() {
      return { success: false };
    },
    async first() {
      return null;
    },
    async all() {
      return { success: false, results: [] };
    }
  };
  await assert.rejects(
    readNewsletterWorkflow({
      prepare() {
        return statement;
      }
    } as WorkflowDatabase),
    /unavailable/i
  );
});

test('provider complaint readback is terminal and cannot be reset for retry', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  await f.run({ action: 'send', slug: f.edition.slug });
  f.setOutcome('complained');
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await assert.rejects(
    f.run({ action: 'retry_failed', slug: f.edition.slug }),
    /terminal|suppression|accepted/i
  );
  assert.equal(f.sent.length, 2);
  assert.equal((await readNewsletterWorkflow(f.db)).audience.eligible, 0);
  assert.equal(
    f.sqlite.prepare('SELECT status FROM newsletter_subscribers WHERE id=1').get()?.status,
    'complained'
  );
});

test('a concurrent send-time reapproval invalidates a stale dispatch before provider access', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  const racingDb = {
    prepare(sql: string) {
      const statement = f.db.prepare(sql);
      if (sql.includes('SELECT id, email, source, unsubscribe_token')) {
        const original = statement.all.bind(statement);
        statement.all = async <T>() => {
          const result = await original<T>();
          f.sqlite.exec(
            "UPDATE newsletter_editions SET send_at='2026-11-04T15:00:00.000Z',approved_at='2026-11-03T15:01:00.000Z' WHERE slug='2026-11-03-test'"
          );
          return result;
        };
      }
      return statement;
    }
  } as WorkflowDatabase;
  let calls = 0;
  await assert.rejects(
    handleNewsletterAction(
      racingDb,
      { action: 'send', slug: f.edition.slug },
      { id: 'operator', email: 'operator@example.com' },
      {
        apiKey: 'test',
        now: new Date('2026-11-03T15:00:00Z'),
        fetcher: async () => {
          calls++;
          return Response.json({ id: 'stale-send' });
        }
      }
    ),
    /approval|changed|started/i
  );
  assert.equal(calls, 0);
});

test('approval rejects missing or stale inspected scope and preserves exact approval history', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  const snapshot = await readNewsletterWorkflow(f.db);
  const inspected = snapshot.editions.find((e) => e.slug === f.edition.slug)!;
  await assert.rejects(
    handleNewsletterAction(
      f.db,
      { action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' },
      { id: 'operator', email: 'operator@example.com' }
    ),
    /inspected content hash/i
  );
  await assert.rejects(
    f.run({
      action: 'approve',
      slug: f.edition.slug,
      send_at: '2026-11-03T15:00:00Z',
      expected_content_hash: 'stale-hash'
    }),
    /content changed/i
  );
  f.sqlite.exec("UPDATE newsletter_subscribers SET email='different@example.com' WHERE id=1");
  await assert.rejects(
    f.run({
      action: 'approve',
      slug: f.edition.slug,
      send_at: '2026-11-03T15:00:00Z',
      expected_audience_fingerprint: snapshot.audience.fingerprint
    }),
    /audience changed/i
  );
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  await f.run({ action: 'review', slug: f.edition.slug });
  const evidence = f.sqlite
    .prepare("SELECT details FROM newsletter_edition_events WHERE action='approve'")
    .get()!;
  const details = JSON.parse(String(evidence.details));
  assert.equal(details.content_hash, inspected.content_hash);
  assert.equal(details.send_at, '2026-11-03T15:00:00.000Z');
  assert.equal(details.approved_by, 'operator@example.com');
  assert.equal(details.audience_count, 1);
  assert.match(details.audience_fingerprint, /^[a-f0-9]{64}$/);
});

test('an explicit seed retry recovers only a known provider rejection', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  f.setOutcome('rejected');
  await f.run({ action: 'seed', slug: f.edition.slug });
  assert.equal(f.sent.length, 1);
  f.setOutcome('sent');
  await f.run({ action: 'seed', slug: f.edition.slug });
  assert.equal(f.sent.length, 2);
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  assert.equal(
    (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
      .seed_status,
    'delivered'
  );
  await f.run({ action: 'seed', slug: f.edition.slug });
  assert.equal(f.sent.length, 2);
});

test('provider suppression is terminal through webhook and exact provider reconciliation', async () => {
  for (const path of ['webhook', 'reconcile']) {
    const f = fixture();
    await f.run({ action: 'prepare', edition: f.edition });
    await f.run({ action: 'review', slug: f.edition.slug });
    await f.run({ action: 'seed', slug: f.edition.slug });
    await f.run({ action: 'reconcile', slug: f.edition.slug });
    await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
    await f.run({ action: 'send', slug: f.edition.slug });
    if (path === 'webhook')
      await recordEditionDeliveryReceipt(f.db, 'message-2', 'email.suppressed');
    else {
      f.setOutcome('suppressed');
      await f.run({ action: 'reconcile', slug: f.edition.slug });
    }
    const report = await readNewsletterWorkflow(f.db);
    assert.equal(report.audience.eligible, 0, path);
    assert.equal(report.editions.find((e) => e.slug === f.edition.slug)!.email_status, 'failed');
    assert.equal(
      f.sqlite.prepare('SELECT status FROM newsletter_subscribers WHERE id=1').get()!.status,
      'suppressed'
    );
    await assert.rejects(f.run({ action: 'retry_failed', slug: f.edition.slug }));
    await recordEditionDeliveryReceipt(f.db, 'message-2', 'email.delivered');
    assert.equal(
      f.sqlite
        .prepare(
          "SELECT status FROM newsletter_edition_deliveries WHERE resend_email_id='message-2'"
        )
        .get()!.status,
      'failed'
    );
    f.setOutcome('opened');
    await f.run({ action: 'reconcile', slug: f.edition.slug });
    assert.equal(
      (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
        .email_status,
      'failed'
    );
  }
});

test('opened and clicked exact receipts resolve uncertainty without retaining engagement', async () => {
  for (const providerState of ['opened', 'clicked']) {
    const f = fixture();
    await f.run({ action: 'prepare', edition: f.edition });
    await f.run({ action: 'review', slug: f.edition.slug });
    await f.run({ action: 'seed', slug: f.edition.slug });
    await f.run({ action: 'reconcile', slug: f.edition.slug });
    await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
    f.setOutcome('timeout');
    await f.run({ action: 'send', slug: f.edition.slug });
    const row = f.sqlite
      .prepare("SELECT id FROM newsletter_edition_deliveries WHERE kind='audience'")
      .get()!;
    f.setOutcome(providerState);
    await f.run({
      action: 'attach_receipt',
      slug: f.edition.slug,
      delivery_id: row.id,
      provider_email_id: 'message-2'
    });
    await f.run({ action: 'reconcile', slug: f.edition.slug });
    assert.equal(
      f.sqlite
        .prepare('SELECT status FROM newsletter_edition_deliveries WHERE id=?')
        .get(row.id as string)!.status,
      'delivered'
    );
    assert.equal(
      (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
        .email_status,
      'sent'
    );
    assert.equal(f.sent.length, 2);
    assert.equal(
      f.sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM newsletter_edition_deliveries WHERE status IN ('opened','clicked')"
        )
        .get()!.count,
      0
    );
  }
});

test('a suppression arriving during provider readback cannot be overwritten by stale delivery evidence', async () => {
  const f = fixture();
  await f.run({ action: 'prepare', edition: f.edition });
  await f.run({ action: 'review', slug: f.edition.slug });
  await f.run({ action: 'seed', slug: f.edition.slug });
  await f.run({ action: 'reconcile', slug: f.edition.slug });
  await f.run({ action: 'approve', slug: f.edition.slug, send_at: '2026-11-03T15:00:00Z' });
  await f.run({ action: 'send', slug: f.edition.slug });
  await handleNewsletterAction(
    f.db,
    { action: 'reconcile', slug: f.edition.slug },
    { email: 'operator@example.com', id: 'operator' },
    {
      apiKey: 'test',
      fetcher: async (input) => {
        const id = String(input).split('/').at(-1)!;
        const message = f.sent[Number(id.split('-').at(-1)) - 1];
        if (id === 'message-2') await recordEditionDeliveryReceipt(f.db, id, 'email.suppressed');
        return Response.json({
          id,
          subject: message.subject,
          to: [message.to],
          last_event: 'opened'
        });
      }
    }
  );
  assert.deepEqual(
    {
      ...f.sqlite
        .prepare(
          "SELECT status,error_code FROM newsletter_edition_deliveries WHERE resend_email_id='message-2'"
        )
        .get()
    },
    { status: 'failed', error_code: 'provider-suppressed' }
  );
  assert.equal(
    (await readNewsletterWorkflow(f.db)).editions.find((e) => e.slug === f.edition.slug)!
      .email_status,
    'failed'
  );
});
