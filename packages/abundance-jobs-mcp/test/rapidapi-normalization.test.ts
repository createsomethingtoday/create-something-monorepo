import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSearchFallbackAttempts,
  buildPublicJobUpsert,
  classifyNursingJobTitle,
  getPublicJobsCoverage,
  ingestRapidApiJobs,
  inferNursingRolePlan,
  listAbundanceJobToolNames,
  normalizeRapidApiJobRecord,
  normalizeRapidApiIngestInput,
  normalizeNursingJobsIngestInput,
  normalizePublicJob,
  queryPublicJobs,
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

test('RapidAPI refresh defaults to the incremental endpoint for cost control', () => {
  const request = normalizeRapidApiIngestInput({});

  assert.deepEqual(request.endpoints, ['/modified-ats-24h']);
  assert.equal(request.title_filter, 'nurse');
  assert.equal(request.location_filter, 'United States');
  assert.equal(request.include_backfill, false);
  assert.equal(request.freshness_window_minutes, 60);
});

test('RapidAPI backfill requires an explicit request', () => {
  const request = normalizeRapidApiIngestInput({ include_backfill: true });

  assert.deepEqual(request.endpoints, ['/active-ats-7d', '/modified-ats-24h']);
});

test('nursing jobs refresh contract pins the nursing filter and incremental endpoint', () => {
  const request = normalizeNursingJobsIngestInput({ location_filter: 'Texas', limit: 25 });

  assert.equal(request.title_filter, 'nurse');
  assert.equal(request.location_filter, 'Texas');
  assert.equal(request.limit, 25);
  assert.deepEqual(request.endpoints, ['/modified-ats-24h']);
});

test('nursing jobs refresh backfill remains explicit', () => {
  const request = normalizeNursingJobsIngestInput({ include_backfill: true });

  assert.equal(request.title_filter, 'nurse');
  assert.equal(request.location_filter, 'United States');
  assert.deepEqual(request.endpoints, ['/active-ats-7d', '/modified-ats-24h']);
});

test('nursing title classifier prioritizes core staffing roles over mixed adjacent titles', () => {
  assert.deepEqual(classifyNursingJobTitle('Registered Nurse (RN) - ER'), {
    rank: 0,
    role: 'registered_nurse',
    reason: 'RN or Registered Nurse title',
  });
  assert.deepEqual(classifyNursingJobTitle('Licensed Practical Nurse (LPN) - Full Time'), {
    rank: 1,
    role: 'licensed_practical_or_vocational_nurse',
    reason: 'LPN/LVN title',
  });
  assert.deepEqual(classifyNursingJobTitle('Certified Nurse Aide CNA'), {
    rank: 2,
    role: 'certified_nursing_assistant',
    reason: 'CNA title',
  });
  assert.equal(classifyNursingJobTitle('Nurse Practitioner/Physician Assistant - Pediatrics').rank, 5);
  assert.equal(classifyNursingJobTitle('RN - Nurse Intern - Non Paid').rank, 5);
});

test('ChatGPT public tool list excludes write-capable funnel action', () => {
  assert.deepEqual(listAbundanceJobToolNames({ includeFunnelTool: false }), [
    'search',
    'fetch',
    'list_public_jobs',
    'search_public_jobs',
    'get_job',
    'get_public_jobs_coverage',
  ]);
  assert.equal(listAbundanceJobToolNames().includes('send_job_to_funnel'), true);
});

test('ChatGPT nursing role plans keep specialty searches narrow', () => {
  assert.deepEqual(inferNursingRolePlan('LPN jobs Arlington Texas'), {
    queries: ['licensed practical nurse', 'licensed vocational nurse', 'lpn', 'lvn'],
    allowGenericFallback: false,
  });
  assert.deepEqual(inferNursingRolePlan('CNA Arlington TX'), {
    queries: ['cna', 'certified nursing assistant', 'certified nurse assistant', 'certified nurse aide'],
    allowGenericFallback: false,
  });
  assert.deepEqual(inferNursingRolePlan('registered nurse California'), {
    queries: ['registered nurse', 'rn'],
    allowGenericFallback: true,
  });
  assert.deepEqual(inferNursingRolePlan('ER nurse Fort Worth Texas'), {
    queries: ['emergency', 'emergency room', 'emergency department'],
    allowGenericFallback: false,
  });
});

test('ChatGPT search fallbacks preserve specialty and geography constraints', () => {
  const cnaAttempts = buildSearchFallbackAttempts({ query: 'CNA Arlington TX', status: 'open', limit: 10 }, 'CNA Arlington TX');
  assert.equal(cnaAttempts.some((attempt) => attempt.fallback?.reason === 'state_fallback'), false);
  assert.equal(cnaAttempts.some((attempt) => attempt.fallback?.reason === 'role_fallback'), false);
  assert.equal(cnaAttempts.some((attempt) => attempt.fallback?.reason === 'nurse_role_fallback'), false);
  assert.ok(cnaAttempts.some((attempt) => attempt.filters.query === 'cna' && attempt.filters.location === 'Arlington' && attempt.filters.state === 'TX'));

  const lpnAttempts = buildSearchFallbackAttempts({ query: 'LPN Arlington Texas', status: 'open', limit: 10 }, 'LPN Arlington Texas');
  assert.ok(
    lpnAttempts.some(
      (attempt) => attempt.fallback?.reason === 'state_role_fallback' && attempt.filters.query === 'licensed vocational nurse' && attempt.filters.state === 'TX',
    ),
  );

  const californiaAttempts = buildSearchFallbackAttempts({ query: 'registered nurse California', status: 'open', limit: 10 }, 'registered nurse California');
  assert.equal(californiaAttempts.some((attempt) => attempt.fallback?.reason === 'role_fallback'), false);
  assert.ok(
    californiaAttempts.every((attempt) => !attempt.filters.state || attempt.filters.state === 'CA'),
    'state-constrained searches should not drop into national results',
  );
});

test('public job state filters do not match arbitrary two-letter substrings', async () => {
  let boundArgs: unknown[] = [];
  const db = {
    prepare(sql: string) {
      assert.match(sql, /upper\(state\) = \?/);
      assert.match(sql, /lower\(state\) = lower\(\?\)/);
      assert.match(sql, /lower\(location_text\) LIKE lower\(\?\)/);
      return {
        bind(...args: unknown[]) {
          boundArgs = args;
          return {
            async all() {
              return { results: [] };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  await queryPublicJobs(db, { query: 'registered nurse', state: 'CA', limit: 10 });

  assert.equal(boundArgs.includes('%CA%'), false);
  assert.ok(boundArgs.includes('CA'));
  assert.ok(boundArgs.includes('california'));
  assert.ok(boundArgs.includes('%, CA,%'));
  assert.ok(boundArgs.includes('%, california,%'));
});

test('public jobs coverage summarizes indexed state coverage without paid provider calls', async () => {
  const sqlCalls: string[] = [];
  const bindCalls: unknown[][] = [];
  const db = {
    prepare(sql: string) {
      sqlCalls.push(sql);
      return {
        bind(...args: unknown[]) {
          bindCalls.push(args);
          return {
            async first() {
              assert.match(sql, /COUNT\(\*\) AS job_count/);
              return { job_count: 0, newest_last_seen_at: null };
            },
            async all() {
              if (sql.includes('GROUP BY upper(state)')) return { results: [] };
              if (sql.includes('GROUP BY role')) return { results: [] };
              if (sql.includes('GROUP BY source_system')) return { results: [] };
              return { results: [] };
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  const coverage = await getPublicJobsCoverage(db, { state: 'Alabama' });

  assert.equal(coverage.status, 'open');
  assert.equal(coverage.requested_state, 'AL');
  assert.equal(coverage.has_coverage, false);
  assert.match(coverage.notes.join('\n'), /does not call RapidAPI/);
  assert.match(coverage.notes.join('\n'), /dataset coverage gaps/);
  assert.equal(sqlCalls.length, 4);
  assert.ok(bindCalls.every((args) => args.includes('open')));
  assert.ok(bindCalls.every((args) => args.includes('AL')));
  assert.ok(bindCalls.every((args) => args.includes('alabama')));
});

test('fresh Cloudflare D1 ingestion run skips a paid RapidAPI fetch', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('RapidAPI should not be called when a fresh D1 run exists.');
  }) as typeof fetch;

  const requestedFilters = normalizeRapidApiIngestInput({});
  const writes: Array<{ args: unknown[] }> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async all() {
              assert.match(sql, /FROM abundance_public_job_ingestion_runs/);
              return {
                results: [
                  {
                    id: 'abjobrun_recent',
                    requested_filters_json: JSON.stringify(requestedFilters),
                    metadata_json: JSON.stringify({ endpoints: [{ endpoint: '/modified-ats-24h' }] }),
                    finished_at: new Date().toISOString(),
                  },
                ],
              };
            },
            async run() {
              writes.push({ args });
              return {};
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  try {
    const result = await ingestRapidApiJobs({
      db,
      config: { rapidApiKey: 'test-key' },
      request: {},
    });

    assert.equal(fetchCalls, 0);
    assert.equal(result.skipped, true);
    assert.equal(result.request_count, 0);
    assert.equal(result.reused_run_id, 'abjobrun_recent');
    assert.equal(writes.length, 1);
    assert.match(String(writes[0]?.args[8]), /fresh_cloudflare_d1_ingestion/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('dry-run ingestion records do not refresh the reusable D1 freshness window', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;

  const requestedFilters = normalizeRapidApiIngestInput({});
  const db = {
    prepare(sql: string) {
      return {
        bind(..._args: unknown[]) {
          return {
            async all() {
              assert.match(sql, /FROM abundance_public_job_ingestion_runs/);
              return {
                results: [
                  {
                    id: 'abjobrun_dry_run',
                    requested_filters_json: JSON.stringify(requestedFilters),
                    metadata_json: JSON.stringify({ dry_run: true, request_count: 1 }),
                    finished_at: new Date().toISOString(),
                  },
                ],
              };
            },
            async run() {
              return {};
            },
          };
        },
      };
    },
  } as unknown as D1Database;

  try {
    const result = await ingestRapidApiJobs({
      db,
      config: { rapidApiKey: 'test-key' },
      request: {},
    });

    assert.equal(fetchCalls, 1);
    assert.equal(result.skipped, false);
    assert.equal(result.request_count, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
