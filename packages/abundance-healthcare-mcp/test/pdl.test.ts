import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichPdlProfile, PDL_PERSONAL_CONTACT_FIELDS, PDL_PROFESSIONAL_FIELDS, type PdlStore, type PdlTransaction } from '../src/pdl.js';
class Store implements PdlStore {
  data = new Map<string, unknown>();
  queue: Promise<unknown> = Promise.resolve();
  async get<T>(key: string) { return structuredClone(this.data.get(key)) as T | undefined; }
  async put<T>(key: string, value: T) { this.data.set(key, structuredClone(value)); }
  transaction<T>(fn: (store: PdlTransaction) => Promise<T>): Promise<T> {
    const next = this.queue.then(() => fn(this)); this.queue = next.catch(() => {}); return next;
  }
}
const profileInput = { profile_url: 'https://www.linkedin.com/in/test-professional', confirm_paid_enrichment: true as const };
const nameInput = { name: 'Jordan Test', locality: 'Albany', region: 'New York', subject_npi: '1234567893', confirm_paid_enrichment: true as const };
const person = {
  id: 'test-id', full_name: 'jordan test', first_name: 'jordan', last_name: 'test', linkedin_url: 'linkedin.com/in/test-professional',
  job_title: 'family nurse practitioner', job_company_name: 'Test Hospital', job_company_website: 'testhospital.example', work_email: 'jordan@testhospital.example',
  mobile_phone: '+15185550100', phone_numbers: ['+15185550100', '+15185550199', 'not-a-phone'], personal_emails: ['jordan.test@example.com', 'bad-email'],
  recommended_personal_email: 'Jordan.Test@example.com', location_locality: 'troy', location_region: 'new york', location_country: 'united states',
  location_street_address: 'STREET_PRIVATE', location_postal_code: 'ZIP_PRIVATE', street_addresses: ['STREET_PRIVATE'], birth_date: 'DOB_PRIVATE', dataset_version: '31.2',
};
const okResponse = (matched: string[], likelihood = 9, data: Record<string, unknown> = person) => Response.json({ status: 200, likelihood, matched, data });

test('PDL profile lookup requests professional and personal contact fields and returns both with provenance', async () => {
  const store = new Store();
  const out = await enrichPdlProfile(profileInput, { apiKey: 'secret', store, fetchFn: async (url, init) => {
    assert.equal(String(url), 'https://api.peopledatalabs.com/v5/person/enrich');
    assert.equal(init?.method, 'POST'); assert.equal(init?.redirect, 'manual');
    assert.equal(new Headers(init?.headers).get('X-Api-Key'), 'secret');
    assert.deepEqual(JSON.parse(String(init?.body)), { profile: profileInput.profile_url, min_likelihood: 8, include_if_matched: true, data_include: [...PDL_PROFESSIONAL_FIELDS, ...PDL_PERSONAL_CONTACT_FIELDS].join(',') });
    return okResponse(['profile']);
  } });
  assert.equal(out.status, 'matched');
  assert.equal(out.scope, 'professional_and_personal_contact');
  assert.equal(out.professional?.job_company_name, 'Test Hospital');
  assert.equal(out.professional?.work_email, 'jordan@testhospital.example');
  assert.equal(out.personal_contact_access, 'returned');
  assert.equal(out.personal_contact?.mobile_phone, '+15185550100');
  assert.deepEqual(out.personal_contact?.phone_numbers, ['+15185550100', '+15185550199']);
  assert.equal(out.personal_contact?.recommended_personal_email, 'jordan.test@example.com');
  assert.deepEqual(out.personal_contact?.personal_emails, ['jordan.test@example.com']);
  assert.equal(out.personal_contact?.home_locality, 'troy');
  assert.equal(out.provenance.verification, 'unverified');
  assert.equal(out.provenance.consent_basis, 'not_recorded');
  assert.equal(out.provenance.vendor_dataset_version, '31.2');
  // Residential street/postal fields and unrequested attributes never reach output or storage.
  for (const blob of [JSON.stringify(out), JSON.stringify([...store.data])]) assert.equal(/_PRIVATE/.test(blob), false);
});

test('PDL name lookup sends location context, requires the vendor to match on name, and records the subject NPI', async () => {
  let body: Record<string, unknown> = {};
  const out = await enrichPdlProfile({ ...nameInput, require_contact: true }, { apiKey: 'secret', store: new Store(), fetchFn: async (_url, init) => { body = JSON.parse(String(init?.body)); return okResponse(['name', 'locality']); } });
  assert.equal(body.name, 'Jordan Test'); assert.equal(body.locality, 'Albany'); assert.equal(body.region, 'New York');
  assert.equal(body.min_likelihood, 6); assert.equal(body.required, 'mobile_phone OR phone_numbers OR personal_emails');
  assert.equal('subject_npi' in body, false);
  assert.equal(out.status, 'matched'); assert.equal(out.subject_npi, '1234567893'); assert.deepEqual(out.matched_on, ['name', 'locality']);
  const notOnName = await enrichPdlProfile(nameInput, { apiKey: 'secret', store: new Store(), fetchFn: async () => okResponse(['locality']) });
  assert.equal(notOnName.status, 'ambiguous'); assert.equal(notOnName.personal_contact, undefined);
  const wrongPerson = await enrichPdlProfile(nameInput, { apiKey: 'secret', store: new Store(), fetchFn: async () => okResponse(['name'], 9, { ...person, full_name: 'someone else' }) });
  assert.equal(wrongPerson.status, 'ambiguous');
});

test('PDL reports plan masking when contact fields come back as booleans and none_on_record when empty', async () => {
  const masked = await enrichPdlProfile(profileInput, { apiKey: 'secret', store: new Store(), fetchFn: async () => okResponse(['profile'], 9, { ...person, mobile_phone: true, phone_numbers: true, personal_emails: false, recommended_personal_email: true }) });
  assert.equal(masked.status, 'matched'); assert.equal(masked.personal_contact_access, 'masked_by_plan'); assert.equal(masked.personal_contact?.mobile_phone, null);
  const empty = await enrichPdlProfile(profileInput, { apiKey: 'secret', store: new Store(), fetchFn: async () => okResponse(['profile'], 9, { ...person, mobile_phone: null, phone_numbers: [], personal_emails: [], recommended_personal_email: null }) });
  assert.equal(empty.personal_contact_access, 'none_on_record');
});

test('PDL professional-only mode omits contact fields from the request and result', async () => {
  let body: Record<string, unknown> = {};
  const out = await enrichPdlProfile({ ...profileInput, include_personal_contact: false, require_contact: true }, { apiKey: 'secret', store: new Store(), fetchFn: async (_url, init) => { body = JSON.parse(String(init?.body)); return okResponse(['profile']); } });
  assert.equal(body.data_include, PDL_PROFESSIONAL_FIELDS.join(',')); assert.equal('required' in body, false);
  assert.equal(out.scope, 'professional_profile_only'); assert.equal(out.personal_contact_access, 'not_requested'); assert.equal(out.personal_contact, undefined);
  assert.equal(JSON.stringify(out).includes('+1518'), false);
});

test('PDL rejects unsupported inputs and missing confirmation before spending', async () => {
  let calls = 0; const store = new Store();
  const bad = [
    { ...profileInput, confirm_paid_enrichment: false }, { ...profileInput, phone: 'x' }, { ...profileInput, profile_url: 'https://evil.test/in/person' },
    { ...profileInput, profile_url: profileInput.profile_url + '?x=1' }, { name: 'Only Name', confirm_paid_enrichment: true }, { ...nameInput, subject_npi: '12' },
  ];
  for (const input of bad) await assert.rejects(enrichPdlProfile(input as typeof profileInput, { apiKey: 'secret', store, fetchFn: async () => { calls++; return okResponse(['profile']); } }));
  assert.equal(calls, 0); assert.equal(store.data.size, 0);
});

test('PDL rejects wrong identities and insufficient likelihood without returning any data', async () => {
  for (const response of [{ status: 200, likelihood: 7, matched: ['profile'], data: person }, { status: 200, likelihood: 9, matched: ['profile'], data: { ...person, linkedin_url: 'linkedin.com/in/wrong-person' } }]) {
    const out = await enrichPdlProfile(profileInput, { apiKey: 'secret', store: new Store(), fetchFn: async () => Response.json(response) });
    assert.equal(out.status, 'ambiguous'); assert.equal(out.professional, undefined); assert.equal(out.personal_contact, undefined);
    assert.equal(JSON.stringify(out).includes('+1518'), false);
  }
});

test('PDL shares a configurable rolling budget across sessions and caches repeats for seven days', async () => {
  const store = new Store(); let calls = 0; const now = Date.now();
  const options = { apiKey: 'secret', store, now, dailyLimit: 5, fetchFn: async () => { calls++; return new Response(null, { status: 404 }); } };
  await Promise.all(Array.from({ length: 8 }, () => enrichPdlProfile(profileInput, options)));
  assert.equal(calls, 1);
  const settled = await Promise.allSettled(Array.from({ length: 6 }, (_, i) => enrichPdlProfile({ ...profileInput, profile_url: profileInput.profile_url + i }, options)));
  assert.equal(settled.filter(r => r.status === 'rejected').length, 2); assert.equal(calls, 5);
  const cached = await enrichPdlProfile(profileInput, { ...options, now: now + 2 * 86400000 });
  assert.equal(cached.cached, true); assert.equal(cached.status, 'no_match'); assert.equal(calls, 5);
  await enrichPdlProfile(profileInput, { ...options, now: now + 8 * 86400000 }); assert.equal(calls, 6);
  const wideStore = new Store();
  const wide = await Promise.allSettled(Array.from({ length: 26 }, (_, i) => enrichPdlProfile({ ...profileInput, profile_url: profileInput.profile_url + 'w' + i }, { ...options, store: wideStore, dailyLimit: undefined })));
  assert.equal(wide.filter(r => r.status === 'rejected').length, 1);
});

test('PDL preserves uncertain failures and never retries or returns upstream error bodies', async () => {
  for (const failure of [async () => new Response('secret PRIVATE_PHONE', { status: 403 }), async () => new Response(null, { status: 302, headers: { location: 'https://evil.test/PRIVATE_PHONE' } }), async () => { throw new Error('secret PRIVATE_PHONE'); }]) {
    let calls = 0; const store = new Store();
    const options = { apiKey: 'secret', store, fetchFn: async () => { calls++; return failure(); } };
    const out = await enrichPdlProfile(profileInput, options);
    assert.equal(out.status, 'unavailable'); assert.equal(JSON.stringify(out).includes('secret'), false);
    await enrichPdlProfile(profileInput, options); assert.equal(calls, 1);
    // Unavailable outcomes are held for an hour, not seven days, so a corrected key or recovered vendor can be retried.
    await enrichPdlProfile(profileInput, { ...options, now: Date.now() + 61 * 60_000 }); assert.equal(calls, 2);
  }
});

test('enrich_candidate_profile resolves an NPI to a name/location match and returns registry context alongside PDL results', async () => {
  const { enrichCandidateProfile } = await import('../src/index.js');
  const seen: unknown[] = [];
  const registry = { npi: '1234567893', name: 'TEST, JORDAN', first_name: 'JORDAN', last_name: 'TEST', practice_city: 'ALBANY', practice_state: 'NY', practice_phone: '518-555-0100', source_fetched_at: '2026-09-01T00:00:00Z' };
  const options = {
    agencyApiKey: 'agency', agencyBaseUrl: 'https://agency.test',
    fetchFn: async () => Response.json({ success: true, data: { report: { evaluated_at: 'now', source: {}, recruiting_pipeline: {}, persona: {}, market_coverage_status: 'x', direct_outreach_status: 'blocked', provider_count: 1 }, providers: [registry], readiness: [], total: 1, limit: 1, offset: 0 } }),
    pdlEnrich: async (input: unknown) => { seen.push(input); return { status: 'matched' as const, source: 'People Data Labs' as const, scope: 'professional_and_personal_contact' as const, retrieved_at: 'now', subject_npi: '1234567893', personal_contact_access: 'returned' as const, provenance: { source: 'People Data Labs' as const, retrieved_at: 'now', contact_type: 'vendor_reported_personal_contact' as const, verification: 'unverified' as const, consent_basis: 'not_recorded' as const }, limitation: 'x' }; },
  };
  const out = await enrichCandidateProfile({ npi: '1234567893', confirm_paid_enrichment: true }, options) as Record<string, any>;
  assert.deepEqual(seen[0], { name: 'JORDAN TEST', locality: 'ALBANY', region: 'NY', subject_npi: '1234567893', confirm_paid_enrichment: true, include_personal_contact: true, require_contact: false });
  assert.equal(out.registry.practice_phone, '518-555-0100'); assert.equal(out.registry.contact_route_status, 'public_registry_unverified');
  assert.deepEqual(out.match_input, { name: 'JORDAN TEST', locality: 'ALBANY', region: 'NY' });
  await assert.rejects(enrichCandidateProfile({ npi: '1234567893', name: 'x', locality: 'y', confirm_paid_enrichment: true }, options), /exactly one/);
  await assert.rejects(enrichCandidateProfile({ confirm_paid_enrichment: true }, options), /exactly one/);
  assert.equal(seen.length, 1);
});
