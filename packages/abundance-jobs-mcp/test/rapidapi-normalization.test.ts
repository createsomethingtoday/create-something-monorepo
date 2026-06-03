import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicJobUpsert,
  normalizeRapidApiJobRecord,
  normalizePublicJob,
} from '../src/index.ts';

const rapidApiRecord = {
  id: '2185227032',
  date_posted: '2026-06-03T05:30:06',
  date_created: '2026-06-03T00:57:04.88576',
  title: 'Nurse - PT/OC',
  organization: 'Cogir at the Quarry',
  date_validthrough: null,
  locations_raw: [
    {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '415 SE 177th Ave',
        addressLocality: 'Vancouver',
        addressRegion: 'WA',
        postalCode: '98683',
        addressCountry: 'US',
      },
    },
  ],
  salary_raw: {
    minValue: 41,
    maxValue: 44,
    currency: 'USD',
  },
  employment_type: ['PART_TIME'],
  url: 'https://recruiting.paylocity.com/example',
  source: 'paylocity',
  source_domain: 'recruiting.paylocity.com',
};

test('RapidAPI Active Jobs records normalize into the Abundance public job shape', async () => {
  const job = await normalizeRapidApiJobRecord(rapidApiRecord, {
    fetchedAt: '2026-06-03T12:00:00.000Z',
    endpoint: '/active-ats-7d',
    requestedFilters: { title_filter: 'nurse', location_filter: 'United States', limit: 10 },
  });

  assert.equal(job.provider, 'rapidapi');
  assert.equal(job.source_system, 'paylocity');
  assert.equal(job.external_job_id, '2185227032');
  assert.equal(job.title, 'Nurse - PT/OC');
  assert.equal(job.employer, 'Cogir at the Quarry');
  assert.equal(job.city, 'Vancouver');
  assert.equal(job.state, 'WA');
  assert.equal(job.country, 'US');
  assert.equal(job.location_text, '415 SE 177th Ave, Vancouver, WA, 98683, US');
  assert.equal(job.status, 'open');
  assert.equal(job.application_url, 'https://recruiting.paylocity.com/example');
  assert.equal(job.posted_at, '2026-06-03T05:30:06');
  assert.equal(job.last_seen_at, '2026-06-03T12:00:00.000Z');
  assert.match(job.metadata_json ?? '', /active-ats-7d/);
});

test('expired RapidAPI records normalize to expired without changing provider identity', async () => {
  const job = await normalizeRapidApiJobRecord(
    {
      ...rapidApiRecord,
      id: 'expired-1',
      date_validthrough: '2020-01-01T00:00:00Z',
    },
    { fetchedAt: '2026-06-03T12:00:00.000Z' },
  );

  assert.equal(job.provider, 'rapidapi');
  assert.equal(job.status, 'expired');
});

test('public job raw payload hashes are stable across object key order', async () => {
  const left = await normalizePublicJob({
    provider: 'rapidapi',
    source_system: 'paylocity',
    external_job_id: 'stable-id',
    title: 'Registered Nurse',
    raw_payload: { b: 2, a: 1 },
    fetched_at: '2026-06-03T12:00:00.000Z',
  });
  const right = await normalizePublicJob({
    provider: 'rapidapi',
    source_system: 'paylocity',
    external_job_id: 'stable-id',
    title: 'Registered Nurse',
    raw_payload: { a: 1, b: 2 },
    fetched_at: '2026-06-03T12:00:00.000Z',
  });

  assert.equal(left.id, right.id);
  assert.equal(left.raw_payload_hash, right.raw_payload_hash);
});

test('public job upsert targets provider source external id uniqueness boundary', async () => {
  const job = await normalizeRapidApiJobRecord(rapidApiRecord);
  const statement = buildPublicJobUpsert(job);

  assert.match(statement.sql, /ON CONFLICT\(provider, source_system, external_job_id\)/);
  assert.equal(statement.args[1], 'rapidapi');
  assert.equal(statement.args[2], 'paylocity');
  assert.equal(statement.args[4], '2185227032');
});
