import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichCompleteProfile,
  enrichCandidateProfile,
  enrichProviderProfessionalContact
} from '../src/index.js';
function fixture(blocked = false, failPdl = false, cachedClay = false) {
  const events: string[] = [];
  let reserved = false;
  const npi = '1234567893';
  const registry = {
    npi,
    name: 'Jordan Test',
    first_name: 'Jordan',
    last_name: 'Test',
    practice_city: 'Albany',
    practice_state: 'NY'
  };
  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/api/abundance/enrichment-budget') {
      if (init?.method === 'GET')
        return Response.json({
          success: true,
          data: {
            provider: url.searchParams.get('provider'),
            ready: !blocked,
            spend: { currency: 'USD', confirmed_usd: 0, historical_usd: null, history_complete: false, pending_count: 0 },
            cost: { estimated_usd: null }
          }
        });
      const body = JSON.parse(String(init?.body));
      if (body.action === 'record') {
        events.push(`record:${body.grant.provider}`);
        return Response.json({ success: true, data: { recorded: true } });
      }
      if (body.action === 'claim') {
        assert.equal(reserved, true);
        events.push(`claim:${body.grant.provider}`);
        return Response.json({ success: true, data: { claimed: true } });
      }
      assert.equal(reserved, false);
      reserved = true;
      events.push('reserve');
      return Response.json({
        success: true,
        data: {
          id: 'f'.repeat(64),
          grants: Object.fromEntries(
            ['pdl', 'clay', 'exa', 'apify'].map((provider) => [
              provider,
              { id: 'f'.repeat(64), provider, npi, token: 'secret-fixture-grant' }
            ])
          )
        }
      });
    }
    if (url.pathname === '/api/abundance/healthcare-providers/enrichment') {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.budget_grant.provider, 'clay');
      events.push('clay');
      return Response.json({ success: true, data: { id: 'npgclay_fixture', status: 'pending', cache_hit: cachedClay } });
    }
    if (url.hostname === 'api.exa.ai') {
      events.push('exa');
      return Response.json({
        id: 'run_fixture',
        status: 'completed',
        output: {
          structured: {
            match_status: 'no_match',
            identity_reason: 'No confirmed match',
            professional_email: null,
            professional_phone: null,
            professional_profile_url: null,
            evidence_summary: null
          }
        },
        costDollars: { total: 0.05 }
      });
    }
    return Response.json({
      success: true,
      data: {
        report: {
          evaluated_at: 'now',
          source: {},
          recruiting_pipeline: {},
          persona: {},
          market_coverage_status: 'x',
          direct_outreach_status: 'blocked',
          provider_count: 1
        },
        providers: [registry],
        readiness: [],
        total: 1,
        limit: 1,
        offset: 0
      }
    });
  };
  const options: any = {
    skipTraceReadiness: async () => ({ ready: true }),
    agencyApiKey: 'fixture',
    exaApiKey: 'fixture',
    fetchFn,
    pdlEnrich: async () => {
      events.push('pdl');
      if (failPdl) throw Error('unknown');
      return {
        status: 'matched',
        professional: { job_title: 'Nurse practitioner' },
        personal_contact: { personal_emails: ['test@example.test'] }
      };
    },
    skipTrace: async () => {
      events.push('apify');
      return { status: 'review_required', charge_reconciled: true, emails: ['test@example.test'] };
    }
  };
  return { options, events, npi };
}
test('combined profile reserves before all four calls and retains provenance without grants', async () => {
  const f = fixture();
  const r = await enrichCompleteProfile(
    {
      npi: f.npi,
      confirm_paid_enrichment: true,
      operation_id: '11111111-1111-4111-8111-111111111111'
    },
    f.options
  );
  assert.deepEqual(
    f.events.filter((e) => !e.startsWith('record:')),
    ['reserve', 'claim:pdl', 'pdl', 'clay', 'claim:exa', 'exa', 'claim:apify', 'apify']
  );
  assert.equal(r.status, 'partial');
  assert.equal(r.uncertain_dispatch, false);
  assert.deepEqual(r.unstarted, []);
  assert.deepEqual(Object.keys(r.providers!), ['pdl', 'clay', 'exa', 'apify']);
  assert.equal(JSON.stringify(r).includes('secret-fixture-grant'), false);
  assert.equal(r.billing_reconciliation_required, true);
});
test('unknown prices and historical billing do not block all four provider attempts', async () => {
  const f = fixture(true);
  const r = await enrichCompleteProfile(
    {
      npi: f.npi,
      confirm_paid_enrichment: true,
      operation_id: '11111111-1111-4111-8111-111111111111'
    },
    f.options
  );
  assert.deepEqual(Object.keys(r.providers), ['pdl', 'clay', 'exa', 'apify']);
  assert.equal(r.spend_tracking.historical_status, 'unknown');
  assert.equal(r.spend_tracking.pending_receipts, 3);
});
test('uncertain first provider retains its receipt and continues every other provider', async () => {
  const f = fixture(false, true);
  const r = await enrichCompleteProfile(
    {
      npi: f.npi,
      confirm_paid_enrichment: true,
      operation_id: '11111111-1111-4111-8111-111111111111'
    },
    f.options
  );
  assert.equal(r.uncertain_dispatch, true);
  assert.deepEqual(r.unstarted, []);
  assert.ok(f.events.includes('apify'));
  assert.deepEqual(Object.keys(r.providers), ['pdl', 'clay', 'exa', 'apify']);
  assert.ok(r.spend_tracking.operation_id);
});
test('direct PDL and Exa callers cannot bypass shared budget', async () => {
  for (const provider of ['pdl', 'exa']) {
    const f = fixture();
    const original = f.options.fetchFn;
    f.options.fetchFn = async (input: any, init: any) =>
      new URL(String(input)).pathname === '/api/abundance/enrichment-budget'
        ? new Response('{}', { status: 409 })
        : original(input, init);
    await assert.rejects(
      provider === 'pdl'
        ? enrichCandidateProfile({ npi: f.npi, confirm_paid_enrichment: true }, f.options)
        : enrichProviderProfessionalContact(
            { npi: f.npi, confirm_paid_enrichment: true, purpose: 'recruiting_outreach' },
            f.options
          )
    );
    assert.deepEqual(f.events, []);
  }
});

test('blocked Skip Trace privacy preflight leaves other three available', async () => {
  const f = fixture();
  f.options.skipTraceReadiness = async () => ({ ready: false, reason: 'privacy blocked' });
  const r = await enrichCompleteProfile(
    {
      npi: f.npi,
      confirm_paid_enrichment: true,
      operation_id: '11111111-1111-4111-8111-111111111111'
    },
    f.options
  );
  assert.equal(r.status, 'partial');
  assert.equal(f.events.includes('pdl'), true);
  assert.equal(f.events.includes('exa'), true);
  assert.equal(f.events.includes('apify'), false);
  assert.equal(r.providers.apify.status, 'unavailable');
});

test('a replayed approved operation cannot dispatch again', async () => {
  const f = fixture();
  const input = {
    npi: f.npi,
    confirm_paid_enrichment: true as const,
    operation_id: '11111111-1111-4111-8111-111111111111'
  };
  await enrichCompleteProfile(input, f.options);
  const calls = f.events.filter((e) => ['pdl', 'clay', 'exa', 'apify'].includes(e)).length;
  await assert.rejects(() => enrichCompleteProfile(input, f.options));
  assert.equal(f.events.filter((e) => ['pdl', 'clay', 'exa', 'apify'].includes(e)).length, calls);
});
test('missing PDL configuration records known zero and still attempts other providers', async () => {
  const f = fixture();
  delete f.options.pdlEnrich;
  const r = await enrichCompleteProfile(
    {
      npi: f.npi,
      confirm_paid_enrichment: true,
      operation_id: '11111111-1111-4111-8111-111111111111'
    },
    f.options
  );
  assert.equal(r.providers.pdl.status, 'unavailable');
  assert.equal(f.events.includes('pdl'), false);
  assert.equal(f.events.includes('claim:pdl'), true);
  assert.equal(f.events.includes('record:pdl'), true);
  assert.equal(f.events.includes('exa'), true);
  assert.equal(f.events.includes('apify'), true);
});
test('failed receipt write retains provider results and confirmed vendor charge', async () => {
  const f = fixture();
  const original = f.options.fetchFn;
  f.options.fetchFn = async (input: any, init: any) => {
    if (
      new URL(String(input)).pathname === '/api/abundance/enrichment-budget' &&
      init?.method === 'POST' &&
      JSON.parse(String(init.body)).action === 'record'
    )
      return new Response('{}', { status: 503 });
    return original(input, init);
  };
  const r = await enrichCompleteProfile(
    {
      npi: f.npi,
      confirm_paid_enrichment: true,
      operation_id: '11111111-1111-4111-8111-111111111111'
    },
    f.options
  );
  assert.equal(r.providers.pdl.status, 'matched');
  assert.equal(r.providers.exa.actual_cost_usd, 0.05);
  assert.equal(r.providers.exa.spend_tracking.recorded, false);
  assert.equal(r.spend_tracking.actual_usd, 0.05);
  assert.equal(f.events.includes('apify'), true);
});
test('public Exa MCP output validates nullable estimates and receipt tracking', async () => {
  const { createAbundanceHealthcareServer } = await import('../src/index.js');
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const f = fixture();
  const server = createAbundanceHealthcareServer(f.options);
  const client = new Client({ name: 'spend-output', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  try {
    // Individual reservation fixture has the same one-use contract as a complete bundle.
    const result = await client.callTool({
      name: 'enrich_provider_professional_contact',
      arguments: { npi: f.npi, purpose: 'recruiting_outreach', confirm_paid_enrichment: true }
    });
    assert.equal(result.isError, undefined);
    assert.equal((result.structuredContent as any).estimated_cost_usd, null);
    assert.equal((result.structuredContent as any).actual_cost_usd, 0.05);
  } finally {
    await client.close();
    await server.close();
  }
});

test('cached Clay adds no pending charge to the current operation', async () => {
  const { options, npi } = fixture(false, false, true);
  const result = await enrichCompleteProfile({npi,confirm_paid_enrichment:true,operation_id:crypto.randomUUID()},options);
  assert.equal(result.spend_tracking.actual_usd, 0.05);
  assert.equal(result.spend_tracking.pending_receipts, 2);
});

test('Skip Trace preserves original operation charge attribution for later receipt refresh', async () => {
  for (const cached of [false, true]) {
    const { options, npi } = fixture();
    options.skipTrace = async () => ({ status: 'review_required', cached, charge_usd: 0.007, charge_reconciled: true });
    const result = await enrichCompleteProfile({npi,confirm_paid_enrichment:true,operation_id:crypto.randomUUID()},options);
    assert.equal(result.providers.apify.operation_cache_hit, cached);
    assert.equal(result.providers.apify.operation_charge_usd, cached ? 0 : 0.007);
  }
});

for (const status of ['association_failure', 'privacy_blocked_review', 'billing_review']) {
  test(`combined Skip Trace ${status} requires reconciliation`, async () => {
    const f = fixture();
    const original = f.options.fetchFn;
    f.options.fetchFn = async (input: any, init: any) =>
      new URL(String(input)).pathname === '/api/abundance/healthcare-providers/enrichment'
        ? Response.json({success:true,data:{id:'npgclay_fixture',status:'complete',cache_hit:true}})
        : original(input,init);
    f.options.skipTrace = async () => ({status,charge_reconciled:false,charge_usd:0.007});
    const result = await enrichCompleteProfile({npi:f.npi,confirm_paid_enrichment:true,operation_id:crypto.randomUUID()},f.options);
    assert.equal(result.status, 'partial');
    assert.equal(result.uncertain_dispatch, true);
    assert.equal(result.providers.apify.status,status);
    assert.deepEqual(Object.keys(result.providers),['pdl','clay','exa','apify']);
  });
}
