import assert from 'node:assert/strict';
import test from 'node:test';
import { processSubscription } from '../../canon/src/lib/newsletter/subscribe.ts';
import {
  resolveNewsletterAttribution,
  confirmNewsletterAttribution,
  recordNewsletterSignupAttribution
} from '../../canon/src/lib/newsletter/attribution.ts';

const link =
  'https://createsomething.io/newsletters/2026-09-01-the-interface-is-becoming-executable?utm_source=linkedin&utm_medium=social&utm_campaign=field-notes-20260928';

test('a replaced confirmation attributes the new request and never rewrites confirmed history', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const { readFileSync } = await import('node:fs');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE newsletter_subscribers(id INTEGER PRIMARY KEY,email TEXT,confirmation_email_id TEXT,confirmation_token TEXT,confirmed_at TEXT,consent_evidence TEXT,unsubscribed_at TEXT,active INTEGER,status TEXT);
    INSERT INTO newsletter_subscribers VALUES(1,'reader@example.com','old','old-token',NULL,'pending_confirmation',NULL,1,'active');`);
  sqlite.exec(
    readFileSync(
      new URL('../migrations/019_newsletter_signup_attribution.sql', import.meta.url),
      'utf8'
    )
  );
  const db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...values: unknown[]) {
          return {
            run: async () => {
              statement.run(...(values as []));
              return { success: true };
            },
            first: async <T>() => (statement.get(...(values as [])) ?? null) as T | null
          };
        }
      };
    }
  };
  await recordNewsletterSignupAttribution(
    db,
    {
      email: 'reader@example.com',
      confirmationEmailId: 'old',
      confirmationToken: 'old-token',
      landingUrl: link,
      analyticsEnabled: true
    },
    {}
  );
  sqlite.exec(
    "UPDATE newsletter_signup_attributions SET requested_at='2025-01-01'; UPDATE newsletter_subscribers SET confirmation_email_id='new',confirmation_token='new-token';"
  );
  const next =
    'https://createsomething.io/newsletters?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-08-test-the-checker&traffic_class=test';
  await recordNewsletterSignupAttribution(
    db,
    {
      email: 'reader@example.com',
      confirmationEmailId: 'new',
      confirmationToken: 'new-token',
      landingUrl: next,
      analyticsEnabled: true
    },
    {}
  );
  const snapshot = sqlite.prepare('SELECT * FROM newsletter_signup_attributions').get()!;
  assert.equal(snapshot.confirmation_email_id, 'new');
  assert.equal(snapshot.edition, '2026-09-08-test-the-checker');
  assert.equal(snapshot.channel, 'newsletter');
  assert.equal(snapshot.campaign, '2026-09-08-test-the-checker');
  assert.equal(snapshot.traffic_class, 'test');
  assert.notEqual(snapshot.requested_at, '2025-01-01');
  sqlite.exec(
    "UPDATE newsletter_subscribers SET confirmed_at='2026-11-03',consent_evidence='confirmation_link';"
  );
  const confirmed = await confirmNewsletterAttribution(db, 1);
  assert.equal(confirmed?.edition, '2026-09-08-test-the-checker');
  sqlite.exec(
    "UPDATE newsletter_subscribers SET confirmed_at=NULL, confirmation_email_id='later',confirmation_token='later-token';"
  );
  await recordNewsletterSignupAttribution(
    db,
    {
      email: 'reader@example.com',
      confirmationEmailId: 'later',
      confirmationToken: 'later-token',
      landingUrl: link,
      analyticsEnabled: true
    },
    {}
  );
  assert.equal(
    sqlite.prepare('SELECT confirmation_email_id FROM newsletter_signup_attributions').get()!
      .confirmation_email_id,
    'new'
  );
  sqlite.close();
});

test('only configured public non-personal campaign tags resolve to an edition', () => {
  assert.deepEqual(resolveNewsletterAttribution(link), {
    edition: '2026-09-01-the-interface-is-becoming-executable',
    channel: 'linkedin',
    campaign: 'field-notes-20260928'
  });
  for (const invalid of [
    link + '&utm_source=linkedin',
    link.replace('createsomething.io', 'example.com'),
    link.replace('field-notes-20260928', 'private@example.com'),
    link.replace('/newsletters/2026-09-01-the-interface-is-becoming-executable', '/admin')
  ]) {
    assert.equal(resolveNewsletterAttribution(invalid), null);
  }
});

test('signup persists attribution only with allowed analytics and never changes signup source', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => Response.json({ id: 'confirmation-test' });
  for (const scenario of [
    { enabled: true, dnt: false, optedOut: false, writes: 1 },
    { enabled: true, dnt: false, optedOut: true, writes: 0 },
    { enabled: false, dnt: false, writes: 0 },
    { enabled: true, dnt: true, writes: 0 }
  ]) {
    const calls: { sql: string; values: unknown[] }[] = [];
    const db = {
      prepare(sql: string) {
        let values: unknown[] = [];
        return {
          bind(...next: unknown[]) {
            values = next;
            return this;
          },
          first: async () => null,
          run: async () => {
            calls.push({ sql, values });
            return { success: true };
          },
          all: async () => ({ success: true, results: [] })
        };
      },
      batch: async () => []
    };
    const response = await processSubscription(
      {
        email: 'reader@example.com',
        source: 'io-archive',
        landingUrl: link,
        analyticsEnabled: scenario.enabled
      },
      { DB: db, RESEND_API_KEY: 'offline' } as never,
      '127.0.0.1',
      'io',
      { doNotTrack: scenario.dnt, userOptedOut: scenario.optedOut }
    );
    assert.equal(response.status, 200);
    const attribution = calls.filter((x) =>
      x.sql.includes('INSERT INTO newsletter_signup_attributions')
    );
    assert.equal(attribution.length, scenario.writes, JSON.stringify(scenario));
    if (attribution.length) {
      assert.ok(attribution[0].values.includes('linkedin'));
      assert.ok(attribution[0].values.includes('field-notes-20260928'));
      assert.ok(attribution[0].values.includes('confirmation-test'));
      assert.doesNotMatch(JSON.stringify(attribution[0].values), /utm_|token=/);
    }
    assert.ok(
      calls
        .find((x) => x.sql.includes('INSERT INTO newsletter_subscribers'))
        ?.values.includes('io-archive')
    );
  }
});

test('confirmation attribution is consumed only once and DNT prevents collection', async () => {
  let writes = 0;
  const row = {
    edition: '2026-09-01-the-interface-is-becoming-executable',
    channel: 'linkedin',
    campaign: 'field-notes-20260928',
    traffic_class: 'test'
  };
  const db = {
    prepare(sql: string) {
      assert.match(sql, /confirmed_at IS NULL/);
      return {
        bind() {
          return {
            first: async () => {
              writes++;
              return writes === 1 ? row : null;
            }
          };
        }
      };
    }
  };
  assert.equal(await confirmNewsletterAttribution(db as never, 1, { doNotTrack: true }), null);
  assert.equal(writes, 0);
  assert.deepEqual(await confirmNewsletterAttribution(db as never, 1, {}), row);
  assert.equal(await confirmNewsletterAttribution(db as never, 1, {}), null);
});

test('real signup, direct confirmation and reporting preserve consent and deduplicate counts', async (t) => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, rmSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { markNewsletterConfirmed, ELIGIBLE_SUBSCRIBERS_SQL } =
    await import('../src/lib/server/newsletter-lifecycle.ts');
  const { NEWSLETTER_ATTRIBUTION_SQL } = await import('../src/lib/server/newsletter-analytics.ts');
  const dir = mkdtempSync(join(tmpdir(), 'newsletter-attribution-'));
  const file = join(dir, 'test.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  function query(sql: string, params: unknown[] = []) {
    return JSON.parse(
      execFileSync(
        'python3',
        [
          '-c',
          `import sqlite3,json,sys
c=sqlite3.connect(sys.argv[1]);c.row_factory=sqlite3.Row
cur=c.execute(sys.argv[2],json.loads(sys.argv[3]));rows=[dict(r) for r in cur] if cur.description else [];changes=c.total_changes;c.commit()
print(json.dumps({'success':True,'results':rows,'meta':{'changes':changes}}))`,
          file,
          sql,
          JSON.stringify(params)
        ],
        { encoding: 'utf8' }
      )
    );
  }
  query(
    `CREATE TABLE newsletter_subscribers(id INTEGER PRIMARY KEY,email TEXT UNIQUE,subscribed_at TEXT,unsubscribe_token TEXT,confirmation_token TEXT,confirmed_at TEXT,source TEXT,consent_requested_at TEXT,consent_confirmed_at TEXT,consent_method TEXT,consent_evidence TEXT,active INTEGER,status TEXT,audience_classification TEXT DEFAULT 'legacy_or_unknown',confirmation_email_id TEXT, welcome_email_id TEXT,unsubscribed_at TEXT,updated_at TEXT)`
  );
  const migration = readFileSync(
    new URL('../migrations/019_newsletter_signup_attribution.sql', import.meta.url),
    'utf8'
  );
  execFileSync('python3', [
    '-c',
    'import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.executescript(sys.argv[2]);c.commit()',
    file,
    readFileSync(new URL('../migrations/004_unified_analytics.sql', import.meta.url), 'utf8') +
      readFileSync(new URL('../migrations/006_add_source_property.sql', import.meta.url), 'utf8') +
      migration
  ]);
  const db = {
    prepare(sql: string) {
      let values: unknown[] = [];
      return {
        bind(...next: unknown[]) {
          values = next;
          return this;
        },
        run: async () => query(sql, values),
        first: async () => query(sql, values).results[0] ?? null,
        all: async () => query(sql, values)
      };
    },
    batch: async (statements: { run(): Promise<unknown> }[]) =>
      Promise.all(statements.map((statement) => statement.run()))
  };
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let sends = 0;
  globalThis.fetch = async () => Response.json({ id: `confirmation-${++sends}` });
  const landingMetadata = JSON.stringify({
    newsletterCampaign: 'field_notes_20260928',
    newsletterSource: 'linkedin',
    newsletterMeasurement: 'first-party-social-v1',
    trafficClass: 'test'
  });
  query(
    `INSERT INTO unified_events(id,session_id,property,category,action,url,metadata,created_at) VALUES ('landing','visit','io','navigation','page_view','https://createsomething.io/papers/proof-surface',?,datetime('now','-20 minutes'))`,
    [landingMetadata]
  );
  assert.equal(
    (
      await processSubscription(
        {
          email: 'reader@example.com',
          source: 'io-archive',
          landingUrl: 'https://createsomething.io/newsletters',
          sessionId: 'visit',
          analyticsEnabled: true
        },
        { DB: db, RESEND_API_KEY: 'offline' } as never,
        '127.0.0.1',
        'io'
      )
    ).status,
    200
  );
  assert.equal(
    query("SELECT COUNT(*) AS n FROM unified_events WHERE action='newsletter_requested'").results[0]
      .n,
    1,
    'real analytics ingestion stores the requested conversion'
  );
  assert.equal(query(ELIGIBLE_SUBSCRIBERS_SQL).results.length, 0, 'requested is never eligible');
  const subscriber = query('SELECT id,confirmation_token FROM newsletter_subscribers').results[0];
  assert.equal(
    await markNewsletterConfirmed(db, subscriber.id, subscriber.confirmation_token),
    true
  );
  assert.equal(
    await markNewsletterConfirmed(db, subscriber.id, subscriber.confirmation_token),
    false,
    'refresh loses confirmation transition'
  );
  assert.equal(
    query(ELIGIBLE_SUBSCRIBERS_SQL).results.length,
    1,
    'explicit fresh double opt-in qualifies without promoting legacy'
  );
  assert.ok(await confirmNewsletterAttribution(db, subscriber.id, {}));
  assert.equal(await confirmNewsletterAttribution(db, subscriber.id, {}), null);
  query(
    `INSERT INTO unified_events(id,session_id,property,category,action,url,metadata,created_at) VALUES ('landing-repeat','visit','io','navigation','page_view','https://createsomething.io/newsletters',?,datetime('now'))`,
    [
      JSON.stringify({
        newsletterCampaign: 'field_notes_20260928',
        newsletterSource: 'linkedin',
        newsletterMeasurement: 'first-party-social-v1',
        trafficClass: 'test'
      })
    ]
  );
  const report = query(NEWSLETTER_ATTRIBUTION_SQL).results;
  assert.deepEqual(report, [
    {
      edition: '2026-09-01-the-interface-is-becoming-executable',
      channel: 'linkedin',
      campaign: 'field-notes-20260928',
      traffic_class: 'test',
      landing_sessions: 1,
      requested: 1,
      confirmed: 1
    }
  ]);
  query(
    `INSERT INTO newsletter_subscribers(email,confirmed_at,consent_confirmed_at,consent_method,consent_evidence,active,status,audience_classification) VALUES ('legacy@example.com',datetime('now'),datetime('now'),'single_opt_in','legacy_signup_form',1,'active','legacy_or_unknown')`
  );
  assert.equal(query(ELIGIBLE_SUBSCRIBERS_SQL).results.length, 1, 'legacy record remains excluded');
  assert.equal(
    (
      await processSubscription(
        { email: 'reader@example.com', landingUrl: link, analyticsEnabled: true },
        { DB: db, RESEND_API_KEY: 'offline' } as never,
        '127.0.0.1',
        'io'
      )
    ).status,
    200
  );
  assert.equal(sends, 1, 'already confirmed subscription does not send or overwrite attribution');
  assert.equal(query('SELECT COUNT(*) AS n FROM newsletter_signup_attributions').results[0].n, 1);
});

test('historical and current audience delivery IDs deduplicate without inventing sends', async () => {
  const { mergeNewsletterDeliveryEntries, NEWSLETTER_DELIVERIES } =
    await import('../src/lib/server/newsletter-analytics.ts');
  const first = NEWSLETTER_DELIVERIES[0];
  const entries = mergeNewsletterDeliveryEntries([
    { campaign: first.campaign, subject: first.subject, resend_email_id: first.ids[0] },
    { campaign: 'new-edition', subject: 'New edition', resend_email_id: 'audience-1' },
    { campaign: 'draft', subject: 'Draft', resend_email_id: null }
  ]);
  assert.equal(entries.find((x) => x.campaign === first.campaign)?.ids.length, 2);
  assert.deepEqual(entries.find((x) => x.campaign === 'new-edition')?.ids, ['audience-1']);
  assert.deepEqual(entries.find((x) => x.campaign === 'draft')?.ids, []);
});

test('direct attribution keeps missing agent unknown, preview separate and opt-out private', async () => {
  for (const scenario of [
    { context: {}, expected: 'unknown' },
    { context: { userAgent: 'Mozilla/5.0' }, expected: 'external' },
    { context: { userAgent: 'Playwright' }, expected: 'automated' },
    {
      context: { requestUrl: 'https://branch.project.pages.dev/api/newsletter' },
      expected: 'preview'
    },
    { context: { userOptedOut: true }, expected: null }
  ]) {
    let traffic: string | null = null;
    const db = {
      prepare() {
        return {
          bind(...values: unknown[]) {
            traffic = String(values[4]);
            return { run: async () => ({ success: true }), first: async () => null };
          }
        };
      }
    };
    await recordNewsletterSignupAttribution(
      db,
      {
        email: 'reader@example.com',
        confirmationEmailId: 'seed',
        confirmationToken: 'seed-token',
        landingUrl: link,
        analyticsEnabled: true
      },
      scenario.context
    );
    assert.equal(traffic, scenario.expected);
  }
});

test('session attribution requires a recent reviewed landing and revalidates persisted tags', async () => {
  let lookup = '';
  let writes = 0;
  const db = {
    prepare(sql: string) {
      return {
        bind() {
          return {
            first: async () => {
              lookup = sql;
              return {
                metadata: JSON.stringify({
                  newsletterCampaign: 'private@example.com',
                  newsletterSource: 'linkedin',
                  newsletterMeasurement: 'first-party-social-v1'
                })
              };
            },
            run: async () => {
              writes++;
              return { success: true };
            }
          };
        }
      };
    }
  };
  await recordNewsletterSignupAttribution(
    db as never,
    {
      email: 'reader@example.com',
      confirmationEmailId: 'seed',
      confirmationToken: 'seed-token',
      landingUrl: 'https://createsomething.io/newsletters',
      sessionId: 'session',
      analyticsEnabled: true
    },
    {}
  );
  assert.equal(writes, 0);
  assert.match(lookup, /-30 minutes/);
  assert.match(lookup, /session_id = \?/);
  assert.match(lookup, /property = 'io'/);
});

test('signup HTTP handler honors DNT and GPC even when body requests attribution', async (t) => {
  const { createNewsletterHandler } = await import('../../canon/src/lib/newsletter/subscribe.ts');
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => Response.json({ id: 'confirmation-test' });
  for (const header of ['dnt', 'sec-gpc']) {
    const statements: string[] = [];
    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return this;
          },
          first: async () => null,
          run: async () => {
            statements.push(sql);
            return { success: true };
          },
          all: async () => ({ success: true, results: [] })
        };
      },
      batch: async () => []
    };
    const response = await createNewsletterHandler({ property: 'io' })({
      request: new Request('https://createsomething.io/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json', [header]: '1' },
        body: JSON.stringify({
          email: 'reader@example.com',
          analyticsEnabled: true,
          landingUrl: link
        })
      }),
      platform: { env: { DB: db, RESEND_API_KEY: 'offline' } } as never,
      getClientAddress: () => '127.0.0.1'
    });
    assert.equal(response.status, 200);
    assert.ok(!statements.some((sql) => sql.includes('newsletter_signup_attributions')), header);
  }
});
