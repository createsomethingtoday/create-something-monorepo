import assert from 'node:assert/strict';
import test from 'node:test';
import { decisionSummary, registryName } from '../src/lib/npg/astryx/presentation';
import type { NpgView } from '../src/lib/npg/display';
const registry = (npi: string, name: string) => ({
  tool: 'search_registry_sourcing',
  data: { results: [{ npi, name }] }
});
const pending = (
  review: unknown,
  args: unknown = { npi: '1234567890' }
): NonNullable<NpgView['pending']> => ({
  id: 'action',
  tool: 'enrich_candidate_skip_trace',
  arguments: args,
  review,
  expiresAt: Date.now() + 60000
});

test('registry identity requires the exact selected NPI and excludes vendor or conflicting names', () => {
  assert.equal(
    registryName('1234567890', [registry('1234567890', 'Jamie Example')]),
    'Jamie Example'
  );
  assert.equal(registryName('1234567890', [registry('9999999999', 'Wrong person')]), null);
  assert.equal(
    registryName('1234567890', [
      { ...registry('1234567890', 'Vendor name'), tool: 'enrich_candidate_skip_trace' }
    ]),
    null
  );
  assert.equal(
    registryName('1234567890', [
      registry('1234567890', 'Jamie Example'),
      registry('1234567890', 'Different name')
    ]),
    null
  );
});
test('summary shows estimates without a maximum cost claim', () => {
  const summary = decisionSummary(pending({ estimatedUsd: 0.2, currency: 'USD' }), []);
  assert.equal(summary.price, '$0.20 USD');
  assert.equal(summary.priceLabel, 'Estimate');
  assert.equal(
    decisionSummary(pending({ maximumCost: 100, currency: 'USD' }), []).price,
    'Unknown'
  );
  assert.equal(decisionSummary(pending({ estimatedUsd: null }), []).price, 'Unknown');
});
test('multi-target review stays bounded and never presents one record as the whole request', () => {
  const summary = decisionSummary(pending({}, { npis: ['1234567890', '9999999999'] }), [
    registry('1234567890', 'Jamie Example')
  ]);
  assert.equal(summary.target, '2 selected NPIs');
  assert.equal(summary.name, null);
});

test('evidence summary prioritizes literal limitations and source-declared warnings', async () => {
  const { evidenceFieldLabel, evidenceGroups } = await import('../src/lib/npg/astryx/presentation');
  const fields = [
    { label: 'Coverage · persona · taxonomy code', value: '363LF0000X' },
    { label: 'Coverage · market coverage status', value: 'degraded' },
    { label: 'Coverage · direct outreach status', value: 'blocked' },
    { label: 'Coverage · limitations · 1', value: 'Certification unknown' },
    { label: 'Coverage · source · latest fetched at', value: '2026-09-14' },
    { label: 'Unknown · future field', value: 'not_supplied' }
  ];
  const before = JSON.stringify(fields);
  const groups = evidenceGroups(fields);
  assert.equal(groups.summary[0].value, 'Certification unknown');
  assert.deepEqual(groups.warnings, [
    'Source reports degraded coverage',
    'Source reports blocked direct outreach'
  ]);
  assert.equal(groups.details[0].value, '363LF0000X');
  assert.equal(groups.dates[0].value, '2026-09-14');
  assert.equal(evidenceFieldLabel(fields[1].label), 'Coverage status');
  assert.equal(evidenceFieldLabel('Unknown · future field'), 'Unknown · future field');
  assert.equal(groups.summary.at(-1)?.value, 'not_supplied');
  assert.deepEqual(
    [...groups.summary, ...groups.dates, ...groups.details].sort((a, b) =>
      a.label.localeCompare(b.label)
    ),
    [...fields].sort((a, b) => a.label.localeCompare(b.label)),
    'Every field survives exactly once across groups'
  );
  assert.deepEqual(
    evidenceGroups([
      { label: 'Unknown · market coverage status', value: 'degraded' },
      { label: 'Coverage · direct outreach status', value: 'unknown' },
      { label: 'Coverage · market coverage status', value: 'Degraded' }
    ]).warnings,
    [],
    'Warnings require exact known source fields and supplied states'
  );
  assert.equal(JSON.stringify(fields), before, 'Presentation must not mutate source facts');
});

test('four-provider result is visible and keeps billing separate from results', async () => {
  const { enrichmentSummary } = await import('../src/lib/npg/astryx/presentation');
  const result = enrichmentSummary([
    {
      tool: 'enrich_candidate_complete_profile',
      data: {
        npi: '1234567890',
        status: 'partial',
        providers: {
          pdl: {
            status: 'matched',
            professional: { job_title: 'NP' },
            personal_contact: { personal_emails: ['one@example.invalid'], phone_numbers: ['+15555550100'] }
          },
          clay: { status: 'pending' },
          exa: {
            match_status: 'verified_match',
            professional_contact: { email: 'two@example.invalid', phone: '123' }
          },
          apify: { status: 'blocked_review', reason: 'Identity, fallback or response association requires review.' }
        },
        spend_tracking: { actual_usd: 0.2, pending_receipts: 2, historical_status: 'unknown' }
      }
    }
  ])!;
  assert.equal(result.rows.length, 3);
  assert.deepEqual(
    result.rows.map((row) => row.outcome),
    ['Returned', 'Returned', 'Identity review']
  );
  assert.match(result.rows[0].summary, /1 email.*1 phone/);
  assert.deepEqual(result.rows.map(row => row.key), ['pdl', 'exa', 'apify']);
  assert.equal(result.complete, false);
  assert.match(result.rows[1].summary, /1 email.*1 phone/);
  assert.match(result.rows[2].summary, /identity/i);
  assert.match(result.billing, /\$0.20 USD.*2.*pending/);
  assert.match(result.billing, /historical.*unknown/i);
  assert.equal(enrichmentSummary([]), null);
});

test('PDL summary counts real personal-contact fields once and ignores empty or masked values', async () => {
  const { enrichmentSummary } = await import('../src/lib/npg/astryx/presentation');
  const summarize = (personal_contact: unknown, work_email?: string) => enrichmentSummary([{
    tool: 'enrich_candidate_complete_profile',
    data: { providers: { pdl: { status: 'matched', personal_contact, ...(work_email ? { professional: { work_email } } : {}) } } }
  }])!.rows[0].summary;
  assert.equal(summarize({
    personal_emails: ['one@example.invalid', 'two@example.invalid', 'one@example.invalid'],
    recommended_personal_email: ' ONE@example.invalid ',
    phone_numbers: ['+15555550100', '+15555550101', '+15555550100'],
    mobile_phone: '+15555550100'
  }), '2 emails · 2 phones');
  assert.equal(summarize({
    personal_emails: [], recommended_personal_email: 'one@example.invalid',
    phone_numbers: [], mobile_phone: '+15555550100'
  }), '1 email · 1 phone');
  assert.equal(summarize({
    personal_emails: [null, false, ''], recommended_personal_email: null,
    phone_numbers: [true, ' '], mobile_phone: false
  }), '0 emails · 0 phones');
  assert.equal(summarize({ personal_emails: ['one@example.invalid'] }, 'ONE@example.invalid'),
    'Profile returned · 1 email · 0 phones');
  assert.equal(summarize({}, 'work@example.invalid'), 'Profile returned · 1 email · 0 phones');
});

test('later chat stays visible and blocked outcomes stay explicit', async () => {
  const { isLegacyEnrichmentMessage, enrichmentSummary } =
    await import('../src/lib/npg/astryx/presentation');
  assert.equal(
    isLegacyEnrichmentMessage({
      role: 'assistant',
      text: 'The complete profile is incomplete. Review each provider’s result and any unstarted providers below. Billing and pending results need reconciliation.'
    }),
    true
  );
  assert.equal(
    isLegacyEnrichmentMessage({
      role: 'assistant',
      text: 'The complete profile is incomplete for a different reason; here is my specific answer.'
    }),
    false
  );
  assert.equal(
    isLegacyEnrichmentMessage({ role: 'user', text: 'What email did Exa return?' }),
    false
  );
  assert.equal(
    isLegacyEnrichmentMessage({ role: 'assistant', text: 'Exa returned one email for review.' }),
    false
  );
  for (const state of [
    'association_failure',
    'blocked_review',
    'privacy_blocked_review',
    'failed',
    'unavailable'
  ]) {
    const row = enrichmentSummary([
      {
        tool: 'enrich_candidate_complete_profile',
        data: { providers: { apify: { status: state } } }
      }
    ])!.rows[2];
    assert.match(row.summary, /review/);
    assert.doesNotMatch(row.summary, /0 emails/);
  }
});

test('aborted and cancelled provider outcomes never appear returned', async () => {
  const { enrichmentSummary } = await import('../src/lib/npg/astryx/presentation');
  for (const status of ['provider_aborted', 'cancelled', 'canceled', 'failed']) {
    const row = enrichmentSummary([
      { tool: 'enrich_candidate_complete_profile', data: { providers: { apify: { status } } } }
    ])!.rows[2];
    assert.equal(row.outcome, 'Needs review');
    assert.match(row.summary, /stopped|unavailable/i);
    assert.doesNotMatch(row.summary, /0 emails/);
  }
});

test('lookup completion is distinct from pending results and identity review', async () => {
  const { enrichmentSummary } = await import('../src/lib/npg/astryx/presentation');
  const summary = (state: string, uncertain = false) =>
    enrichmentSummary([
      {
        tool: 'enrich_candidate_complete_profile',
        data: {
          providers: Object.fromEntries(
            ['pdl', 'clay', 'exa', 'apify'].map((key) => [key, { status: state }])
          ),
          uncertain_dispatch: uncertain,
          unstarted: []
        }
      }
    ])!;
  assert.equal(summary('no_match').complete, true);
  assert.equal(summary('pending').complete, false);
  assert.equal(summary('association_failure').complete, false);
  assert.equal(summary('no_match', true).complete, false);
});

test('unknown, ambiguous, unstarted and partial composites cannot claim lookup complete', async () => {
  const { enrichmentSummary } = await import('../src/lib/npg/astryx/presentation');
  const summarize = (state: string, extra = {}) =>
    enrichmentSummary([
      {
        tool: 'enrich_candidate_complete_profile',
        data: {
          providers: Object.fromEntries(
            ['pdl', 'clay', 'exa', 'apify'].map((key) => [key, { status: state }])
          ),
          ...extra
        }
      }
    ])!;
  for (const state of ['ambiguous', 'not_attempted', 'future_state', 'billing_review']) {
    const result = summarize(state);
    assert.equal(result.complete, false, state);
    assert.equal(result.rows[0].outcome, 'Needs review', state);
  }
  assert.equal(summarize('no_match', { status: 'partial' }).complete, false);
  assert.equal(summarize('matched', { status: 'blocked' }).complete, false);
  assert.equal(summarize('matched', { unstarted: ['clay'] }).complete, false);
  assert.equal(summarize('matched', { status: 'complete', unstarted: [] }).complete, true);
  const exa = enrichmentSummary([
    {
      tool: 'enrich_candidate_complete_profile',
      data: { providers: { exa: { match_status: 'verified_match' } } }
    }
  ])!;
  assert.equal(exa.rows[1].outcome, 'Returned');
  assert.equal(exa.complete, false, 'Missing other providers stay incomplete');
});

 test('three-provider results omit retired Clay without rewriting historical failures', async () => {
  const { enrichmentSummary, decisionSummary } = await import('../src/lib/npg/astryx/presentation');
  const providers = { pdl: {status:'no_match'}, exa: {status:'complete'}, apify: {status:'no_contact'}, clay: {status:'unavailable', availability:'disabled'} };
  const summarize = (extra = {}, clay = providers.clay) => enrichmentSummary([{tool:'enrich_candidate_complete_profile', data:{status:'complete', active_providers:['pdl','exa','apify'], providers:{...providers,clay}, ...extra}}])!;
  assert.equal(summarize().complete, true);
  assert.deepEqual(summarize().rows.map(row => row.key), ['pdl','exa','apify']);
  assert.equal(summarize({}, {status:'unavailable', availability:'unknown'}).complete, true);
  assert.equal(summarize({active_providers: undefined}).complete, false);
  assert.equal(summarize({active_providers:['pdl','future','apify']}).complete, false);
  const pending = {tool:'enrich_candidate_complete_profile', arguments:{npi:'1234567890'}, review:{providers:['pdl','exa','apify']}} as any;
  assert.equal(decisionSummary(pending, []).title, 'Complete profile · three providers');
  assert.equal(decisionSummary({...pending, review:{}}, []).title, 'Complete profile · four providers');
});
