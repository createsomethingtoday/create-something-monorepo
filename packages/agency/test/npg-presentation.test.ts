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
test('summary uses supplied maximum and currency, preserving fractional amounts', () => {
  const summary = decisionSummary(pending({ maximumCost: 0.007, currency: 'USD' }), []);
  assert.equal(summary.price, '$0.007 USD');
  assert.equal(summary.priceLabel, 'Maximum');
  assert.equal(decisionSummary(pending({ maximumCost: 0.1 }), []).price, 'See terms');
  assert.equal(
    decisionSummary(pending({ maximumCost: Infinity, currency: 'USD' }), []).price,
    'See terms'
  );
});
test('Skip Trace cost cap comes from exact supplied prose, never the tool name', () => {
  assert.equal(
    decisionSummary(pending({ cost: 'Up to $0.10 reserved. Contacts remain unverified.' }), [])
      .price,
    '$0.10'
  );
  assert.equal(
    decisionSummary(pending({ cost: 'Up to $0.20 reserved. Conditions apply.' }), []).price,
    '$0.20'
  );
  assert.equal(decisionSummary(pending({}), []).price, 'See terms');
  assert.equal(
    decisionSummary(pending({ cost: 'Exact cost unavailable. May spend routing credits.' }), [])
      .price,
    'Not quoted'
  );
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
