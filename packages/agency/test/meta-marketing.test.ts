import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  metaConsentResponse, readMetaConsent, prepareMetaLead, drainMetaLead,
  metaPageViewResponse, sendMetaLead, purgeExpiredMetaPayloads, type MetaMarketingEnv
} from '../src/lib/server/meta-marketing.ts';
import { createD1ContactRepository } from '../src/lib/server/contact-intake.ts';
import { contactIntake } from '../src/lib/server/contact-intake.ts';
import { Effect } from 'effect';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const baseEnv = {
  META_MARKETING_ENABLED: 'true', META_DATASET_ID: '123456789012345',
  META_CAPI_ACCESS_TOKEN: 'fixture-secret', META_GRAPH_VERSION: 'v26.0'
};
const origin = 'https://createsomething.agency';
const request = (method = 'GET', body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  new Request(`${origin}/api/marketing/consent`, { method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
async function fixture() {
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("fixture"); } }',
    compatibilityDate: '2025-11-15', d1Databases: ['DB'] });
  const db: D1Database = await mf.getD1Database('DB');
  await db.prepare(readFileSync(new URL('./contact-production-schema.sql', import.meta.url), 'utf8')).run();
  for (const name of ['0058_contact_request_receipts.sql', '0059_contact_request_attribution.sql', '0060_meta_marketing.sql', '0061_meta_marketing_account_binding.sql']) {
    const sql = readFileSync(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
    for (const statement of sql.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await db.prepare(statement).run();
  }
  const env: MetaMarketingEnv = { ...baseEnv, DB: db };
  return { env, db, dispose: () => mf.dispose() };
}
async function grant(env: MetaMarketingEnv, accountSubject?: string) {
  const reply = await metaConsentResponse(request('POST', { marketing: true }), env, false, undefined, accountSubject);
  assert.equal(reply.status, 200);
  return reply.headers.get('set-cookie')!;
}
async function saveLead(env: MetaMarketingEnv, cookie: string, id = 'fixture-contact-request-1', accountSubject?: string) {
  const source = request('POST', undefined, cookie, { 'User-Agent': 'fixture-agent', 'CF-Connecting-IP': '192.0.2.1' });
  const prepared = await prepareMetaLead(source, env, { requestId: id, email: ' Fixture@Example.Invalid ' }, false, undefined, accountSubject);
  await createD1ContactRepository(env.DB!, prepared).create(id, 'fixture-hash', 'owner', {
    name: 'Private Person', email: 'fixture@example.invalid', message: 'private inquiry body'
  });
  return source;
}
test('marketing defaults off, requires its own explicit consent and can be withdrawn', async () => {
  const f = await fixture();
  try {
    assert.equal((await readMetaConsent(request(), f.env)).marketing, false);
    assert.equal((await readMetaConsent(request('GET', undefined, 'cs_consent=analytics-accepted'), f.env)).marketing, false);
    const reply = await metaConsentResponse(request('POST', { marketing: true }), f.env);
    assert.deepEqual(await reply.json(), { marketing: true, available: true, blocked: false });
    const cookie = reply.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/);
    assert.equal((await readMetaConsent(request('GET', undefined, cookie), f.env)).marketing, true);
    const revoke = await metaConsentResponse(request('POST', { marketing: false }, cookie), f.env);
    assert.equal((await revoke.json() as { marketing: boolean }).marketing, false);
    assert.equal((await readMetaConsent(request('GET', undefined, cookie), f.env)).marketing, false);
  } finally { await f.dispose(); }
});

test('signed consent requires the same freshly verified account and never downgrades to anonymous', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env, 'account-one');
    const source = request('GET', undefined, cookie);
    assert.deepEqual(await f.db.prepare('SELECT account_subject FROM meta_marketing_consents').first(), { account_subject: 'account-one' });
    assert.equal((await readMetaConsent(source, f.env)).marketing, false);
    assert.equal((await readMetaConsent(source, f.env, false, undefined, 'account-two')).marketing, false);
    assert.equal((await readMetaConsent(source, f.env, false, undefined, 'account-one')).marketing, true);
    assert.equal(await prepareMetaLead(source, f.env, { requestId: 'wrong-account-request', email: 'fixture@example.invalid' }, false, undefined, 'account-two'), undefined);
    const unavailable = await metaConsentResponse(source, f.env, true);
    assert.equal((await unavailable.json() as { marketing: boolean }).marketing, false);
    assert.equal(unavailable.headers.get('Set-Cookie'), null);
    assert.deepEqual(await f.db.prepare('SELECT account_subject, revoked_at FROM meta_marketing_consents').first(), { account_subject: 'account-one', revoked_at: null });
    assert.equal((await readMetaConsent(source, f.env, false, undefined, 'account-one')).marketing, true);
    const downgrade = await metaConsentResponse(request('POST', { marketing: true }, cookie), f.env);
    assert.deepEqual(await downgrade.json(), { marketing: false, available: true, blocked: true });
    assert.equal((await f.db.prepare('SELECT count(*) n FROM meta_marketing_consents').first<{ n: number }>())!.n, 1);
  } finally { await f.dispose(); }
});

test('fresh account opt-out revokes consent and purges queued match data through every entrypoint', async () => {
  const handlers = [
    (source: Request, env: MetaMarketingEnv) => metaConsentResponse(new Request(source.url, { headers: source.headers }), env, true, undefined, 'account-one'),
    (source: Request, env: MetaMarketingEnv) => metaPageViewResponse(source, env, true, async () => { throw new Error('Must not send'); }, 'account-one'),
    (source: Request, env: MetaMarketingEnv) => prepareMetaLead(source, env, { requestId: 'optout-preparation', email: 'fixture@example.invalid' }, true, undefined, 'account-one'),
    (source: Request, env: MetaMarketingEnv) => drainMetaLead(source, env, true, async () => { throw new Error('Must not send'); }, undefined, 'account-one')
  ];
  for (const [index, handler] of handlers.entries()) {
    const f = await fixture();
    try {
      const cookie = await grant(f.env, 'account-one');
      const source = await saveLead(f.env, cookie, `account-optout-request-${index}`, 'account-one');
      await handler(source, f.env);
      assert.notEqual((await f.db.prepare('SELECT revoked_at FROM meta_marketing_consents').first<{ revoked_at: number | null }>())!.revoked_at, null);
      assert.deepEqual(await f.db.prepare('SELECT state, payload_json FROM meta_lead_deliveries').first(), { state: 'cancelled', payload_json: null });
    } finally { await f.dispose(); }
  }
});

test('an explicit signed choice binds an existing anonymous consent without implicit GET binding', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env);
    const source = request('GET', undefined, cookie);
    assert.equal((await readMetaConsent(source, f.env, false, undefined, 'account-one')).marketing, true);
    assert.deepEqual(await f.db.prepare('SELECT account_subject FROM meta_marketing_consents').first(), { account_subject: null });
    assert.equal(await prepareMetaLead(source, f.env, { requestId: 'signed-anonymous-request', email: 'fixture@example.invalid' }, false, undefined, 'account-one'), undefined);
    await metaConsentResponse(request('POST', { marketing: true }, cookie), f.env, false, undefined, 'account-one');
    assert.deepEqual(await f.db.prepare('SELECT account_subject FROM meta_marketing_consents').first(), { account_subject: 'account-one' });
    assert.equal((await readMetaConsent(source, f.env)).marketing, false);
  } finally { await f.dispose(); }
});

test('an invalid or unavailable account session cannot grant or use anonymous marketing consent', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env);
    const invalidSession = `${cookie}; cs_access_token=invalid-fixture`;
    const source = request('GET', undefined, invalidSession);
    assert.deepEqual(await readMetaConsent(source, f.env), { marketing: false, available: true, blocked: true });
    const response = await metaConsentResponse(request('POST', { marketing: true }, invalidSession), f.env);
    assert.deepEqual(await response.json(), { marketing: false, available: true, blocked: true });
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(await prepareMetaLead(source, f.env, { requestId: 'invalid-session-request', email: 'fixture@example.invalid' }), undefined);
    let sends = 0;
    const page = await metaPageViewResponse(request('POST', { url: `${origin}/contact`, eventId: crypto.randomUUID() }, invalidSession), f.env, false,
      async () => { sends++; throw new Error('Must not send'); });
    assert.deepEqual(await page.json(), { forwarded: false }); assert.equal(sends, 0);
    assert.deepEqual(await f.db.prepare('SELECT account_subject, revoked_at FROM meta_marketing_consents').first(), { account_subject: null, revoked_at: null });
    const reject = await metaConsentResponse(request('POST', { marketing: false }, invalidSession), f.env);
    assert.equal((await reject.json() as { marketing: boolean }).marketing, false);
    assert.notEqual((await f.db.prepare('SELECT revoked_at FROM meta_marketing_consents').first<{ revoked_at: number | null }>())!.revoked_at, null);
  } finally { await f.dispose(); }
});

test('browser privacy signals durably revoke a queued consent during a plain consent read', async () => {
  for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }] as Record<string, string>[]) {
    const f = await fixture();
    try {
      const cookie = await grant(f.env); await saveLead(f.env, cookie);
      assert.equal((await readMetaConsent(request('GET', undefined, cookie, headers), f.env)).marketing, false);
      assert.notEqual((await f.db.prepare('SELECT revoked_at FROM meta_marketing_consents').first<{ revoked_at: number | null }>())!.revoked_at, null);
      assert.deepEqual(await f.db.prepare('SELECT state, payload_json FROM meta_lead_deliveries').first(), { state: 'cancelled', payload_json: null });
    } finally { await f.dispose(); }
  }
});

test('DNT, GPC, opt-out, missing configuration, and expired consent prevent delivery', async () => {
  const f = await fixture();
  try {
    for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }] as Record<string, string>[]) {
      const reply = await metaConsentResponse(request('POST', { marketing: true }, undefined, headers), f.env);
      assert.deepEqual(await reply.json(), { marketing: false, available: true, blocked: true });
    }
    assert.equal((await readMetaConsent(request(), f.env, true)).blocked, true);
    assert.equal((await readMetaConsent(request(), { ...f.env, META_CAPI_ACCESS_TOKEN: undefined })).available, false);
    const cookie = await grant(f.env);
    await f.db.prepare('UPDATE meta_marketing_consents SET expires_at = 0').run();
    assert.equal((await readMetaConsent(request('GET', undefined, cookie), f.env)).marketing, false);
    assert.equal(await drainMetaLead(request('GET', undefined, cookie), f.env, false, async () => { throw new Error('Must not send'); }), undefined);
    const invalid = await metaConsentResponse(request('POST', { marketing: true }, cookie, { Origin: 'https://evil.invalid' }), f.env);
    assert.equal(invalid.status, 403);
  } finally { await f.dispose(); }
});

test('new saved inquiry atomically queues one minimal Lead and accepts a provider receipt', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env);
    const source = await saveLead(f.env, cookie);
    const queued = (await f.db.prepare('SELECT * FROM meta_lead_deliveries').first<{ payload_json: string; event_id: string }>())!;
    assert.doesNotMatch(queued.payload_json, /fixture@example|Private Person|private inquiry|fixture-secret/);
    const payload = JSON.parse(queued.payload_json);
    assert.match(payload.user_data.em[0], /^[a-f0-9]{64}$/);
    assert.equal(payload.event_source_url, `${origin}/contact`);
    let calls = 0;
    const send: typeof fetch = async (url, init) => {
      calls++; assert.equal(String(url), 'https://graph.facebook.com/v26.0/123456789012345/events');
      assert.equal(new Headers(init!.headers).get('Authorization'), 'Bearer fixture-secret');
      const body = JSON.parse(init!.body as string);
      assert.equal(body.data[0].event_id, queued.event_id);
      assert.deepEqual(Object.keys(body.data[0].user_data).sort(), ['client_ip_address', 'client_user_agent', 'em']);
      return new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'fixture-provider-receipt' }));
    };
    assert.deepEqual(await drainMetaLead(source, f.env, false, send), { state: 'accepted', receipt: 'fixture-provider-receipt' });
    assert.equal(await drainMetaLead(source, f.env, false, send), undefined);
    assert.equal(calls, 1);
    const accepted = await f.db.prepare('SELECT state, payload_json, provider_receipt FROM meta_lead_deliveries').first();
    assert.deepEqual(accepted, { state: 'accepted', payload_json: null, provider_receipt: 'fixture-provider-receipt' });
    await assert.rejects(saveLead(f.env, cookie));
    assert.equal((await f.db.prepare('SELECT count(*) n FROM meta_lead_deliveries').first<{ n: number }>())!.n, 1);
  } finally { await f.dispose(); }
});

test('withdrawal purges pending match data and prevents subsequent dispatch', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); const source = await saveLead(f.env, cookie);
    await metaConsentResponse(request('POST', { marketing: false }, cookie), f.env);
    assert.deepEqual(await f.db.prepare('SELECT state, payload_json FROM meta_lead_deliveries').first(), { state: 'cancelled', payload_json: null });
    let calls = 0;
    await drainMetaLead(source, f.env, false, async () => { calls++; return new Response(); });
    assert.equal(calls, 0);
  } finally { await f.dispose(); }
});

test('a duplicate inquiry after new consent cannot retroactively enqueue an older inquiry', async () => {
  const f = await fixture();
  try {
    const id = 'preconsent-inquiry-request';
    const input = { name: 'Fixture', email: 'fixture@example.invalid', message: 'private' };
    let sends = 0;
    const mailer = { async send() { sends++; return { state: 'accepted' as const, providerId: 'fixture-mail-receipt' }; } };
    await Effect.runPromise(contactIntake(input, id, createD1ContactRepository(f.db), mailer));
    const cookie = await grant(f.env);
    const prepared = await prepareMetaLead(request('GET', undefined, cookie), f.env, { requestId: id, email: input.email });
    await Effect.runPromise(contactIntake(input, id, createD1ContactRepository(f.db, prepared), mailer));
    assert.equal(sends, 2);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM meta_lead_deliveries').first<{ n: number }>())!.n, 0);
  } finally { await f.dispose(); }
});

test('withdrawal during an in-flight accepted call retains its receipt without retaining match data', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); const source = await saveLead(f.env, cookie);
    const outcome = await drainMetaLead(source, f.env, false, async () => {
      await metaConsentResponse(request('POST', { marketing: false }, cookie), f.env);
      return new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'in-flight-receipt' }));
    });
    assert.equal(outcome?.state, 'accepted');
    assert.deepEqual(await f.db.prepare('SELECT state, payload_json, provider_receipt FROM meta_lead_deliveries').first(),
      { state: 'accepted', payload_json: null, provider_receipt: 'in-flight-receipt' });
    assert.equal((await readMetaConsent(source, f.env)).marketing, false);
  } finally { await f.dispose(); }
});

test('consent revoked between preparation and atomic save cannot queue a conversion', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env);
    const prepared = await prepareMetaLead(request('GET', undefined, cookie), f.env, { requestId: 'revoked-race-request', email: 'fixture@example.invalid' });
    await metaConsentResponse(request('POST', { marketing: false }, cookie), f.env);
    await createD1ContactRepository(f.db, prepared).create('revoked-race-request', 'hash', 'owner', { name: 'Fixture', email: 'fixture@example.invalid', message: 'fixture' });
    assert.equal((await f.db.prepare('SELECT count(*) n FROM meta_lead_deliveries').first<{ n: number }>())!.n, 0);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM contact_request_receipts').first<{ n: number }>())!.n, 1);
  } finally { await f.dispose(); }
});

test('direct Meta measurement is available without Zaraz relay configuration', async () => {
  const f = await fixture();
  try {
    assert.equal((await readMetaConsent(request(), f.env)).available, true);
    const choice = await metaConsentResponse(request('POST', { marketing: true }), f.env);
    assert.deepEqual(await choice.json(), { marketing: true, available: true, blocked: false });
  } finally { await f.dispose(); }
});

test('consented PageView goes directly to Meta with bounded matching data and an acknowledged receipt', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); let calls = 0;
    const eventId = crypto.randomUUID(); const before = Math.floor(Date.now() / 1000);
    const send: typeof fetch = async (url, init) => {
      calls++;
      assert.equal(String(url), 'https://graph.facebook.com/v26.0/123456789012345/events');
      assert.equal(new Headers(init!.headers).get('Authorization'), 'Bearer fixture-secret');
      assert.equal(new Headers(init!.headers).get('Cookie'), null);
      assert.equal(new Headers(init!.headers).get('x-cs-meta-relay-key'), null);
      const body = JSON.parse(init!.body as string);
      assert.deepEqual(Object.keys(body), ['data']);
      assert.equal(body.data.length, 1);
      const page = body.data[0];
      assert.deepEqual(Object.keys(page).sort(), ['action_source', 'event_id', 'event_name', 'event_source_url', 'event_time', 'user_data']);
      assert.equal(page.event_name, 'PageView'); assert.equal(page.event_id, eventId);
      assert.equal(page.event_source_url, `${origin}/contact`); assert.equal(page.action_source, 'website');
      assert.ok(page.event_time >= before && page.event_time <= Math.floor(Date.now() / 1000));
      assert.deepEqual(page.user_data, { client_ip_address: '192.0.2.1', client_user_agent: 'a'.repeat(512) });
      assert.doesNotMatch(init!.body as string, /private-session|private@example|utm_|fbclid|_fbp|_fbc/);
      return Response.json({ events_received: 1, fbtrace_id: 'fixture-page-receipt' });
    };
    const invoke = (url: string, extra = {}) => metaPageViewResponse(request('POST', { url, eventId, ...extra }, `${cookie}; private=private-session`,
      { 'User-Agent': 'a'.repeat(700), 'CF-Connecting-IP': '192.0.2.1' }), f.env, false, send);
    assert.equal((await invoke(`${origin}/map/share/private-token`)).status, 400);
    assert.equal((await invoke(`${origin}/contact?email=private@example.invalid`)).status, 400);
    assert.equal((await invoke('https://evil.invalid/contact')).status, 400);
    assert.equal((await invoke(`${origin}/contact`, { email: 'private@example.invalid' })).status, 400);
    const accepted = await invoke(`${origin}/contact`);
    assert.equal(accepted.status, 200); assert.deepEqual(await accepted.json(), { forwarded: true });
    assert.equal(calls, 1);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM meta_lead_deliveries').first<{ n: number }>())!.n, 0);
    assert.deepEqual(await (await metaPageViewResponse(request('POST', { url: `${origin}/contact`, eventId }), f.env, false, send)).json(), { forwarded: false });
  } finally { await f.dispose(); }
});

test('PageView does not send without both browser matching fields', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); let calls = 0;
    for (const headers of [{}, { 'User-Agent': 'fixture-agent' }, { 'CF-Connecting-IP': '192.0.2.1' }] as Record<string, string>[]) {
      const response = await metaPageViewResponse(request('POST', { url: `${origin}/services`, eventId: crypto.randomUUID() }, cookie, headers), f.env, false,
        async () => { calls++; return Response.json({ events_received: 1, fbtrace_id: 'must-not-send' }); });
      assert.equal(response.status, 200); assert.deepEqual(await response.json(), { forwarded: false });
    }
    assert.equal(calls, 0);
  } finally { await f.dispose(); }
});

test('withdrawal while reading a PageView body prevents the subsequent provider call', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); let calls = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await metaConsentResponse(request('POST', { marketing: false }, cookie), f.env);
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ url: `${origin}/services`, eventId: crypto.randomUUID() })));
        controller.close();
      }
    }, { highWaterMark: 0 });
    const source = new Request(`${origin}/api/marketing/page-view`, {
      method: 'POST', headers: { Origin: origin, Cookie: cookie, 'User-Agent': 'fixture-agent', 'CF-Connecting-IP': '192.0.2.1' },
      body: stream, duplex: 'half'
    } as RequestInit & { duplex: 'half' });
    const reply = await metaPageViewResponse(source, f.env, false,
      async () => { calls++; return Response.json({ events_received: 1, fbtrace_id: 'must-not-send' }); });
    assert.deepEqual(await reply.json(), { forwarded: false }); assert.equal(calls, 0);
    assert.notEqual((await f.db.prepare('SELECT revoked_at FROM meta_marketing_consents').first<{ revoked_at: number | null }>())!.revoked_at, null);
  } finally { await f.dispose(); }
});

test('PageView requires a valid Meta acknowledgement and never queues or retries uncertain delivery', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env);
    for (const [status, body] of [
      [200, {}], [200, { events_received: 0, fbtrace_id: 'trace' }],
      [200, { events_received: 2, fbtrace_id: 'trace' }], [200, { events_received: 1, fbtrace_id: '' }], [200, { events_received: 1, fbtrace_id: ' ' }],
      [200, { events_received: 1 }], [400, {}], [429, {}], [500, {}]
    ] as const) {
      let calls = 0;
      const reply = await metaPageViewResponse(request('POST', { url: `${origin}/services`, eventId: crypto.randomUUID() }, cookie,
        { 'User-Agent': 'fixture-agent', 'CF-Connecting-IP': '192.0.2.1' }), f.env, false, async () => {
          calls++; return Response.json(body, { status });
        });
      assert.equal(reply.status, 502); assert.deepEqual(await reply.json(), { forwarded: false });
      assert.equal(calls, 1);
    }
    let calls = 0;
    const reply = await metaPageViewResponse(request('POST', { url: `${origin}/services`, eventId: crypto.randomUUID() }, cookie,
      { 'User-Agent': 'fixture-agent', 'CF-Connecting-IP': '192.0.2.1' }), f.env, false, async () => {
        calls++; throw new Error('uncertain transport');
      });
    assert.equal(reply.status, 502); assert.deepEqual(await reply.json(), { forwarded: false }); assert.equal(calls, 1);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM meta_lead_deliveries').first<{ n: number }>())!.n, 0);
  } finally { await f.dispose(); }
});

test('provider errors are classified without retrying uncertain writes', async () => {
  const payload = { event_name: 'Lead' as const, event_time: 123, event_id: 'stable-id', action_source: 'website' as const,
    event_source_url: `${origin}/contact`, user_data: { em: ['a'.repeat(64)] } };
  for (const [status, body, state] of [[200, {}, 'unknown'], [400, {}, 'permanent_failure'], [429, {}, 'transient_failure'], [500, {}, 'unknown']] as const) {
    let calls = 0;
    const outcome = await sendMetaLead(payload, { datasetId: '123456789012345', token: 'fixture-secret', version: 'v26.0' }, async () => {
      calls++; return new Response(JSON.stringify(body), { status });
    });
    assert.equal(outcome.state, state); assert.equal(calls, 1);
  }
  assert.equal((await sendMetaLead(payload, { datasetId: '123456789012345', token: 'fixture-secret', version: 'v26.0' }, async () => { throw new Error('transport'); })).state, 'unknown');
});

test('acknowledged throttles retry at most three times with the same event ID', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); const source = await saveLead(f.env, cookie); const ids: string[] = [];
    const send: typeof fetch = async (_url, init) => { ids.push(JSON.parse(init!.body as string).data[0].event_id); return new Response('{}', { status: 429 }); };
    const now = Date.now();
    assert.equal((await drainMetaLead(source, f.env, false, send, now))?.state, 'transient_failure');
    assert.equal(await drainMetaLead(source, f.env, false, send, now + 1000), undefined);
    await drainMetaLead(source, f.env, false, send, now + 61000);
    await drainMetaLead(source, f.env, false, send, now + 182000);
    assert.equal(await drainMetaLead(source, f.env, false, send, now + 400000), undefined);
    assert.equal(ids.length, 3); assert.equal(new Set(ids).size, 1);
    assert.deepEqual(await f.db.prepare('SELECT attempts, payload_json FROM meta_lead_deliveries').first(), { attempts: 3, payload_json: null });
  } finally { await f.dispose(); }
});

test('an unknown provider outcome is never automatically retried', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); const source = await saveLead(f.env, cookie); let sends = 0;
    const send: typeof fetch = async () => { sends++; return new Response('{}', { status: 500 }); };
    assert.equal((await drainMetaLead(source, f.env, false, send))?.state, 'unknown');
    assert.equal(await drainMetaLead(source, f.env, false, send, Date.now() + 60000), undefined);
    assert.equal(sends, 1);
    assert.deepEqual(await f.db.prepare('SELECT state, payload_json FROM meta_lead_deliveries').first(), { state: 'unknown', payload_json: null });
  } finally { await f.dispose(); }
});

test('maintenance purges expired pending match data without requiring its cookie', async () => {
  const f = await fixture();
  try {
    const cookie = await grant(f.env); await saveLead(f.env, cookie);
    assert.equal(await purgeExpiredMetaPayloads(f.db, Date.now() + 86401000), 1);
    assert.deepEqual(await f.db.prepare('SELECT state, payload_json FROM meta_lead_deliveries').first(), { state: 'cancelled', payload_json: null });
  } finally { await f.dispose(); }
});
