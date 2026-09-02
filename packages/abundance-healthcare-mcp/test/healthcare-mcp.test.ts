import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NPG_HEALTHCARE_MARKETS,
  getHealthcareCoverage,
  getHealthcarePractitioner,
  isAcceptedHealthcareBearer,
  listHealthcareMarkets,
  searchCoverageCandidates,
  type HealthcareApiResponse,
} from '../src/index.ts';

const report = {
  persona: NPG_HEALTHCARE_MARKETS[0],
  evaluated_at: '2026-09-02T16:00:00.000Z',
  market_coverage_status: 'degraded',
  direct_outreach_status: 'blocked',
  recruiting_pipeline: {
    coverage_candidate_count: 385,
    recruiter_ready_count: 0,
    required_evidence_kinds: ['license_or_privilege'],
  },
  provider_count: 385,
  source: {
    latest_fetched_at: '2026-09-02T01:39:07.502Z',
    snapshot_age_days: 0.6,
    coverage_limit_reached: false,
  },
};

test('get healthcare coverage reads one approved market without requesting practitioner rows', async () => {
  let requestedUrl = '';
  let authorization = '';
  const fetchFn: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get('Authorization') ?? '';
    return Response.json({ success: true, data: {
      report,
      providers: [{
        npi: '1265049910', name: 'Jane Doe', source_fetched_at: '2026-09-02T01:39:07.502Z',
        practice_address_1: '100 Private In Coverage Ave', practice_phone: '4175550100',
      }],
      readiness: [], total: 385, limit: 1, offset: 0,
    } } satisfies HealthcareApiResponse);
  };

  const result = await getHealthcareCoverage(
    { market_id: 'npg-family-np-springfield-mo' },
    { agencyApiKey: 'test-key', fetchFn },
  );

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, '/api/abundance/healthcare-providers/nationwide');
  assert.equal(url.searchParams.get('state'), 'MO');
  assert.equal(url.searchParams.get('city'), 'Springfield');
  assert.equal(url.searchParams.get('limit'), '1');
  assert.equal(authorization, 'Bearer test-key');
  assert.equal(result.report.provider_count, 385);
  assert.equal(result.report.direct_outreach_status, 'blocked');
  assert.doesNotMatch(JSON.stringify(result), /Private In Coverage|417555/);
});

test('individual practitioner lookup returns public practice contact with readiness gates', async () => {
  const provider = {
    npi: '1265049910',
    name: 'Alissa Joy Snider',
    credential: 'NP-C',
    status: 'active',
    last_updated_date: '2026-09-01',
    practice_address_1: '100 Practice Ave',
    practice_city: 'Springfield',
    practice_state: 'MO',
    practice_postal_code: '65801',
    practice_phone: '4175550100',
    source_fetched_at: '2026-09-02T01:39:07.502Z',
  };
  const readiness = {
    npi: provider.npi,
    stage: 'coverage_candidate' as const,
    evaluated_at: report.evaluated_at,
    gates: [{ kind: 'outreach_authority', status: 'missing' }],
    blocking_reasons: ['outreach authority or consent is missing.'],
  };
  const fetchFn: typeof fetch = async () => Response.json({
    success: true,
    data: { report, providers: [provider], readiness: [readiness], total: 1, limit: 1, offset: 0 },
  } satisfies HealthcareApiResponse);

  const result = await getHealthcarePractitioner(
    { market_id: 'npg-family-np-springfield-mo', npi: provider.npi },
    { agencyApiKey: 'test-key', fetchFn },
  );

  assert.equal(result.provider.practice_phone, '4175550100');
  assert.equal(result.readiness.stage, 'coverage_candidate');
  assert.equal(result.direct_outreach_status, 'blocked');
  assert.match(result.contact_limitation, /organization-level/i);
});

test('candidate search is bounded, filterable, and omits bulk contact fields', async () => {
  const providers = [
    {
      npi: '1265049910',
      name: 'Alissa Joy Snider',
      credential: 'NP-C',
      status: 'active',
      last_updated_date: '2026-09-01',
      primary_taxonomy_description: 'Nurse Practitioner, Family',
      practice_address_1: '100 Private In Bulk Ave',
      practice_city: 'Springfield',
      practice_state: 'MO',
      practice_postal_code: '65801',
      practice_phone: '4175550100',
      source_fetched_at: '2026-09-02T01:39:07.502Z',
    },
    {
      npi: '1000000002',
      name: 'Older Provider',
      last_updated_date: '2016-02-02',
      practice_phone: '4175550101',
      source_fetched_at: '2026-09-02T01:39:07.502Z',
    },
  ];
  const fetchFn: typeof fetch = async () => Response.json({
    success: true,
    data: {
      report,
      providers,
      readiness: providers.map((provider) => ({
        npi: provider.npi,
        stage: 'coverage_candidate' as const,
        evaluated_at: report.evaluated_at,
        gates: [{ kind: 'license_or_privilege', status: 'missing' }],
        blocking_reasons: ['license or practice privilege is missing.'],
      })), total: 1, limit: 1, offset: 0,
    },
  } satisfies HealthcareApiResponse);

  const result = await searchCoverageCandidates(
    {
      market_id: 'npg-family-np-springfield-mo',
      updated_since: '2026-01-01',
      limit: 1,
      offset: 0,
    },
    { agencyApiKey: 'test-key', fetchFn },
  );

  assert.equal(result.total, 1);
  assert.equal(result.results[0].name, 'Alissa Joy Snider');
  assert.equal(result.results[0].recruiting_stage, 'coverage_candidate');
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /Private In Bulk|417555/);
});

test('candidate search derives an arbitrary city market from the nationwide snapshot', async () => {
  let requestedUrl = '';
  const fetchFn: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({
      success: true,
      data: {
        report,
        providers: [{
          npi: '1750298360',
          name: 'Austin Family NP',
          credential: 'FNP-BC',
          last_updated_date: '2026-08-27',
          practice_address_1: '100 Private In Bulk Ave',
          practice_city: 'Austin',
          practice_state: 'TX',
          practice_phone: '5125550100',
          source_fetched_at: '2026-09-02T01:39:07.502Z',
        }],
        readiness: [],
        total: 882,
        limit: 5,
        offset: 0,
      },
    } satisfies HealthcareApiResponse);
  };

  const result = await searchCoverageCandidates(
    {
      state: 'tx',
      city: 'Austin',
      limit: 5,
      offset: 0,
    },
    { agencyApiKey: 'test-key', fetchFn },
  );

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get('state'), 'TX');
  assert.equal(url.searchParams.get('city'), 'austin');
  assert.equal(result.market_id, 'npg-family-np-nationwide');
  assert.deepEqual(result.location, {
    scope: 'derived_locale',
    label: 'Austin, TX',
    state: 'TX',
    city: 'Austin',
  });
  assert.equal(result.total, 882);
  assert.equal(result.results.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /Private In Bulk|512555/);
});

test('candidate search rejects an unknown US state code before querying coverage', async () => {
  let fetchCalled = false;
  const fetchFn: typeof fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not run');
  };

  await assert.rejects(
    searchCoverageCandidates(
      { state: 'ZZ', city: 'Nowhere', limit: 5, offset: 0 },
      { agencyApiKey: 'test-key', fetchFn },
    ),
    /supported US state, district, or territory code/i,
  );
  assert.equal(fetchCalled, false);
});

test('candidate search Unicode-normalizes the city query while preserving its market label', async () => {
  let requestedUrl = '';
  const fetchFn: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({
      success: true,
      data: { report, providers: [], readiness: [], total: 0, limit: 5, offset: 0 },
    } satisfies HealthcareApiResponse);
  };

  const result = await searchCoverageCandidates(
    { state: 'PR', city: 'MAYAGÜEZ', limit: 5, offset: 0 },
    { agencyApiKey: 'test-key', fetchFn },
  );

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get('city'), 'mayagüez');
  assert.equal(result.location?.label, 'MAYAGÜEZ, PR');
});

test('list healthcare markets exposes weekly defaults and no daily locale', async () => {
  const fetchFn: typeof fetch = async (input) => {
    const url = new URL(String(input));
    const market = url.searchParams.get('city') === 'Springfield'
      ? NPG_HEALTHCARE_MARKETS[1]
      : url.searchParams.get('city') === 'Arlington'
        ? NPG_HEALTHCARE_MARKETS[2]
        : NPG_HEALTHCARE_MARKETS[0];
    return Response.json({
      success: true,
      data: {
        report: {
          ...report,
          persona: market,
        },
        providers: [], readiness: [], total: 385, limit: 25, offset: 0,
      },
    } satisfies HealthcareApiResponse);
  };

  const result = await listHealthcareMarkets({ agencyApiKey: 'test-key', fetchFn });

  assert.equal(result.markets.length, 3);
  assert.ok(result.markets.every((market) => market.refresh_cadence === 'weekly'));
  assert.ok(result.markets.every((market) => market.daily_monitoring === false));
  assert.ok(result.markets.every((market) => market.latest_fetched_at === '2026-09-02T01:39:07.502Z'));
});

test('shared Hub bearer remains valid when a scoped direct key is also provisioned', async () => {
  assert.equal(await isAcceptedHealthcareBearer('shared-hub-token', [
    'shared-hub-token', 'scoped-direct-token',
  ]), true);
  assert.equal(await isAcceptedHealthcareBearer('wrong-token', [
    'shared-hub-token', 'scoped-direct-token',
  ]), false);
});
