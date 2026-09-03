import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import {
  NPG_HEALTHCARE_MARKETS,
  createAbundanceHealthcareServer,
  enrichProviderProfessionalContact,
  getHealthcareCoverage,
  getHealthcarePractitioner,
  getProviderContactInformation,
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
  assert.match(result.contact_limitation, /may be personal or residential/i);
});

test('exact-NPI contact lookup classifies Type 1 registry fields without granting outreach authority', async () => {
  const provider = {
    npi: '1265049910',
    enumeration_type: 'NPI-1',
    name: 'Jane Test Provider',
    status: 'active',
    practice_address_1: '100 Registry Ave',
    practice_city: 'Springfield',
    practice_state: 'MO',
    practice_postal_code: '65801',
    practice_phone: '4175550100',
    source_system: 'nppes_npi_registry_v2_1',
    source_fetched_at: '2026-09-02T01:39:07.502Z',
  };
  const fetchFn: typeof fetch = async () => Response.json({
    success: true,
    data: { report, providers: [provider], readiness: [], total: 1, limit: 1, offset: 0 },
  } satisfies HealthcareApiResponse);

  const result = await getProviderContactInformation(
    { npi: provider.npi, purpose: 'recruiting_outreach' },
    { agencyApiKey: 'test-key', fetchFn },
  );

  assert.equal(result.provider.npi, provider.npi);
  assert.equal(result.contact.classification, 'individual_public_registry');
  assert.equal(result.contact.possible_personal_or_residential, true);
  assert.equal(result.contact.practice_phone, '4175550100');
  assert.equal(result.contact.source.system, 'nppes_npi_registry_v2_1');
  assert.equal(result.outreach_authority_status, 'not_established');
  assert.equal(result.advertising_eligibility_status, 'not_established');
  assert.equal(result.recruiting_readiness_impact, 'none');
  assert.match(result.contact_limitation, /does not establish consent/i);
});

test('healthcare lookup failures omit NPIs and upstream response bodies', async () => {
  const input = { npi: '1265049910', purpose: 'recruiting_outreach' as const };
  await assert.rejects(
    getProviderContactInformation(input, {
      agencyApiKey: 'test-key',
      fetchFn: async () => Response.json({
        success: true,
        data: { report, providers: [], readiness: [], total: 0, limit: 1, offset: 0 },
      } satisfies HealthcareApiResponse),
    }),
    (error: unknown) => {
      assert.match(String(error), /requested NPI was not found/i);
      assert.doesNotMatch(String(error), /1265049910/);
      return true;
    },
  );
  await assert.rejects(
    getProviderContactInformation(input, {
      agencyApiKey: 'test-key',
      fetchFn: async () => new Response('contact@example.test 4175550100', { status: 503 }),
    }),
    (error: unknown) => {
      assert.match(String(error), /HTTP 503/i);
      assert.doesNotMatch(String(error), /contact@example\.test|4175550100/);
      return true;
    },
  );
});

test('confirmed Exa enrichment is bounded to one exact provider and preserves unverified status', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({
        success: true,
        data: {
          report,
          providers: [{
            npi: '1265049910', enumeration_type: 'NPI-1', name: 'Jane Test Provider',
            primary_taxonomy_description: 'Nurse Practitioner, Family', practice_city: 'Springfield',
            practice_state: 'MO', source_fetched_at: '2026-09-02T01:39:07.502Z',
          }],
          readiness: [], total: 1, limit: 1, offset: 0,
        },
      } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_test',
      object: 'agent_run',
      status: 'completed',
      stopReason: 'schema_satisfied',
      output: {
        text: '',
        structured: {
          match_status: 'plausible_match',
          identity_reason: 'Name, profession, and market align; NPI was not present on the profile.',
          professional_profile_url: 'https://example.test/professional-profile',
          professional_email: 'jane.provider@example.test',
          professional_phone: null,
          evidence_summary: 'One public professional profile was located.',
        },
        grounding: [{ field: 'professional_profile_url', citations: [{ url: 'https://example.test/professional-profile' }] }],
      },
      usage: { agentComputeUnits: 0.1, searches: 1, emails: 1, phoneNumbers: 0 },
      costDollars: { total: 0.032, agentCompute: 0.012, search: 0, emails: 0.02, phoneNumbers: 0 },
    });
  };

  const result = await enrichProviderProfessionalContact(
    {
      npi: '1265049910', purpose: 'recruiting_outreach',
      confirm_paid_enrichment: true, contact_types: ['email', 'phone'],
    },
    { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
  );

  const exaRequest = requests.find((request) => request.url === 'https://api.exa.ai/agent/runs');
  assert.ok(exaRequest);
  assert.equal(new Headers(exaRequest.init?.headers).get('x-api-key'), 'exa-test-key');
  const body = JSON.parse(String(exaRequest.init?.body));
  assert.equal(body.effort, 'minimal');
  assert.equal(body.input.data.length, 1);
  assert.equal(body.input.data[0].npi, '1265049910');
  assert.equal(body.outputSchema.properties.professional_email.format, 'email');
  assert.equal(body.outputSchema.properties.professional_phone.format, 'phone');
  assert.equal(result.match_status, 'plausible_match');
  assert.equal(result.contact_route_status, 'unverified_enrichment_candidate');
  assert.equal(result.outreach_authority_status, 'not_established');
  assert.equal(result.advertising_eligibility_status, 'not_established');
  assert.equal(result.estimated_max_cost_usd, 0.102);
});

test('Exa enrichment fails before any lookup when its server-side key is unavailable', async () => {
  let fetchCalled = false;
  const fetchFn: typeof fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not run');
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', fetchFn },
    ),
    /EXA_API_KEY is not configured/i,
  );
  assert.equal(fetchCalled, false);
});

test('Exa enrichment requires explicit paid-call confirmation before any lookup', async () => {
  let fetchCalled = false;
  const fetchFn: typeof fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch should not run');
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      // @ts-expect-error Exercise runtime validation for an MCP client that omits confirmation.
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: false },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
    ),
    /confirm_paid_enrichment/i,
  );
  assert.equal(fetchCalled, false);
});

test('Exa enrichment cancels an unfinished run at the bounded timeout', async () => {
  let cancelCalled = false;
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    if (url.endsWith('/cancel')) {
      cancelCalled = true;
      return new Response(null, { status: 204 });
    }
    return Response.json({ id: 'agent_run_timeout', object: 'agent_run', status: url.endsWith('/agent/runs') ? 'queued' : 'running' });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      {
        agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn,
        exaTimeoutMs: 1_000, exaPollIntervalMs: 100,
      },
    ),
    /was cancelled/i,
  );
  assert.equal(cancelCalled, true);
});

test('Exa timeout does not claim cancellation when cleanup fails', async () => {
  const startedAt = Date.now();
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    if (url.endsWith('/cancel')) return new Promise<Response>(() => { /* Simulate stalled cleanup. */ });
    return Response.json({ id: 'agent_run_cancel_failed', object: 'agent_run', status: url.endsWith('/agent/runs') ? 'queued' : 'running' });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      {
        agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn,
        exaTimeoutMs: 1_000, exaPollIntervalMs: 100,
      },
    ),
    /cancellation could not be confirmed/i,
  );
  assert.ok(Date.now() - startedAt < 1_500, 'cleanup must stay inside the declared one-second deadline');
});

test('Exa polling failures cancel the paid run before returning an error', async () => {
  let cancelCalled = false;
  let cancelledUrl = '';
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    if (url.endsWith('/cancel')) {
      cancelCalled = true;
      cancelledUrl = url;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/agent/runs')) {
      return Response.json({ id: 'agent_run_poll_failed', object: 'agent_run', status: 'queued' });
    }
    return Response.json({ id: 'different_paid_run', object: 'agent_run', status: 'completed' });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn, exaPollIntervalMs: 100 },
    ),
    (error: unknown) => {
      assert.match(String(error), /polling failed.*was cancelled/i);
      return true;
    },
  );
  assert.equal(cancelCalled, true);
  assert.match(cancelledUrl, /agent_run_poll_failed\/cancel$/);
});

test('a stalled Exa poll response body is bounded by the overall deadline and cancelled', async () => {
  let cancelCalled = false;
  const fetchFn: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    if (url.endsWith('/cancel')) {
      cancelCalled = true;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/agent/runs')) {
      return Response.json({ id: 'agent_run_stalled_poll', object: 'agent_run', status: 'queued' });
    }
    return new Response(new ReadableStream({ start() { /* Keep the response body open. */ } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      {
        agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn,
        exaTimeoutMs: 1_000, exaPollIntervalMs: 100,
      },
    ),
    /polling failed.*was cancelled/i,
  );
  assert.equal(cancelCalled, true);
});

test('an indeterminate Exa create response warns that a paid run may be active and must not be retried', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return new Response(new ReadableStream({ start() { /* Simulate a create response whose body never arrives. */ } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn, exaTimeoutMs: 1_000 },
    ),
    /create result is indeterminate.*paid run may be active.*do not retry/i,
  );
});

test('Exa upstream failures do not reflect response bodies containing contact data', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return new Response('upstream detail contained fake-contact@example.test', {
      status: 500,
      headers: { 'x-request-id': 'request-safe-id' },
    });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
    ),
    (error: unknown) => {
      assert.match(String(error), /create result is indeterminate.*do not retry/i);
      assert.doesNotMatch(String(error), /fake-contact/i);
      return true;
    },
  );
});

test('Exa create connection failures are indeterminate and do not reflect transport details', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    throw new Error('connection reset included fake-contact@example.test');
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
    ),
    (error: unknown) => {
      assert.match(String(error), /create result is indeterminate.*do not retry/i);
      assert.doesNotMatch(String(error), /fake-contact|connection reset/i);
      return true;
    },
  );
});

test('terminal failed Exa runs preserve safe cost metadata and no-retry guidance', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_failed_paid', object: 'agent_run', status: 'failed',
      costDollars: { total: 0.012 },
    });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
    ),
    /agent_run_failed_paid.*terminal status failed.*Reported cost: \$0\.012.*do not retry/i,
  );
});

test('completed Exa runs with unusable output are explicitly non-retryable', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_invalid_output', object: 'agent_run', status: 'completed',
      output: { structured: { unexpected: 'fake-contact@example.test' }, grounding: [] },
      costDollars: { total: 0.032 },
    });
  };

  await assert.rejects(
    enrichProviderProfessionalContact(
      { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
      { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
    ),
    (error: unknown) => {
      assert.match(String(error), /agent_run_invalid_output.*completed.*Reported cost: \$0\.032.*do not retry/i);
      assert.doesNotMatch(String(error), /fake-contact/i);
      return true;
    },
  );
});

test('Exa no-match responses suppress contradictory contact fields', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_no_match', object: 'agent_run', status: 'completed',
      output: {
        structured: {
          match_status: 'no_match', identity_reason: 'The profile belongs to another person.',
          professional_profile_url: 'https://example.test/wrong-person',
          professional_email: 'wrong-person@example.test', professional_phone: '+1 555 0100',
          evidence_summary: 'No match; ignore wrong-person@example.test, +1 555 0100, https://example.test/wrong-person, and www.linkedin.com/in/wrong-person.',
        },
        grounding: [{ field: 'professional_profile_url', citations: [{ url: 'https://example.test/wrong-person' }] }],
      },
      usage: {}, costDollars: { total: 0.102 },
    });
  };

  const result = await enrichProviderProfessionalContact(
    { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
    { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
  );

  assert.deepEqual(result.professional_contact, {});
  assert.deepEqual(result.source_citations, []);
  assert.equal(result.identity_reason, 'Exa reported no identity match; no contact candidate was accepted.');
  assert.equal(result.evidence_summary, 'Exa returned 0 validated citation URLs for operator review.');
  assert.equal(result.contact_route_status, 'no_contact_candidate_found');
  assert.equal(result.identity_verification_status, 'operator_review_required');
});

test('Exa verified-match labels still require a usable source citation', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_ungrounded', object: 'agent_run', status: 'completed',
      output: {
        structured: {
          match_status: 'verified_match', identity_reason: 'The model reported a match.',
          professional_profile_url: 'https://example.test/unproven-profile',
          professional_email: null, professional_phone: null,
          evidence_summary: 'No citation was emitted.',
        },
        grounding: [{ url: 'https://' }, { field: 'https://example.test/not-a-citation' }],
      },
      usage: {}, costDollars: { total: 0.012 },
    });
  };

  const result = await enrichProviderProfessionalContact(
    { npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true },
    { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
  );

  assert.equal(result.match_status, 'verified_match');
  assert.equal(result.identity_verification_status, 'operator_review_required');
});

test('Exa enrichment suppresses contact types the operator did not request', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_unrequested_phone', object: 'agent_run', status: 'completed',
      output: { structured: {
        match_status: 'verified_match', identity_reason: 'Exact NPI match.',
        professional_profile_url: 'https://example.test/provider/4175550103?tracking=1#contact', professional_email: null,
        professional_phone: '+1 555 0100',
        evidence_summary: 'A phone was returned despite the email-only request.',
      }, grounding: [
        { url: 'https://example.test/provider/4175550104', snippet: 'Unrequested phone path.' },
        { url: 'https://registry.example.test/npi/1265049910', snippet: 'Known NPI path.' },
        { url: 'https://example.test/provider?record=1265049910', snippet: 'Query-dependent evidence is discarded.' },
      ] },
      costDollars: { total: 0.032 },
      usage: { searches: 1, debug: 'hidden-phone@example.test' },
    });
  };

  const result = await enrichProviderProfessionalContact(
    {
      npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true,
      contact_types: ['email'],
    },
    { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
  );

  assert.equal(result.professional_contact.phone, undefined);
  assert.equal(result.professional_contact.profile_url, undefined);
  assert.equal('current_affiliation' in result.professional_contact, false);
  assert.deepEqual(result.source_citations, [
    { url: 'https://registry.example.test/npi/1265049910' },
  ]);
  assert.deepEqual(result.usage, { searches: 1 });
  assert.equal(result.contact_route_status, 'no_contact_candidate_found');
});

test('Exa enrichment rejects multi-number phone values and normalizes grounding records', async () => {
  const fetchFn: typeof fetch = async (input) => {
    if (String(input).includes('/api/abundance/healthcare-providers/nationwide')) {
      return Response.json({ success: true, data: {
        report,
        providers: [{ npi: '1265049910', name: 'Jane Test Provider', source_fetched_at: '2026-09-02T01:39:07.502Z' }],
        readiness: [], total: 1, limit: 1, offset: 0,
      } } satisfies HealthcareApiResponse);
    }
    return Response.json({
      id: 'agent_run_placeholder_phone', object: 'agent_run', status: 'completed',
      output: { structured: {
        match_status: 'verified_match', identity_reason: 'Exact NPI match.',
        professional_profile_url: 'https://example.test/provider-profile', professional_email: null,
        professional_phone: '5550100 / 5550199',
        evidence_summary: 'A professional profile was located without a usable phone.',
      }, grounding: [null, 'invalid citation', { url: 'https://example.test/provider-profile' }] },
      costDollars: { total: 0.082 },
    });
  };

  const result = await enrichProviderProfessionalContact(
    {
      npi: '1265049910', purpose: 'recruiting_outreach', confirm_paid_enrichment: true,
      contact_types: ['phone'],
    },
    { agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn },
  );

  assert.equal(result.professional_contact.phone, undefined);
  assert.equal(result.contact_route_status, 'no_contact_candidate_found');
  assert.equal(result.identity_verification_status, 'source_grounded');
  assert.deepEqual(result.source_citations, [{ url: 'https://example.test/provider-profile' }]);
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

test('MCP discovery advertises the registry-first contact tools and paid fallback boundary', async (t) => {
  const fetchFn: typeof fetch = async () => Response.json({ success: true, data: {
    report,
    providers: [{
      npi: '1265049910', enumeration_type: 'NPI-1', name: 'Jane Test Provider',
      practice_phone: '4175550100', source_system: 'nppes_npi_registry_v2_1',
      source_fetched_at: '2026-09-02T01:39:07.502Z',
    }],
    readiness: [], total: 1, limit: 1, offset: 0,
  } } satisfies HealthcareApiResponse);
  const server = createAbundanceHealthcareServer({ agencyApiKey: 'test-key', exaApiKey: 'exa-test-key', fetchFn });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'healthcare-mcp-test', version: '1.0.0' });
  await client.connect(clientTransport);
  t.after(async () => {
    await client.close();
    await server.close();
  });

  const tools = (await client.listTools()).tools;
  const registryTool = tools.find((tool) => tool.name === 'get_provider_contact_information');
  const enrichmentTool = tools.find((tool) => tool.name === 'enrich_provider_professional_contact');
  assert.ok(registryTool?.outputSchema);
  assert.equal(registryTool.annotations?.readOnlyHint, true);
  assert.equal(registryTool.annotations?.openWorldHint, false);
  assert.ok(enrichmentTool?.outputSchema);
  assert.equal(enrichmentTool.annotations?.readOnlyHint, false);
  assert.equal(enrichmentTool.annotations?.idempotentHint, false);
  assert.equal(enrichmentTool.annotations?.openWorldHint, true);
  assert.deepEqual(
    enrichmentTool.inputSchema.properties?.confirm_paid_enrichment,
    { type: 'boolean', const: true },
  );
  const result = await client.callTool({
    name: 'get_provider_contact_information',
    arguments: { npi: '1265049910', purpose: 'recruiting_outreach' },
  });
  assert.equal(result.isError, undefined);
  assert.equal((result.structuredContent as Record<string, unknown>).outreach_authority_status, 'not_established');
});
