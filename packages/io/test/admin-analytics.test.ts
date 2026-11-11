import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  normalizeAnalyticsDays,
  normalizeAnalyticsPath
} from '../src/lib/admin/analytics-dashboard';
import { scorecardWindows, formatWeeklyReport } from '../src/lib/admin/weekly-scorecard';
import {
  readWeeklyScorecard,
  type AnalyticsReadDatabase
} from '../src/lib/server/analytics-scorecard';
import { GET } from '../src/routes/api/admin/analytics/+server';
import { readNewsletterDelivery } from '../src/lib/server/newsletter-analytics';

const now = new Date('2026-11-11T19:55:00Z');
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE unified_events(id TEXT PRIMARY KEY,session_id TEXT,property TEXT,category TEXT,action TEXT,url TEXT,user_agent TEXT,metadata TEXT,created_at TEXT,referrer TEXT,ip_country TEXT);
    CREATE INDEX idx_report_property_time ON unified_events(property,created_at);
    CREATE TABLE newsletter_subscribers(id INTEGER,confirmed_at TEXT,consent_confirmed_at TEXT,consent_method TEXT,consent_evidence TEXT,audience_classification TEXT,unsubscribed_at TEXT,active INTEGER,status TEXT);
    CREATE TABLE newsletter_signup_attributions(subscriber_id INTEGER PRIMARY KEY,traffic_class TEXT,requested_at TEXT,confirmed_at TEXT);
    CREATE TABLE newsletter_edition_deliveries(kind TEXT,status TEXT,resend_email_id TEXT,created_at TEXT);
    CREATE TABLE contact_request_receipts(request_id TEXT PRIMARY KEY,created_at TEXT);
    CREATE TABLE lesson_progress(status TEXT,completed_at INTEGER);
    CREATE TABLE mcp_tool_invocations(server_name TEXT,account_id TEXT,created_at TEXT);
    CREATE TABLE mcp_hub_routes(hub_server_name TEXT,account_id TEXT,created_at TEXT);`);
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    prepare(query: string) {
      const entry = { sql: query, values: [] as unknown[] };
      queries.push(entry);
      return {
        bind(...values: unknown[]) {
          entry.values = values;
          return this;
        },
        async all() {
          return { success: true, results: sql.prepare(query).all(...(entry.values as never[])) };
        }
      };
    }
  } as unknown as AnalyticsReadDatabase;
  let id = 0;
  const event = (
    session: string,
    url: string,
    opts: {
      date?: string;
      property?: string;
      action?: string;
      ua?: string;
      referrer?: string;
      country?: string;
      metadata?: Record<string, string>;
    } = {}
  ) => {
    sql
      .prepare('INSERT INTO unified_events VALUES(?,?,?,?,?,?,?,?,?,?,?)')
      .run(
        String(++id),
        session,
        opts.property ?? 'io',
        'navigation',
        opts.action ?? 'page_view',
        url,
        opts.ua ?? 'Mozilla/5.0',
        JSON.stringify(opts.metadata ?? { trafficClass: 'external' }),
        opts.date ?? '2026-11-05 12:00:00',
        opts.referrer ?? null,
        opts.country ?? null
      );
  };
  return { sql, db, queries, event };
}
const metric = (report: Awaited<ReturnType<typeof readWeeklyScorecard>>, id: string) =>
  report.metrics.find((m) => m.id === id)!;

test('weekly review defaults to seven complete UTC days and supports exact 7/30/90 only', () => {
  for (const value of [null, '365', '7junk', 'not-a-number', ''])
    assert.equal(normalizeAnalyticsDays(value), 7);
  assert.equal(normalizeAnalyticsDays('30'), 30);
  assert.equal(normalizeAnalyticsDays('90'), 90);
  assert.deepEqual(scorecardWindows(null, now), {
    days: 7,
    current: { start: '2026-11-04T00:00:00.000Z', end: '2026-11-11T00:00:00.000Z' },
    prior: { start: '2026-10-28T00:00:00.000Z', end: '2026-11-04T00:00:00.000Z' }
  });
});

test('paths strip query/fragment and redact encoded private and opaque paths', () => {
  for (const path of [
    '/map/%73hare/private-token?email=private@example.com',
    '/auth/callback',
    '/%2561dmin/private',
    '/map/workspace/secret',
    '/map/subscribe',
    '/delivery/client-name',
    '/prospects/client-name',
    '/mcp-access',
    '/progress',
    '/foo/private@example.com',
    '/papers/' + 'a'.repeat(40)
  ])
    assert.equal(normalizeAnalyticsPath(path), '/[redacted]', path);
  assert.equal(normalizeAnalyticsPath('/papers/proof?utm_source=newsletter#top'), '/papers/proof');
  assert.equal(normalizeAnalyticsPath('services'), '/services');
  assert.equal(
    normalizeAnalyticsPath('/papers/a-useful-public-paper-with-a-long-readable-slug'),
    '/papers/a-useful-public-paper-with-a-long-readable-slug'
  );
});

test('Learn-only traffic comes from LMS_DB and missing sources never become zeros', async () => {
  const learn = fixture();
  learn.event('learn', 'https://learn.createsomething.space/paths', { property: 'lms' });
  const report = await readWeeklyScorecard({ LMS_DB: learn.db }, null, now);
  assert.equal(report.properties.find((p) => p.property === 'lms')?.views, 1);
  assert.equal(report.properties.find((p) => p.property === 'io')?.views, null);
  assert.equal(report.sources.find((s) => s.id === 'shared')?.status, 'unavailable');
  assert.equal(metric(report, 'mcp-Hub requests').current, null);
  assert.equal(metric(report, 'bookings').current, null);
  assert.equal(metric(report, 'resource-use').current, null);
  assert.equal(report.daily.length, 0);
});

test('same-session test/private/preview/automation contamination excludes every observed event', async () => {
  const f = fixture();
  for (const [session, url, opts] of [
    ['test', 'https://createsomething.io/', { metadata: { trafficClass: 'test' } }],
    ['private', 'https://createsomething.io/map/%73hare/private-token', {}],
    ['preview', 'https://branch.pages.dev/', {}],
    ['bot', 'https://createsomething.io/', { ua: 'HeadlessChrome Playwright' }],
    ['query', 'https://createsomething.io/?email=private@example.com', {}],
    [
      'prior-test',
      'https://createsomething.io/',
      { metadata: { trafficClass: 'internal' }, date: '2026-11-03 10:00:00' }
    ]
  ] as const) {
    f.event(session, 'https://createsomething.io/papers/proof');
    f.event(session, url, opts);
  }
  f.event('safe', 'https://www.createsomething.io/papers/proof?utm_campaign=public');
  f.event('unknown', 'https://createsomething.io/', { metadata: {} });
  // Canonical hosts must match the declared property, never suffix-match a lookalike.
  f.event('spoof', 'https://createsomething.io.evil.example/');
  f.event('wrong-property', 'https://learn.createsomething.space/', { property: 'io' });
  const report = await readWeeklyScorecard({ DB: f.db, LMS_DB: fixture().db }, null, now);
  const io = report.properties.find((p) => p.property === 'io')!;
  assert.equal(io.sessions, 2);
  assert.equal(io.external, 1);
  assert.equal(io.unclassified, 1);
  assert.equal(io.excluded, 8);
  assert.equal(io.views, 2);
  assert.equal(io.priorViews, 0);
  const serialized = JSON.stringify(report);
  for (const secret of ['private-token', 'private@example.com', 'evil.example', 'utm_campaign'])
    assert.ok(!serialized.includes(secret));
  assert.equal(report.topPages.find((p) => p.path === '/papers/proof')?.count, 1);
});

test('ISO and sqlite datetime boundaries use the same inclusive start and exclusive end', async () => {
  const f = fixture();
  for (const [id, date] of [
    ['p0', '2026-10-28 00:00:00'],
    ['p1', '2026-11-03T23:59:59.999Z'],
    ['c0', '2026-11-04 00:00:00'],
    ['c1', '2026-11-04T00:00:00.000Z'],
    ['end', '2026-11-11T00:00:00Z'],
    ['before', '2026-10-27 23:59:59']
  ])
    f.event(id, 'https://createsomething.io/', { date });
  const report = await readWeeklyScorecard({ DB: f.db, LMS_DB: fixture().db }, null, now);
  assert.equal(metric(report, 'io-sessions').current, 2);
  assert.equal(metric(report, 'io-sessions').prior, 2);
  assert.equal(report.daily.length, 7);
  assert.equal(report.daily[0].count, 2);
  assert.equal(report.daily.at(-1)?.count, 0);
  assert.ok(f.queries.every((q) => !q.sql.includes("datetime('now'")));
  const query = f.queries.find((q) => q.sql.includes('FROM unified_events'))!;
  const plan = f.sql
    .prepare('EXPLAIN QUERY PLAN ' + query.sql)
    .all(...(query.values as never[]))
    .map((row) => String(row.detail))
    .join(' ');
  assert.match(plan, /idx_report_property_time/);
  assert.ok(!plan.includes('TEMP B-TREE FOR ORDER BY'));

  assert.ok(
    f.queries.filter((q) => q.sql.includes('unified_events')).every((q) => q.values.length === 4)
  );
});

test('eligible audience, once-only confirmations and historical send dates stay distinct', async () => {
  const f = fixture();
  f.sql.exec(`INSERT INTO newsletter_subscribers VALUES
    (1,'2026-09-01','2026-09-01','double_opt_in','confirmation_link','confirmed_subscriber',NULL,1,'active'),
    (2,'2026-09-01',NULL,NULL,NULL,NULL,NULL,1,'active'),
    (3,'2026-09-01','2026-09-01','double_opt_in','confirmation_link','confirmed_subscriber','2026-11-01',0,'unsubscribed');
    INSERT INTO newsletter_signup_attributions VALUES (1,'external','2026-11-03 23:00:00','2026-11-04T00:00:00Z'),(2,'test','2026-11-05','2026-11-05');
    INSERT INTO newsletter_edition_deliveries VALUES
    ('historical-audience','historical-delivered','historical-id','2026-11-05'),
    ('seed','delivered','seed-id','2026-11-05'),('audience','sent','audience-id','2026-11-05'),
    ('audience','sent','audience-id','2026-11-05'),('audience','pending','pending-id','2026-11-05');`);
  const report = await readWeeklyScorecard({ DB: f.db }, null, now);
  assert.deepEqual({ ...report.audience }, { total: 3, active: 2, eligible: 1 });
  assert.equal(metric(report, 'confirmations').current, 1);
  assert.equal(metric(report, 'requests').prior, 1);
  assert.equal(metric(report, 'deliveries').current, 1);
  assert.equal(report.historicalDeliveries, 1);
  assert.ok(!JSON.stringify(report).includes('audience-id'));
  assert.ok(f.queries.every((q) => !q.sql.match(/SELECT.*(?:\bemail\b|unsubscribe_token)/i)));
});

test('configured newsletter landings and resource use follow the 30-minute rule after filtering', async () => {
  const f = fixture();
  const campaign = '2026_09_01_the_interface_is_becoming_executable';
  for (const session of ['reader', 'test', 'late']) {
    f.event(session, 'https://createsomething.io/newsletters', {
      date: '2026-11-05 12:00:00',
      metadata: {
        trafficClass: session === 'test' ? 'test' : 'external',
        newsletterCampaign: campaign,
        newsletterMeasurement: 'first-party-v1'
      }
    });
    f.event(session, 'https://createsomething.io/newsletters', {
      date: session === 'late' ? '2026-11-05 12:31:00' : '2026-11-05 12:10:00',
      action: 'content_link_click'
    });
  }
  const report = await readWeeklyScorecard({ DB: f.db }, null, now);
  assert.equal(metric(report, 'newsletter-landings').current, 2);
  assert.equal(metric(report, 'newsletter-resourceUse').current, 1);
});

test('hub, routed attempts and downstream counts stay separate; client and unknown accounts excluded', async () => {
  const f = fixture();
  f.sql.exec(`INSERT INTO mcp_tool_invocations VALUES
    ('create-something-hub-remote','operator','2026-11-05'),('downstream','operator','2026-11-05'),
    ('downstream','client-private','2026-11-05'),('downstream','unknown','2026-11-05');
    INSERT INTO mcp_hub_routes VALUES('create-something-hub-remote','operator','2026-11-05');`);
  const report = await readWeeklyScorecard({ TELEMETRY_DB: f.db }, null, now);
  for (const layer of ['Hub requests', 'Routed attempts', 'Downstream calls'])
    assert.equal(metric(report, `mcp-${layer}`).current, 1);
  f.sql.exec('DROP TABLE mcp_hub_routes');
  const partial = await readWeeklyScorecard({ TELEMETRY_DB: f.db }, null, now);
  assert.equal(metric(partial, 'mcp-Routed attempts').current, null);
  assert.equal(metric(partial, 'mcp-Hub requests').current, 1);
  assert.equal(partial.sources.find((s) => s.id === 'mcp')?.status, 'unavailable');
});

test('source overflow and D1 failure are unavailable, never truncated successful data', async () => {
  const f = fixture();
  f.sql.exec(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<20001)
    INSERT INTO unified_events SELECT x,x,'io','navigation','page_view','https://createsomething.io/','Mozilla/5.0','{}','2026-11-05',NULL,NULL FROM n`);
  const report = await readWeeklyScorecard({ DB: f.db }, null, now);
  assert.equal(metric(report, 'io-sessions').current, null);
  assert.equal(report.topPages.length, 0);
  const broken = {
    prepare() {
      throw new Error('private database detail');
    }
  } as unknown as AnalyticsReadDatabase;
  const failed = await readWeeklyScorecard({ LMS_DB: broken }, null, now);
  assert.equal(metric(failed, 'lms-sessions').current, null);
  assert.ok(!JSON.stringify(failed).includes('private database detail'));
});

test('endpoint enforces admin, private no-store on JSON/download/errors, and report is reusable', async () => {
  const f = fixture();
  for (const format of ['', '&format=markdown']) {
    const response = await GET({
      url: new URL(`https://createsomething.io/api/admin/analytics?days=7${format}`),
      locals: { user: { role: 'admin' } },
      platform: { env: { DB: f.db, LMS_DB: f.db } }
    } as never);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    if (format) assert.match(await response.text(), /## Source checks/);
    else {
      const body = (await response.json()) as { sources: Array<{ id: string; status: string }> };
      assert.equal(body.sources.find((s: { id: string }) => s.id === 'mcp')?.status, 'unavailable');
    }
  }
  const forbidden = await GET({
    url: new URL('https://createsomething.io/api/admin/analytics'),
    locals: {},
    platform: { env: { DB: f.db } }
  } as never);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('cache-control'), 'private, no-store');
  const report = await readWeeklyScorecard({}, null, now);
  assert.match(formatWeeklyReport(report), /Unavailable/);
  const hook = readFileSync(new URL('../src/hooks.server.ts', import.meta.url), 'utf8');
  assert.match(hook, /isAdminApiRoute/);
  assert.match(hook, /role = \?/);
});

test('fresh provider failure stays null and does not become stored delivery success', async () => {
  const delivery = await readNewsletterDelivery(
    { campaign: 'fixture', subject: 'Fixture', ids: ['controlled'] },
    'fixture-key',
    async () => new Response('', { status: 503 }),
    async () => {}
  );
  assert.equal(delivery.status, 'unavailable');
  assert.equal(delivery.delivered, null);
});

test('discovery preserves acquisition and country context without exposing referrer URLs or identifiers', async () => {
  const f = fixture();
  f.event('search', 'https://createsomething.io/papers/proof', {
    referrer: 'https://www.google.com/search?q=private-query',
    country: 'US'
  });
  f.event('search', 'https://createsomething.io/papers/next', {
    date: '2026-11-05 12:01:00',
    referrer: 'https://createsomething.io/papers/proof',
    country: 'US'
  });
  f.event('ai', 'https://createsomething.io/', {
    referrer: 'https://chatgpt.com/c/private-thread',
    country: 'CA'
  });
  f.event('own', 'https://createsomething.io/', {
    referrer: 'https://createsomething.ltd/standards',
    country: 'US'
  });
  f.event('other', 'https://createsomething.io/', {
    referrer: 'https://www.google.com.evil.example/token/private',
    country: 'invalid-private'
  });
  f.event('prior', 'https://createsomething.io/', {
    date: '2026-11-03 12:00:00',
    referrer: 'https://www.google.com/search?private=value',
    country: 'GB'
  });
  f.event('test', 'https://createsomething.io/', {
    referrer: 'https://www.google.com/',
    country: 'DE',
    metadata: { trafficClass: 'test' }
  });
  const report = await readWeeklyScorecard({ DB: f.db, LMS_DB: fixture().db }, null, now);
  assert.deepEqual(
    report.acquisition.find((r) => r.property === 'io' && r.channel === 'search_referral'),
    { property: 'io', channel: 'search_referral', current: 1, prior: 1 }
  );
  assert.equal(report.acquisition.find((r) => r.channel === 'ai_referral')?.current, 1);
  assert.equal(report.acquisition.find((r) => r.channel === 'own_properties')?.current, 1);
  assert.equal(report.acquisition.find((r) => r.channel === 'other_referral')?.current, 1);
  assert.deepEqual(report.countries, [
    { country: 'US', views: 3 },
    { country: 'CA', views: 1 }
  ]);
  const output = JSON.stringify(report) + formatWeeklyReport(report);
  for (const secret of [
    'private-query',
    'private-thread',
    'evil.example',
    'invalid-private',
    '/search?'
  ])
    assert.ok(!output.includes(secret));
  assert.match(formatWeeklyReport(report), /Acquisition/);
});

test('authoritative scheduler binding supplies aggregate outcomes and never returns its private payload', async () => {
  const requests: unknown[] = [];
  const report = await readWeeklyScorecard(
    {
      SCHEDULER_REPORTS: {
        async getBookingSummary(windows) {
          requests.push(windows);
          return {
            source: 'scheduler-receipts',
            current: { committed: 2, rescheduled: 1, cancelled: 1 },
            prior: { committed: 1, rescheduled: 0, cancelled: 0 },
            latestAt: '2026-11-05T12:00:00.000Z',
            email: 'never-return@example.com'
          };
        }
      }
    },
    null,
    now
  );
  assert.equal(metric(report, 'bookings').current, 2);
  assert.equal(metric(report, 'bookings').prior, 1);
  assert.equal(metric(report, 'booking-reschedules').current, 1);
  assert.equal(metric(report, 'booking-cancellations').current, 1);
  assert.equal(report.sources.find((s) => s.id === 'bookings')?.status, 'ready');
  assert.deepEqual(requests, [{ current: report.windows.current, prior: report.windows.prior }]);
  assert.ok(!JSON.stringify(report).includes('never-return'));
  for (const response of [
    new Error('private upstream detail'),
    {
      source: 'scheduler-receipts' as const,
      current: { committed: -1, rescheduled: 0, cancelled: 0 },
      prior: { committed: 0, rescheduled: 0, cancelled: 0 },
      latestAt: null
    }
  ]) {
    const broken = await readWeeklyScorecard(
      {
        SCHEDULER_REPORTS: {
          async getBookingSummary() {
            if (response instanceof Error) throw response;
            return response;
          }
        }
      },
      null,
      now
    );
    assert.equal(metric(broken, 'bookings').current, null);
    assert.equal(broken.sources.find((s) => s.id === 'bookings')?.status, 'unavailable');
    assert.ok(!JSON.stringify(broken).includes('private upstream detail'));
  }
});

test('booking interest stays distinct from authoritative booking outcomes', async () => {
  const f = fixture();
  f.event('intent', 'https://createsomething.agency/book', {
    property: 'agency',
    action: 'booking_cta_click'
  });
  f.event('intent', 'https://createsomething.agency/book', {
    property: 'agency',
    action: 'booking_cta_click'
  });
  f.event('browser-only', 'https://createsomething.agency/book', {
    property: 'agency',
    action: 'booking_completed'
  });
  const report = await readWeeklyScorecard({ DB: f.db }, null, now);
  assert.equal(metric(report, 'booking-intent').current, 1);
  assert.equal(metric(report, 'bookings').current, null);
});

test('newsletter resource use honors each reviewed campaign landing in the same session', async () => {
  const { NEWSLETTER_CAMPAIGNS } = await import('../src/lib/newsletter/measurement');
  const f = fixture();
  for (const [campaign, date] of [
    [NEWSLETTER_CAMPAIGNS[0], '2026-11-05 12:00:00'],
    [NEWSLETTER_CAMPAIGNS[1], '2026-11-05 12:35:00']
  ])
    f.event('reader', 'https://createsomething.io/newsletters', {
      date,
      metadata: {
        trafficClass: 'external',
        newsletterMeasurement: 'first-party-v1',
        newsletterCampaign: campaign
      }
    });
  f.event('reader', 'https://createsomething.io/newsletters', {
    date: '2026-11-05 12:40:00',
    action: 'content_copy'
  });
  const report = await readWeeklyScorecard({ DB: f.db }, null, now);
  assert.equal(metric(report, 'newsletter-landings').current, 1);
  assert.equal(metric(report, 'newsletter-resourceUse').current, 1);
});
