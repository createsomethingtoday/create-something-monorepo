import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { classifyAnalyticsTraffic, processEventBatch } from '../../canon/src/lib/analytics/server';
import { AnalyticsClient } from '../../canon/src/lib/analytics/client';
import { NEWSLETTER_CAMPAIGNS, newsletterMetadata } from '../src/lib/newsletter/measurement';
import { NEWSLETTER_DELIVERIES, NEWSLETTER_ENGAGEMENT_SQL, readNewsletterDelivery } from '../src/lib/server/newsletter-analytics';

const SOCIAL_LINKS = [
  'https://createsomething.io/newsletters/2026-09-01-the-interface-is-becoming-executable?utm_source=linkedin&utm_medium=social&utm_campaign=field-notes-20260928&utm_content=founder-post',
  'https://createsomething.io/newsletters/2026-09-01-the-interface-is-becoming-executable?utm_source=substack&utm_medium=social&utm_campaign=field-notes-20260928&utm_content=note'
];

for (const link of SOCIAL_LINKS) {
  const source = new URL(link).searchParams.get('utm_source')!;
  test(`${source}/social campaign is attributed on article and archive only`, () => {
    const url = new URL(link);
    const expected = {
      newsletterCampaign: 'field_notes_20260928',
      newsletterSource: source,
      newsletterMedium: 'social',
      newsletterMeasurement: 'first-party-social-v1'
    };
    assert.deepEqual(newsletterMetadata(url), expected);
    for (const path of ['/newsletters', '/newsletters/', `${url.pathname}/`]) {
      url.pathname = path;
      assert.deepEqual(newsletterMetadata(url), expected);
    }
    for (const path of ['/admin', '/admin/newsletters', '/subscribe', '/newsletters-extra', '/newsletters/unpublished-edition', '/newsletters/article/extra', '/papers/proof-surface']) {
      url.pathname = path;
      assert.equal(newsletterMetadata(url), undefined, path);
    }
  });
}

test('social attribution rejects missing, unknown, malformed and ambiguous required tags', () => {
  for (const [key, invalid] of [
    ['utm_source', ['newsletter', 'twitter', 'LinkedIn', ' linkedin', 'private@example.com', '%ZZ']],
    ['utm_medium', ['email', 'Social', 'social ', '%E0%A4%A']],
    ['utm_campaign', ['2026-09-01-the-interface-is-becoming-executable', 'field-notes-20260929', 'field-notes-20260928-private', 'private@example.com', '%00']]
  ] as const) {
    for (const value of ['', ...invalid]) {
      const url = new URL(SOCIAL_LINKS[0]);
      url.searchParams.set(key, value);
      assert.equal(newsletterMetadata(url), undefined, `${key}=${value}`);
    }
    const missing = new URL(SOCIAL_LINKS[0]);
    missing.searchParams.delete(key);
    assert.equal(newsletterMetadata(missing), undefined, `missing ${key}`);
    for (const value of ['private@example.com', new URL(SOCIAL_LINKS[0]).searchParams.get(key)!]) {
      const duplicate = new URL(SOCIAL_LINKS[0]);
      duplicate.searchParams.append(key, value);
      assert.equal(newsletterMetadata(duplicate), undefined, `duplicate ${key}`);
    }
  }
  assert.equal(newsletterMetadata(new URL(SOCIAL_LINKS[0].replace('linkedin', '%E0%A4%A'))), undefined);
});

test('social metadata never copies arbitrary content, recipient or token parameters', () => {
  const url = new URL(SOCIAL_LINKS[0]);
  const expected = newsletterMetadata(url);
  assert.ok(expected);
  url.searchParams.set('utm_content', 'private@example.com');
  url.searchParams.set('recipient', 'private-recipient');
  url.searchParams.set('token', 'private-token');
  assert.deepEqual(newsletterMetadata(url), expected);
});

test('all existing newsletter/email campaigns retain their exact metadata and page scope', () => {
  for (const campaign of NEWSLETTER_CAMPAIGNS) {
    for (const path of ['/papers/proof-surface', '/newsletters', '/subscribe']) {
      const url = new URL(`https://createsomething.io${path}?utm_source=newsletter&utm_medium=email&utm_campaign=${campaign}`);
      assert.deepEqual(newsletterMetadata(url), {
        newsletterCampaign: campaign.replaceAll('-', '_'), newsletterMeasurement: 'first-party-v1'
      });
    }
  }
});

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
for i,social in enumerate(json.loads(sys.argv[3])):
 add('social-'+str(i),'page_view',dict(social,trafficClass='external'),'-5 minutes')
print(json.dumps([dict(r) for r in c.execute(sys.argv[1])]))
`, NEWSLETTER_ENGAGEMENT_SQL, classification.trafficClass, JSON.stringify(SOCIAL_LINKS.map((link) => newsletterMetadata(new URL(link))))], { encoding: 'utf8' });
  const rows = JSON.parse(result);
  assert.equal(rows.length, 2, 'social landings must not enter the existing email report');
  assert.deepEqual(rows.find((r: {traffic_class:string}) => r.traffic_class === 'external'), {
    campaign: '2026-09-08-test-the-checker', traffic_class: 'external', landing_sessions: 2, resource_click_sessions: 1, copy_sessions: 0
  });
  assert.equal(rows.find((r: {traffic_class:string}) => r.traffic_class === 'test').landing_sessions, 1);
});

test('social metadata survives ingestion while query parameters are stripped', async () => {
  for (const link of SOCIAL_LINKS) {
    let inserted: unknown[] = [];
    const db = {
      prepare(sql: string) { return { bind(...values: unknown[]) {
        if (sql.includes('INSERT INTO unified_events\n')) inserted = values;
        return { run: async () => ({ success: true, results: [] }) };
      } }; },
      batch: async () => []
    };
    const url = new URL(link);
    url.searchParams.set('traffic_class', 'test');
    url.searchParams.set('token', 'private-token');
    url.searchParams.set('email', 'private@example.com');
    const metadata = newsletterMetadata(url);
    assert.ok(metadata);
    const result = await processEventBatch(db as unknown as Parameters<typeof processEventBatch>[0], {
      events: [{ eventId: 'social-probe', sessionId: 'social-session', property: 'io', category: 'navigation', action: 'page_view', url: url.href, timestamp: new Date().toISOString(), metadata }],
      sentAt: new Date().toISOString()
    }, {});
    assert.equal(result.success, true);
    assert.deepEqual(JSON.parse(String(inserted[12])), { ...metadata, trafficClass: 'test', trafficClassSource: 'declared' });
    const storedUrl = new URL(String(inserted[8]));
    assert.equal(storedUrl.origin, url.origin);
    assert.ok(storedUrl.pathname.startsWith('/newsletters/'));
    assert.equal(storedUrl.search, '');
    assert.equal(storedUrl.hash, '');
    assert.doesNotMatch(JSON.stringify(inserted), /private-token|private@example|utm_content|utm_source/);
  }
});

test('social metadata respects existing analytics consent, DNT and profile opt-out', async (t) => {
  const keys = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'] as const;
  const originals = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const key of keys) {
      const descriptor = originals.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  let consent: boolean | null = true;
  const navigatorStub = { doNotTrack: '0' };
  const storage = new Map<string, string>();
  const globals = {
    window: { location: new URL(SOCIAL_LINKS[0]), addEventListener() {} },
    document: { referrer: '', visibilityState: 'visible', title: 'Field note' },
    navigator: navigatorStub,
    localStorage: { getItem: () => consent === null ? null : JSON.stringify({ analytics: consent, timestamp: new Date().toISOString() }) },
    sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }
  };
  for (const key of keys) Object.defineProperty(globalThis, key, { value: globals[key], configurable: true });
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  for (const link of SOCIAL_LINKS) {
    for (const scenario of [
      { consent: false, dnt: '0', optedOut: false, sends: 0 },
      { consent: true, dnt: '1', optedOut: false, sends: 0 },
      { consent: true, dnt: '0', optedOut: true, sends: 0 },
      { consent: true, dnt: '0', optedOut: false, sends: 1 },
      { consent: null, dnt: '0', optedOut: false, sends: 1 }
    ]) {
      consent = scenario.consent;
      navigatorStub.doNotTrack = scenario.dnt;
      const metadata = newsletterMetadata(new URL(link));
      assert.ok(metadata);
      const client = new AnalyticsClient({ property: 'io', globalMetadata: metadata, userOptedOut: scenario.optedOut });
      const before = fetchMock.mock.callCount();
      client.pageView({ title: 'Field note' });
      await client.flush();
      assert.equal(fetchMock.mock.callCount() - before, scenario.sends, JSON.stringify(scenario));
      if (scenario.sends) {
        const body = fetchMock.mock.calls.at(-1)!.arguments[1]!.body;
        assert.deepEqual(JSON.parse(String(body)).events[0].metadata, { ...metadata, title: 'Field note' });
      }
    }
  }
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

test('later engagement states count only as delivery evidence', async () => {
  const entry = NEWSLETTER_DELIVERIES[0];
  for (const last_event of ['opened', 'clicked']) {
    const result = await readNewsletterDelivery(entry, 'test', async (url) =>
      Response.json({ id: String(url).split('/').at(-1), subject: entry.subject, last_event })
    );
    assert.equal(result.delivered, 2);
    assert.deepEqual(result.states, { delivered: 2 });
  }
});

test('a prepared edition subject replaces the registry default when reading its actual receipts', async () => {
  const { mergeNewsletterDeliveryEntries } = await import('../src/lib/server/newsletter-analytics');
  const campaign = NEWSLETTER_DELIVERIES[2].campaign;
  const subject = 'A revised subject for the reviewed edition';
  const entry = mergeNewsletterDeliveryEntries([{campaign,subject,resend_email_id:'actual-audience-receipt'}]).find(e=>e.campaign===campaign)!;
  assert.equal(entry.subject,subject);
  const report = await readNewsletterDelivery(entry,'offline',async()=>Response.json({id:'actual-audience-receipt',subject,last_event:'delivered'}));
  assert.equal(report.status,'verified');
  assert.equal(report.delivered,1);
});

test('ledger-sized readback paces requests and recovers a shared provider rate limit', async () => {
  const entry = { campaign: 'bounded-ledger', subject: 'Reviewed subject', ids: Array.from({length:20},(_,i)=>`receipt-${i}`) };
  let elapsed = 0;
  const starts: number[] = [];
  let throttled = false;
  const report = await readNewsletterDelivery(entry,'offline',async (url) => {
    starts.push(elapsed);
    if (!throttled && starts.length === 11) {
      throttled = true;
      return new Response('',{status:429,headers:{'Retry-After':'1'}});
    }
    return Response.json({id:String(url).split('/').at(-1),subject:entry.subject,last_event:'delivered'});
  },async (ms) => { elapsed += ms; });
  assert.equal(report.status,'verified');
  assert.equal(report.delivered,20);
  assert.equal(starts.length,21);
  for (let i=1;i<starts.length;i++) assert.ok(starts[i]-starts[i-1]>=125);
  assert.ok(starts[11]-starts[10]>=1000);
});

test('provider throttling retries are bounded and never reported as zero delivery', async () => {
  const entry = {campaign:'bounded-ledger',subject:'Reviewed subject',ids:['receipt']};
  for (const retryAfter of ['1','60']) {
    let calls=0;
    const waits:number[]=[];
    const report=await readNewsletterDelivery(entry,'offline',async()=>{
      calls++;
      return new Response('',{status:429,headers:{'Retry-After':retryAfter}});
    },async(ms)=>{waits.push(ms);});
    assert.equal(report.status,'unavailable');
    assert.equal(report.delivered,null);
    assert.equal(calls,retryAfter==='60'?1:3);
    assert.ok(waits.every(ms=>ms<=5000));
  }
});

test('rate-limit recovery supports missing and HTTP-date retry instructions', async (t) => {
  const now = Date.parse('2026-11-03T18:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const entry = {campaign:'bounded-ledger',subject:'Reviewed subject',ids:['receipt']};
  for (const retryAfter of [null, new Date(now+2000).toUTCString()]) {
    let calls=0;
    const waits:number[]=[];
    const report=await readNewsletterDelivery(entry,'offline',async (_url, init)=>{
      assert.equal(new Headers(init?.headers).get('User-Agent'),'create-something-newsletter/1.0');
      if (++calls===1) return new Response('',{status:429,headers:retryAfter?{'Retry-After':retryAfter}:{}});
      return Response.json({id:'receipt',subject:entry.subject,last_event:'delivered'});
    },async(ms)=>{waits.push(ms);});
    assert.equal(report.delivered,1);
    assert.deepEqual(waits,[125,retryAfter?2000:1000]);
  }
});
