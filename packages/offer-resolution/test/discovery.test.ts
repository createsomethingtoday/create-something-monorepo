import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATEGORY_MERCHANTS,
  normalizeOfferRequest,
  planOfferDiscovery,
  type OfferRequest
} from '../src/index.js';

const categoryRequest: OfferRequest = {
  merchant: 'Health & Beauty',
  searchCategory: 'health_and_beauty',
  need: 'health and beauty products',
  budget: 100,
  currency: 'USD',
  postalCode: '76060',
  deadline: '2026-08-09',
  asOf: '2026-07-29T18:00:00.000Z',
  channels: ['online', 'pickup']
};

test('expands health and beauty into a bounded merchant fan-out', () => {
  const normalized = normalizeOfferRequest(categoryRequest);

  assert.deepEqual(normalized.candidateMerchants, CATEGORY_MERCHANTS.health_and_beauty);
  assert.deepEqual(normalized.candidateMerchants, [
    'Ulta Beauty',
    'Sephora',
    'CVS Pharmacy',
    'Walgreens',
    'Target',
    'OSEA'
  ]);
});

test('creates an LTK-first plan and keeps supplemental discovery second', () => {
  const plan = planOfferDiscovery(categoryRequest);

  assert.equal(plan.policyVersion, 'offer_discovery_ltk_first.v0.1');
  assert.deepEqual(
    plan.stages.map((stage) => [stage.lane, stage.ordinal]),
    [
      ['ltk', 1],
      ['supplemental', 2]
    ]
  );
  assert.deepEqual(plan.stages[0].domains, ['shopltk.com']);
  assert.match(plan.stages[0].instructions, /posts.*profiles.*captions.*product links/i);
  assert.match(plan.stages[0].instructions, /Copy Promo Code/i);
  assert.match(plan.stages[1].instructions, /corroborat/i);
  assert.match(plan.stages[1].instructions, /gap/i);
});

test('does not turn LTK search priority into automatic reliability authority', () => {
  const plan = planOfferDiscovery(categoryRequest);

  assert.match(plan.stages[0].instructions, /does not make.*recommend/i);
  assert.match(plan.stages[1].instructions, /official retailer/i);
});
