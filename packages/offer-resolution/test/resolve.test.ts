import assert from 'node:assert/strict';
import test from 'node:test';

import { findOffers, type OfferObservation, type OfferRequest } from '../src/index.js';

const request: OfferRequest = {
  merchant: 'Abercrombie & Fitch',
  need: 'clothing order',
  budget: 200,
  currency: 'USD',
  postalCode: '76060',
  deadline: '2026-08-09',
  asOf: '2026-07-29T18:00:00.000Z',
  channels: ['online', 'pickup']
};

const officialOffer: OfferObservation = {
  id: 'official-summer-20',
  merchant: 'Abercrombie & Fitch',
  title: '20% off orders over $150',
  source: {
    kind: 'official_retailer',
    url: 'https://www.abercrombie.com/shop/us/br/promo-details',
    publisher: 'Abercrombie & Fitch',
    observedAt: '2026-07-29T17:00:00.000Z',
    access: 'public',
    direct: true
  },
  offer: {
    code: 'SUMMER20',
    discount: { kind: 'percent', value: 20 },
    status: 'active',
    endsAt: '2026-08-10T05:00:00.000Z',
    minimumSubtotal: 150
  },
  applicability: {
    merchant: 'confirmed',
    budget: 'confirmed',
    location: 'confirmed',
    channel: 'confirmed',
    membership: 'confirmed'
  },
  fulfillment: {
    deadline: 'confirmed',
    evidenceUrl: 'https://www.abercrombie.com/shop/us/help/shipping-handling'
  },
  evidence: {
    terms: 'explicit',
    code: 'verified',
    corroboratingUrls: [
      'https://www.abercrombie.com/shop/us/br/promo-details',
      'https://www.abercrombie.com/shop/us/help/shipping-handling'
    ]
  }
};

test('recommends strong official evidence and computes savings at the budget', () => {
  const result = findOffers(request, [officialOffer]);

  assert.equal(result.decisions.length, 1);
  const [decision] = result.decisions;
  assert.equal(decision.status, 'recommend');
  assert.equal(decision.reliability.score, 100);
  assert.deepEqual(decision.reliability.components, {
    validity: 100,
    applicability: 100,
    fulfillment: 100,
    sourceAuthority: 100,
    freshness: 100
  });
  assert.equal(decision.projectedSavingsAtBudget, 40);
  assert.match(decision.receiptHash, /^sha256:[a-f0-9]{64}$/);
});

test('caps an uncorroborated public LTK code at verify', () => {
  const ltkObservation: OfferObservation = {
    ...officialOffer,
    id: 'ltk-creator-code',
    title: 'Creator reports 15% off',
    source: {
      kind: 'ltk_public',
      url: 'https://www.shopltk.com/explore/example/posts/example',
      publisher: 'Example Creator',
      observedAt: '2026-07-29T17:30:00.000Z',
      access: 'public',
      direct: true
    },
    offer: {
      ...officialOffer.offer,
      code: 'CREATOR15',
      discount: { kind: 'percent', value: 15 }
    },
    evidence: {
      terms: 'partial',
      code: 'reported',
      corroboratingUrls: []
    }
  };

  const [decision] = findOffers(request, [ltkObservation]).decisions;
  assert.equal(decision.status, 'verify');
  assert.equal(decision.reliability.score, 69);
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'CREATOR_CODE_UNCORROBORATED'));
  assert.ok(
    decision.reliability.reasons.includes('Verify the code at the retailer before relying on it.')
  );
});

test('requires official corroboration for creator evidence to become recommendable', () => {
  const creatorOnly: OfferObservation = {
    ...officialOffer,
    id: 'creator-only',
    source: {
      kind: 'creator_owned',
      url: 'https://creator.example/current-code',
      publisher: 'Example Creator',
      observedAt: '2026-07-29T17:30:00.000Z',
      access: 'public',
      direct: true
    },
    fulfillment: { deadline: 'confirmed' },
    evidence: {
      terms: 'explicit',
      code: 'verified',
      corroboratingUrls: []
    }
  };

  const [decision] = findOffers(request, [creatorOnly]).decisions;
  assert.equal(decision.status, 'verify');
  assert.equal(decision.reliability.score, 69);
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'CORROBORATION_REQUIRED'));
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'FULFILLMENT_EVIDENCE_MISSING'));
});

test('treats search indexes and deal aggregators as leads', () => {
  const searchLead: OfferObservation = {
    ...officialOffer,
    id: 'search-lead',
    source: {
      kind: 'deal_aggregator',
      url: 'https://example-deals.invalid/abercrombie',
      publisher: 'Example Deals',
      observedAt: '2026-07-29T17:45:00.000Z',
      access: 'public',
      direct: false
    },
    evidence: {
      terms: 'partial',
      code: 'reported',
      corroboratingUrls: []
    }
  };

  const [decision] = findOffers(request, [searchLead]).decisions;
  assert.equal(decision.status, 'lead');
  assert.equal(decision.reliability.score, 45);
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'DISCOVERY_ONLY_SOURCE'));
});

test('does not trust a model-authored official source classification', () => {
  const spoofedOfficial: OfferObservation = {
    ...officialOffer,
    id: 'spoofed-official',
    source: {
      ...officialOffer.source,
      url: 'https://unverified-coupons.invalid/abercrombie',
      publisher: 'Unverified Coupons'
    }
  };

  const [decision] = findOffers(request, [spoofedOfficial]).decisions;
  assert.equal(decision.status, 'verify');
  assert.equal(decision.reliability.score, 69);
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'OFFICIAL_DOMAIN_UNVERIFIED'));
  assert.ok(decision.reliability.components.sourceAuthority < 100);
});

test('rejects expired and applicability-conflicting offers', () => {
  const expired: OfferObservation = {
    ...officialOffer,
    id: 'expired',
    offer: {
      ...officialOffer.offer,
      status: 'expired',
      endsAt: '2026-07-20T00:00:00.000Z'
    }
  };
  const wrongLocation: OfferObservation = {
    ...officialOffer,
    id: 'wrong-location',
    applicability: { ...officialOffer.applicability, location: 'conflict' }
  };

  const result = findOffers(request, [expired, wrongLocation]);
  assert.deepEqual(
    result.decisions.map((decision) => [
      decision.observationId,
      decision.status,
      decision.reliability.score
    ]),
    [
      ['expired', 'rejected', 0],
      ['wrong-location', 'rejected', 0]
    ]
  );
});

test('caps app-only evidence and unknown deadline fulfillment', () => {
  const appOnly: OfferObservation = {
    ...officialOffer,
    id: 'app-only',
    source: { ...officialOffer.source, access: 'app_only' },
    fulfillment: { deadline: 'unknown' }
  };

  const [decision] = findOffers(request, [appOnly]).decisions;
  assert.equal(decision.status, 'lead');
  assert.equal(decision.reliability.score, 50);
  assert.deepEqual(
    decision.reliability.caps.map((cap) => cap.code),
    ['APP_ONLY_OR_BLOCKED', 'DEADLINE_UNVERIFIED']
  );
});

test('is byte-for-byte deterministic and does not mutate inputs', () => {
  const originalRequest = structuredClone(request);
  const observations = [structuredClone(officialOffer)];
  const originalObservations = structuredClone(observations);

  const first = findOffers(request, observations);
  const second = findOffers(structuredClone(request), structuredClone(observations));

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(request, originalRequest);
  assert.deepEqual(observations, originalObservations);
});

test('validates the request before evaluating evidence', () => {
  assert.throws(
    () => findOffers({ ...request, budget: 0 }, []),
    /budget must be greater than zero/i
  );
  assert.throws(
    () => findOffers({ ...request, postalCode: '7606' }, []),
    /postalCode must be a 5-digit US ZIP code/i
  );
  assert.throws(
    () => findOffers({ ...request, deadline: 'August 9' }, []),
    /deadline must use YYYY-MM-DD/i
  );
});
