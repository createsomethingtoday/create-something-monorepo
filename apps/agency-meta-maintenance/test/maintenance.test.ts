import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import worker, { runMetaMaintenance } from '../src/index.ts';
import { drainMetaLead, type MetaMarketingEnv } from '../../../packages/agency/src/lib/server/meta-marketing.ts';

const agencyRequire = createRequire(new URL('../../../packages/agency/package.json', import.meta.url));
const { Miniflare } = createRequire(agencyRequire.resolve('wrangler/package.json'))('miniflare');
const now = Date.now();
const sec = Math.floor(now / 1000);
async function fixture() {
  // Agency's pinned local workerd supports dates through June 24, 2026. These are D1
  // fixture tests; deployment keeps the new Worker's current compatibility date.
  const mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("fixture"); } }',
    compatibilityDate: '2025-11-15', d1Databases: ['DB'] });
  const db: D1Database = await mf.getD1Database('DB');
  await db.prepare(readFileSync(new URL('../../../packages/agency/test/contact-production-schema.sql', import.meta.url), 'utf8')).run();
  for (const name of ['0058_contact_request_receipts.sql', '0060_meta_marketing.sql', '0061_meta_marketing_account_binding.sql']) {
    const sql = readFileSync(new URL(`../../../packages/agency/migrations/${name}`, import.meta.url), 'utf8');
    for (const statement of sql.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await db.prepare(statement).run();
  }
  const env: MetaMarketingEnv & { DB: D1Database } = { DB: db, META_MARKETING_ENABLED: 'true', META_DATASET_ID: '123456789012345',
    META_CAPI_ACCESS_TOKEN: 'fixture-secret', META_GRAPH_VERSION: 'v26.0', META_ZARAZ_RELAY_KEY: 'fixture-relay-key',
    META_ZARAZ_ENDPOINT: 'https://createsomething.agency/fixture-relay' };
  async function lead(index: number, options: { age?: number; revoked?: boolean; expires?: number; state?: string; attempts?: number; lease?: number; accountSubject?: string } = {}) {
    const id = crypto.randomUUID(); const eventId = `fixture-event-${index}`; const created = sec - (options.age ?? 0);
    const payload = { event_name: 'Lead', event_time: created, event_id: eventId, action_source: 'website',
      event_source_url: 'https://createsomething.agency/contact', user_data: { em: ['a'.repeat(64)] } };
    const results = await db.batch([
      db.prepare("INSERT INTO contact_submissions(name,email,message,submitted_at) VALUES(?,?,?,datetime('now'))").bind('Fixture', 'fixture@example.invalid', 'fixture'),
      db.prepare('INSERT INTO contact_request_receipts(request_id,payload_sha256,submission_id,owner_token) VALUES(?,?,last_insert_rowid(),?)').bind(`fixture-request-${index}`, 'hash', 'owner'),
      db.prepare("INSERT INTO meta_marketing_consents(consent_id,granted_at,expires_at,revoked_at,policy_version,account_subject) VALUES(?,?,?,?, 'agency-meta-v1',?)")
        .bind(id, created, options.expires ?? sec + 180 * 86400, options.revoked ? sec - 60 : null, options.accountSubject ?? null),
      db.prepare(`INSERT INTO meta_lead_deliveries(event_id,request_id,consent_id,dataset_id,state,payload_json,attempts,next_attempt_at,lease_until,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(eventId, `fixture-request-${index}`, id, env.META_DATASET_ID!, options.state ?? 'pending', JSON.stringify(payload), options.attempts ?? 0, sec, options.lease ?? null, created, created)
    ]);
    assert.ok(results.every(result => result.success));
    return { id, eventId };
  }
  return { db, env, lead, dispose: () => mf.dispose() };
}

test('scheduled retries remain bounded, use stable IDs, and exclude revoked consent', async () => {
  const f = await fixture();
  try {
    await f.lead(1, { state: 'transient_failure', attempts: 1 });
    await f.lead(2, { revoked: true });
    const ids: string[] = [];
    const send: typeof fetch = async (_url, init) => { ids.push(JSON.parse(init!.body as string).data[0].event_id); return new Response('{}', { status: 429 }); };
    assert.equal((await runMetaMaintenance(f.env, send, now)).attempted, 1);
    assert.equal((await runMetaMaintenance(f.env, send, now + 121000)).attempted, 1);
    assert.equal((await runMetaMaintenance(f.env, send, now + 400000)).attempted, 0);
    assert.deepEqual(ids, ['fixture-event-1', 'fixture-event-1']);
    assert.deepEqual(await f.db.prepare("SELECT attempts,payload_json FROM meta_lead_deliveries WHERE event_id='fixture-event-1'").first(), { attempts: 3, payload_json: null });
    assert.deepEqual(await f.db.prepare("SELECT state,payload_json FROM meta_lead_deliveries WHERE event_id='fixture-event-2'").first(), { state: 'cancelled', payload_json: null });
  } finally { await f.dispose(); }
});

test('disabled delivery still purges expired data and preserves source inquiry receipts', async () => {
  const f = await fixture();
  try {
    await f.lead(1, { age: 86401 });
    const old = await f.lead(2, { age: 92 * 86400, expires: sec - 91 * 86400 });
    await f.lead(3, { state: 'sending', attempts: 1, lease: sec - 1 });
    let calls = 0;
    const result = await runMetaMaintenance({ ...f.env, META_MARKETING_ENABLED: 'false' }, async () => { calls++; throw new Error('Must not send'); }, now);
    assert.equal(calls, 0); assert.equal(result.attempted, 0);
    assert.equal(result.settled, 1); assert.equal(result.receiptsDeleted, 1); assert.equal(result.consentsDeleted, 1);
    assert.deepEqual(await f.db.prepare("SELECT state,payload_json FROM meta_lead_deliveries WHERE event_id='fixture-event-1'").first(), { state: 'cancelled', payload_json: null });
    assert.deepEqual(await f.db.prepare("SELECT state,payload_json FROM meta_lead_deliveries WHERE event_id='fixture-event-3'").first(), { state: 'unknown', payload_json: null });
    assert.equal(await f.db.prepare('SELECT consent_id FROM meta_marketing_consents WHERE consent_id=?').bind(old.id).first(), null);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM contact_request_receipts').first<{ n: number }>())!.n, 3);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM contact_submissions').first<{ n: number }>())!.n, 3);
  } finally { await f.dispose(); }
});

test('one scheduled run processes at most ten distinct consent IDs', async () => {
  const f = await fixture();
  try {
    for (let index = 0; index < 12; index++) await f.lead(index);
    let calls = 0;
    const result = await runMetaMaintenance(f.env, async () => { calls++; return new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'fixture-receipt' })); }, now);
    assert.equal(result.attempted, 10); assert.equal(result.accepted, 10); assert.equal(calls, 10);
    assert.equal((await f.db.prepare("SELECT count(*) n FROM meta_lead_deliveries WHERE state='pending'").first<{ n: number }>())!.n, 2);
    assert.equal((await f.db.prepare('SELECT count(*) n FROM contact_request_receipts').first<{ n: number }>())!.n, 12);
  } finally { await f.dispose(); }
});

test('expired in-flight sends become unknown and are never taken over', async () => {
  const f = await fixture();
  try {
    await f.lead(1, { state: 'sending', attempts: 1, lease: sec - 1 });
    let calls = 0;
    const result = await runMetaMaintenance(f.env, async () => { calls++; return new Response(); }, now);
    assert.equal(result.settled, 1); assert.equal(result.attempted, 0); assert.equal(calls, 0);
    assert.deepEqual(await f.db.prepare('SELECT state, attempts, payload_json FROM meta_lead_deliveries').first(), { state: 'unknown', attempts: 1, payload_json: null });
  } finally { await f.dispose(); }
});

test('Worker exposes no public business API', async () => {
  const response = worker.fetch();
  assert.equal(response.status, 404);
  assert.equal(await response.text(), 'Not found');
});

test('account-bound queued events require fresh interactive identity and never scheduled dispatch', async () => {
  const f = await fixture();
  try {
    const bound = await f.lead(1, { accountSubject: 'account-one' });
    await f.lead(2);
    const ids: string[] = [];
    const send: typeof fetch = async (_url, init) => {
      ids.push(JSON.parse(init!.body as string).data[0].event_id);
      return new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'fixture-accepted' }));
    };
    assert.equal((await runMetaMaintenance(f.env, send, now)).attempted, 1);
    assert.deepEqual(ids, ['fixture-event-2']);
    const source = new Request('https://createsomething.agency/api/marketing/consent', { headers: { Cookie: `cs_meta_consent=${bound.id}` } });
    assert.equal(await drainMetaLead(source, f.env, false, send, now), undefined);
    assert.equal(await drainMetaLead(source, f.env, false, send, now, 'account-two'), undefined);
    assert.equal((await drainMetaLead(source, f.env, false, send, now, 'account-one'))?.state, 'accepted');
    assert.deepEqual(ids, ['fixture-event-2', 'fixture-event-1']);
  } finally { await f.dispose(); }
});
