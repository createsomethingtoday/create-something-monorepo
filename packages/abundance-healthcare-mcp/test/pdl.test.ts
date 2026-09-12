import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichPdlProfile, PDL_FIELDS, type PdlStore, type PdlTransaction } from '../src/pdl.js';
class Store implements PdlStore {
  data = new Map<string, unknown>();
  queue: Promise<unknown> = Promise.resolve();
  async get<T>(key: string) { return structuredClone(this.data.get(key)) as T | undefined; }
  async put<T>(key: string, value: T) { this.data.set(key, structuredClone(value)); }
  transaction<T>(fn: (store: PdlTransaction) => Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn(this)); this.queue = next.catch(() => {}); return next;
  }
}
const input = { profile_url: 'https://www.linkedin.com/in/test-professional', confirm_paid_enrichment: true as const };
const result = { status: 200, likelihood: 10, data: { id: 'test-id', full_name: 'Test Professional', linkedin_url: 'linkedin.com/in/test-professional', job_title: 'registered nurse', job_company_name: 'Test Hospital', mobile_phone: 'PRIVATE_PHONE', personal_emails: ['PRIVATE_EMAIL'], street_address: 'PRIVATE_HOME', unexpected: 'PRIVATE_OTHER' } };
test('PDL requests only professional fields and excludes unsolicited private fields from results and storage', async () => {
  const store = new Store();
  const out = await enrichPdlProfile(input, { apiKey: 'secret', store, fetchFn: async (url, init) => {
    assert.equal(String(url), 'https://api.peopledatalabs.com/v5/person/enrich');
    assert.equal(init?.method, 'POST'); assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('X-Api-Key'), 'secret');
    assert.deepEqual(JSON.parse(String(init?.body)), { profile: input.profile_url, min_likelihood: 8, data_include: PDL_FIELDS.join(',') });
    return Response.json(result);
  } });
  assert.equal(out.status, 'matched');
  assert.equal(out.profile?.job_company_name, 'Test Hospital');
  assert.equal(JSON.stringify(out).includes('PRIVATE_'), false);
  assert.equal(JSON.stringify([...store.data]).includes('PRIVATE_'), false);
});
test('PDL rejects unsupported inputs and missing confirmation before spending', async () => {
  let calls = 0; const store = new Store();
  for (const bad of [{ ...input, confirm_paid_enrichment: false }, { ...input, phone: 'private' }, { ...input, profile_url: 'https://evil.test/in/person' }, { ...input, profile_url: input.profile_url + '?phone=private' }]) {
    await assert.rejects(enrichPdlProfile(bad as typeof input, { apiKey: 'secret', store, fetchFn: async () => { calls++; return Response.json(result); } }));
  }
  assert.equal(calls, 0); assert.equal(store.data.size, 0);
});
test('PDL rejects wrong identities and insufficient likelihood without returning profile data', async () => {
  for (const response of [{ ...result, likelihood: 7 }, { ...result, data: { ...result.data, linkedin_url: 'linkedin.com/in/wrong-person' } }]) {
    const out = await enrichPdlProfile(input, { apiKey: 'secret', store: new Store(), fetchFn: async () => Response.json(response) });
    assert.equal(out.status, 'ambiguous'); assert.equal(out.profile, undefined);
  }
});
test('PDL shares rolling budget across concurrent sessions and caches repeats for seven days', async () => {
  const store = new Store(); let calls = 0; const now = Date.now();
  const options = { apiKey: 'secret', store, now, fetchFn: async () => { calls++; return new Response(null, { status: 404 }); } };
  await Promise.all(Array.from({ length: 8 }, () => enrichPdlProfile(input, options)));
  assert.equal(calls, 1);
  const pending = Array.from({ length: 6 }, (_, i) => enrichPdlProfile({ ...input, profile_url: input.profile_url + i }, options));
  const settled = await Promise.allSettled(pending);
  assert.equal(settled.filter(r => r.status === 'rejected').length, 2); assert.equal(calls, 5);
  const cached = await enrichPdlProfile(input, { ...options, now: now + 2 * 86400000 });
  assert.equal(cached.cached, true); assert.equal(calls, 5);
  await enrichPdlProfile(input, { ...options, now: now + 8 * 86400000 }); assert.equal(calls, 6);
});
test('PDL preserves uncertain failures and never retries or returns upstream error bodies', async () => {
  for (const failure of [async () => new Response('secret PRIVATE_PHONE', { status: 403 }), async () => { throw new Error('secret PRIVATE_PHONE'); }]) {
    let calls = 0; const store = new Store();
    const options = { apiKey: 'secret', store, fetchFn: async () => { calls++; return failure(); } };
    const out = await enrichPdlProfile(input, options);
    assert.equal(out.status, 'unavailable'); assert.equal(JSON.stringify(out).includes('secret'), false);
    await enrichPdlProfile(input, options); assert.equal(calls, 1);
  }
});
