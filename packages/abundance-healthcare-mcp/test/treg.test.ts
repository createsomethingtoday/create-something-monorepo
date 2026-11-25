import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runTregContact, tregIdentity } from '../src/treg.js';
const evidence = {
  npi: '1234567890',
  profile_url: 'https://www.linkedin.com/in/example-person',
  source_url: 'https://www.linkedin.com/in/example-person'
};
const input = {
  npi: evidence.npi,
  first: 'Example',
  last: 'Person',
  operation_id: 'approved-operation',
  evidence
};
test('reject guessed domain and mismatched NPI before dispatch', () => {
  assert.throws(() =>
    tregIdentity(input.npi, input.first, input.last, { ...evidence, npi: '9999999999' })
  );
  assert.throws(() =>
    tregIdentity(input.npi, input.first, input.last, {
      npi: input.npi,
      domain: 'guessed.example',
      source_url: 'https://directory.example/profile'
    })
  );
});
test('routed calls retain settled headers and discard raw personal fields', async () => {
  const requests: any[] = [];
  const fetchFn = (async (url: any, init: any) => {
    requests.push({ url, init });
    return new Response(
      JSON.stringify({
        output: { phone: '+1 212 555 0101', email: 'example@example.org', line_type: 'mobile' },
        raw: { secret: 'discard' },
        _treg: { served_by: 'provider', verification: { verdict: 'valid', checked: true } }
      }),
      { headers: { 'X-Treg-Call-Id': 'call-' + requests.length, 'X-Treg-Cost-Micro': '1500' } }
    );
  }) as typeof fetch;
  const r = await runTregContact(input, { token: 'fake', fetchFn });
  assert.equal(requests.length, 2);
  assert.equal(r.actual_cost_usd, 0.003);
  assert.equal(r.contacts.phone.verification.line_type, 'mobile');
  assert.equal(requests[0].init.headers['X-Treg-Route-Verify'], 'true');
  assert.equal(requests[1].init.headers['Idempotency-Key'], 'approved-operation:email');
  assert.equal(JSON.stringify(r).includes('discard'), false);
});
test('pending verification preserves receipt as unknown settlement', async () => {
  const fetchFn = (async () =>
    new Response(
      JSON.stringify({
        output: { phone: '+12125550101' },
        _treg: { verification: { pending: true, async: { task_id: 'task' } } }
      }),
      { headers: { 'X-Treg-Call-Id': 'call', 'X-Treg-Cost-Micro': '1200' } }
    )) as typeof fetch;
  const r = await runTregContact(input, { token: 'fake', fetchFn });
  assert.equal(r.actual_cost_usd, null);
  assert.equal(r.contacts.phone.receipt.reported_usd, 0.0012);
  assert.equal(r.contacts.phone.receipt.settled, false);
});
test('malformed and failed responses preserve header receipts without inventing charge', async () => {
  const fetchFn = (async () =>
    new Response('not-json', {
      status: 502,
      headers: { 'X-Treg-Call-Id': 'known-call', 'X-Treg-Cost-Micro': '1200' }
    })) as typeof fetch;
  const r = await runTregContact(input, { token: 'fake', fetchFn });
  assert.equal(r.status, 'partial');
  assert.equal(r.contacts.phone.receipt.call_id, 'known-call');
  assert.equal(r.actual_cost_usd, null);
});
test('strict domain option and mailbox check reject off-domain result', async () => {
  const fetchFn = (async (_url: any, init: any) => {
    assert.equal(init.headers['X-Treg-Route-Domain-Match'] ?? 'strict', 'strict');
    return new Response(JSON.stringify({ output: { email: 'person@wrong.example' } }), {
      headers: { 'X-Treg-Call-Id': 'call', 'X-Treg-Cost-Micro': '0' }
    });
  }) as typeof fetch;
  const r = await runTregContact(
    {
      ...input,
      evidence: {
        npi: input.npi,
        domain: 'employer.example',
        source_url: 'https://employer.example/staff/example'
      }
    },
    { token: 'fake', fetchFn }
  );
  assert.equal(r.contacts.email.status, 'not_found');
  assert.equal(r.contacts.email.value, undefined);
});

test('practice domain needs exact verified NPI and grounded staff page', async () => {
  const { tregEvidenceFromExa } = await import('../src/treg.js');
  const exa = {
    provider: { npi: input.npi },
    match_status: 'verified_match',
    identity_verification_status: 'source_grounded',
    employer_identity: {
      domain: 'practice.example',
      source_url: 'https://practice.example/providers/example-person'
    },
    source_citations: [{ url: 'https://practice.example/providers/example-person' }]
  };
  assert.equal(tregEvidenceFromExa(input.npi, exa)?.domain, 'practice.example');
  assert.equal(tregEvidenceFromExa('9999999999', exa), undefined);
  assert.equal(tregEvidenceFromExa(input.npi, { ...exa, source_citations: [] }), undefined);
  assert.equal(
    tregEvidenceFromExa(input.npi, {
      ...exa,
      employer_identity: { ...exa.employer_identity, domain: 'other.example' }
    }),
    undefined
  );
  assert.equal(
    tregEvidenceFromExa(input.npi, { ...exa, match_status: 'plausible_match' }),
    undefined
  );
});

test('public entry rejects replayed paid claim before Treg network dispatch', async () => {
  const { enrichTregContact } = await import('../src/index.js');
  let calls = 0;
  const fetchFn = (async (url: any, init: any) => {
    if (String(url).includes('enrichment-budget')) {
      const body = JSON.parse(init.body);
      if (body.action === 'claim')
        return Response.json({ success: true, data: { claimed: false } });
      return Response.json({
        success: true,
        data: {
          id: 'receipt',
          grants: { treg: { id: 'receipt', provider: 'treg', npi: input.npi, token: 'opaque' } }
        }
      });
    }
    if (String(url).includes('treg.to')) {
      calls++;
      throw Error('must not dispatch');
    }
    return Response.json({
      success: true,
      data: {
        report: {},
        providers: [
          { npi: input.npi, name: 'Example Person', first_name: 'Example', last_name: 'Person' }
        ],
        readiness: []
      }
    });
  }) as typeof fetch;
  await assert.rejects(() =>
    enrichTregContact(
      {
        npi: input.npi,
        operation_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        confirm_paid_enrichment: true
      },
      { agencyApiKey: 'fake', tregToken: 'fake', fetchFn, tregIdentity: async () => evidence }
    )
  );
  assert.equal(calls, 0);
});

test('independent calls start together and retain known subtotal when email fails', async () => {
  let phoneStarted = false;
  let emailStarted = false;
  const fetchFn = (async (url: any) => {
    if (String(url).includes('phone')) {
      phoneStarted = true;
      await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(emailStarted, true);
      return Response.json(
        { output: { phone: '+12125550101' } },
        { headers: { 'X-Treg-Call-Id': 'phone-receipt', 'X-Treg-Cost-Micro': '1500' } }
      );
    }
    emailStarted = true;
    assert.equal(phoneStarted, true);
    throw Error('lost email response');
  }) as typeof fetch;
  const r = await runTregContact(input, { token: 'fake', fetchFn });
  assert.equal(r.actual_cost_usd, null);
  assert.equal(r.confirmed_subtotal_usd, 0.0015);
  assert.equal(r.pending_receipts, 1);
  assert.equal(r.contacts.phone.value, '+12125550101');
});
test('invalid or pending verified email is never emitted as usable value', async () => {
  for (const verification of [
    { verdict: 'invalid', checked: true },
    { verdict: 'valid', pending: true }
  ]) {
    const fetchFn = (async () =>
      Response.json(
        { output: { email: 'person@practice.example' }, _treg: { verification } },
        { headers: { 'X-Treg-Call-Id': 'receipt', 'X-Treg-Cost-Micro': '5' } }
      )) as typeof fetch;
    const r = await runTregContact(input, { token: 'fake', fetchFn });
    assert.equal(r.contacts.email.value, undefined);
  }
});
