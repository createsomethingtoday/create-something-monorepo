import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { classifyAnalyticsTraffic, processEventBatch } from '../../canon/src/lib/analytics/server';
import { newsletterMetadata } from '../src/lib/newsletter/measurement';
import { NEWSLETTER_DELIVERIES, NEWSLETTER_ENGAGEMENT_SQL, readNewsletterDelivery } from '../src/lib/server/newsletter-analytics';

test('only reviewed campaign tags enter newsletter measurement', () => {
  const url = new URL('https://createsomething.io/papers/proof-surface?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-08-test-the-checker&email=private@example.com');
  assert.deepEqual(newsletterMetadata(url), { newsletterCampaign: '2026_09_08_test_the_checker', newsletterMeasurement: 'first-party-v1' });
  url.searchParams.set('utm_campaign', 'private@example.com');
  assert.equal(newsletterMetadata(url), undefined);
  url.searchParams.set('utm_campaign', '2026-09-08-test-the-checker');
  url.pathname = '/admin';
  assert.equal(newsletterMetadata(url), undefined);
});

test('provider failures and mismatched receipts never become zero delivery', async () => {
  const entry = NEWSLETTER_DELIVERIES[0];
  const failure = await readNewsletterDelivery(entry, 'test', async () => new Response('', { status: 429 }));
  assert.equal(failure.delivered, null);
  assert.equal(failure.status, 'unavailable');
  const mismatch = await readNewsletterDelivery(entry, 'test', async () => Response.json({ id: 'other', subject: entry.subject, last_event: 'delivered' }));
  assert.equal(mismatch.delivered, null);
  const success = await readNewsletterDelivery(entry, 'test', async (url) => Response.json({ id: String(url).split('/').at(-1), subject: entry.subject, last_event: 'delivered' }));
  assert.equal(success.delivered, 2);
  assert.equal((await readNewsletterDelivery(NEWSLETTER_DELIVERIES[1], 'test')).status, 'not-registered');
});

test('SQL deduplicates visits, limits attribution and separates operator traffic', () => {
  const classification = classifyAnalyticsTraffic({ url: 'https://createsomething.io/papers/proof-surface?traffic_class=test' });
  assert.equal(classification.trafficClass, 'test');
  const result = execFileSync('python3', ['-c', `
import sqlite3,json,sys
c=sqlite3.connect(':memory:');c.row_factory=sqlite3.Row
c.execute('CREATE TABLE unified_events(session_id TEXT,property TEXT,action TEXT,created_at TEXT,metadata TEXT)')
def add(s,a,m,offset):
 c.execute("INSERT INTO unified_events VALUES(?, 'io', ?, strftime('%Y-%m-%dT%H:%M:%fZ','now', ?), ?)",(s,a,offset,json.dumps(m)))
m={'newsletterCampaign':'2026_09_08_test_the_checker','newsletterMeasurement':'first-party-v1','trafficClass':'external'}
add('reader','page_view',m,'-20 minutes');add('reader','page_view',m,'-19 minutes')
add('reader','content_link_click',{'trafficClass':'external'},'-18 minutes');add('reader','content_link_click',{'trafficClass':'external'},'-17 minutes')
add('reader','content_copy',{'trafficClass':'external'},'-25 minutes')
add('old','page_view',m,'-2 hours');add('old','content_copy',{'trafficClass':'external'},'-1 minute')
add('test','page_view',dict(m,trafficClass=sys.argv[2]),'-5 minutes')
print(json.dumps([dict(r) for r in c.execute(sys.argv[1])]))
`, NEWSLETTER_ENGAGEMENT_SQL, classification.trafficClass], { encoding: 'utf8' });
  const rows = JSON.parse(result);
  assert.deepEqual(rows.find((r: {traffic_class:string}) => r.traffic_class === 'external'), {
    campaign: '2026-09-08-test-the-checker', traffic_class: 'external', landing_sessions: 2, resource_click_sessions: 1, copy_sessions: 0
  });
  assert.equal(rows.find((r: {traffic_class:string}) => r.traffic_class === 'test').landing_sessions, 1);
});


test('campaign identity survives the real event ingestion sanitizer', async () => {
  let inserted: unknown[] = [];
  const db = {
    prepare(sql: string) { return { bind(...values: unknown[]) {
      if (sql.includes('INSERT INTO unified_events\n')) inserted = values;
      return { run: async () => ({ success: true, results: [] }) };
    } }; },
    batch: async () => []
  };
  const url = new URL('https://createsomething.io/papers/proof-surface?utm_source=newsletter&utm_medium=email&utm_campaign=2026-09-08-test-the-checker&traffic_class=test');
  const result = await processEventBatch(db as unknown as Parameters<typeof processEventBatch>[0], {
    events: [{ eventId: 'newsletter-probe', sessionId: 'newsletter-session', property: 'io', category: 'navigation', action: 'page_view', url: url.href, timestamp: new Date().toISOString(), metadata: newsletterMetadata(url) }],
    sentAt: new Date().toISOString()
  }, {});
  assert.equal(result.success, true);
  const stored = JSON.parse(String(inserted[12]));
  assert.equal(stored.newsletterCampaign, '2026_09_08_test_the_checker');
  assert.equal(stored.trafficClass, 'test');
});
