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
