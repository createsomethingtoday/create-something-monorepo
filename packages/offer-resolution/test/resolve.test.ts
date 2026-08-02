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
      publishedAt: '2026-07-29T16:30:00.000Z',
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
  assert.equal(decision.discoveryLane, 'ltk');
});

test('scores LTK freshness from publication time rather than observation time', () => {
  const oldLtkPost: OfferObservation = {
    ...officialOffer,
    id: 'old-ltk-post',
    source: {
      kind: 'ltk_public',
      url: 'https://www.shopltk.com/explore/example/posts/old',
      publisher: 'Example Creator',
      publishedAt: '2026-05-01T12:00:00.000Z',
      observedAt: '2026-07-29T17:30:00.000Z',
      access: 'public',
      direct: true
    },
    evidence: { terms: 'partial', code: 'reported', corroboratingUrls: [] }
  };

  const [decision] = findOffers(request, [oldLtkPost]).decisions;
  assert.equal(decision.reliability.components.freshness, 15);
});

test('scores date-only LTK publication evidence from its calendar date, not rediscovery time', () => {
  const oldLtkPost: OfferObservation = {
    ...officialOffer,
    id: 'old-date-only-ltk-post',
    source: {
      kind: 'ltk_public',
      url: 'https://www.shopltk.com/explore/example/posts/old-date-only',
      publisher: 'Example Creator',
      publishedOn: '2026-05-01',
      observedAt: request.asOf,
      access: 'public',
      direct: true
    },
    evidence: { terms: 'partial', code: 'reported', corroboratingUrls: [] }
  };

  const [decision] = findOffers(request, [oldLtkPost]).decisions;
  assert.equal(decision.reliability.components.freshness, 15);
  assert.ok(!decision.reliability.caps.some((cap) => cap.code === 'PUBLICATION_DATE_UNKNOWN'));
  assert.notEqual(decision.status, 'recommend');
});

test('rejects offers whose date-only end window precedes the request date', () => {
  const expiredDateOnly: OfferObservation = {
    ...officialOffer,
    id: 'expired-date-only',
    offer: { ...officialOffer.offer, endsAt: undefined, endsOn: '2026-07-28' }
  };

  const [decision] = findOffers(request, [expiredDateOnly]).decisions;
  assert.equal(decision.status, 'rejected');
  assert.ok(
    decision.reliability.reasons.includes('The observed end date is before the request date.')
  );
});

test('caps LTK evidence when the post publication time is unknown', () => {
  const undatedLtkPost: OfferObservation = {
    ...officialOffer,
    id: 'undated-ltk-post',
    source: {
      kind: 'ltk_public',
      url: 'https://www.shopltk.com/explore/example/posts/undated',
      publisher: 'Example Creator',
      observedAt: '2026-07-29T17:30:00.000Z',
      access: 'public',
      direct: true
    },
    evidence: { terms: 'partial', code: 'reported', corroboratingUrls: [] }
  };

  const [decision] = findOffers(request, [undatedLtkPost]).decisions;
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'PUBLICATION_DATE_UNKNOWN'));
});

test('separates LTK finds from supplemental results without changing reliability order', () => {
  const ltkObservation: OfferObservation = {
    ...officialOffer,
    id: 'ltk-primary-lane',
    source: {
      kind: 'ltk_public',
      url: 'https://www.shopltk.com/explore/example/posts/primary',
      publisher: 'Example Creator',
      publishedAt: '2026-07-29T16:30:00.000Z',
      observedAt: '2026-07-29T17:30:00.000Z',
      access: 'public',
      direct: true
    },
    evidence: { terms: 'partial', code: 'reported', corroboratingUrls: [] }
  };

  const result = findOffers(request, [officialOffer, ltkObservation]);

  assert.deepEqual(result.lanes, {
    ltk: ['ltk-primary-lane'],
    supplemental: ['official-summer-20']
  });
  assert.deepEqual(
    result.decisions.map((decision) => [
      decision.observationId,
      decision.status,
      decision.discoveryLane
    ]),
    [
      ['official-summer-20', 'recommend', 'supplemental'],
      ['ltk-primary-lane', 'verify', 'ltk']
    ]
  );
});

test('trusts registered health and beauty merchant domains during category resolution', () => {
  const categoryRequest: OfferRequest = {
    ...request,
    merchant: 'Health & Beauty',
    searchCategory: 'health_and_beauty'
  };
  const ultaOffer: OfferObservation = {
    ...officialOffer,
    id: 'ulta-official',
    merchant: 'Ulta Beauty',
    source: {
      ...officialOffer.source,
      url: 'https://www.ulta.com/promotion/coupon',
      publisher: 'Ulta Beauty'
    },
    fulfillment: {
      deadline: 'confirmed',
      evidenceUrl: 'https://www.ulta.com/guestservices/ways-to-shop/pickup'
    },
    evidence: {
      ...officialOffer.evidence,
      corroboratingUrls: ['https://www.ulta.com/promotion/coupon']
    }
  };

  const [decision] = findOffers(categoryRequest, [ultaOffer]).decisions;
  assert.equal(decision.status, 'recommend');
  assert.equal(decision.reliability.components.sourceAuthority, 100);
  assert.ok(!decision.reliability.caps.some((cap) => cap.code === 'OFFICIAL_DOMAIN_UNVERIFIED'));
});

test('keeps category-level LTK pages as leads when no concrete offer value exists', () => {
  const categoryRequest: OfferRequest = {
    ...request,
    merchant: 'Health & Beauty',
    searchCategory: 'health_and_beauty'
  };
  const categoryPage: OfferObservation = {
    ...officialOffer,
    id: 'ltk-category-page',
    merchant: 'Health & Beauty',
    source: {
      kind: 'ltk_public',
      url: 'https://www.shopltk.com/explore/example',
      publisher: 'Example Creator',
      observedAt: '2026-07-29T17:30:00.000Z',
      access: 'public',
      direct: true
    },
    offer: {
      discount: { kind: 'unknown' },
      status: 'unknown'
    },
    fulfillment: { deadline: 'unknown' },
    evidence: { terms: 'none', code: 'unknown', corroboratingUrls: [] }
  };

  const [decision] = findOffers(categoryRequest, [categoryPage]).decisions;
  assert.equal(decision.status, 'lead');
  assert.equal(decision.reliability.score, 45);
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'OFFER_VALUE_UNKNOWN'));
  assert.ok(
    !decision.reliability.reasons.includes('The merchant is outside the bounded category fan-out.')
  );
});

test('does not treat a generic shipping-information page as a shipping offer', () => {
  const shippingPage: OfferObservation = {
    ...officialOffer,
    id: 'shipping-information-only',
    title: 'Pickup & Delivery: how pickup works',
    offer: {
      discount: { kind: 'shipping' },
      status: 'active',
      minimumSubtotal: 35
    },
    evidence: { terms: 'explicit', code: 'not_applicable', corroboratingUrls: [] }
  };

  const [decision] = findOffers(request, [shippingPage]).decisions;
  assert.equal(decision.status, 'lead');
  assert.equal(decision.reliability.score, 45);
  assert.ok(decision.reliability.caps.some((cap) => cap.code === 'OFFER_VALUE_UNKNOWN'));
});

test('rejects merchants outside the bounded category fan-out', () => {
  const categoryRequest: OfferRequest = {
    ...request,
    merchant: 'Health & Beauty',
    searchCategory: 'health_and_beauty'
  };
  const outsideMerchant: OfferObservation = {
    ...officialOffer,
    id: 'outside-category',
    merchant: 'Unbounded Merchant'
  };

  const [decision] = findOffers(categoryRequest, [outsideMerchant]).decisions;
  assert.equal(decision.status, 'rejected');
  assert.ok(
    decision.reliability.reasons.includes('The merchant is outside the bounded category fan-out.')
  );
});

test('rejects non-LTK fallback merchants outside an exact merchant request', () => {
  const sephoraRequest: OfferRequest = {
    ...request,
    merchant: 'Sephora',
    need: 'beauty supplies'
  };
  const unrelatedTargetOffer: OfferObservation = {
    ...officialOffer,
    id: 'unrelated-target-offer',
    merchant: 'Target',
    source: {
      ...officialOffer.source,
      url: 'https://www.target.com/circle/o/target-circle/-/123',
      publisher: 'Target'
    }
  };

  const [decision] = findOffers(sephoraRequest, [unrelatedTargetOffer]).decisions;
  assert.equal(decision.status, 'rejected');
  assert.ok(decision.reliability.reasons.includes('The merchant does not match the request.'));
});

test('requires official corroboration for creator evidence to become recommendable', () => {
  const creatorOnly: OfferObservation = {
    ...officialOffer,
    id: 'creator-only',
    source: {
      kind: 'creator_owned',
      url: 'https://creator.example/current-code',
      publisher: 'Example Creator',
      publishedAt: '2026-07-29T16:30:00.000Z',
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

test('deduplicates repeated merchant, URL, and code observations deterministically', () => {
  const duplicate = {
    ...officialOffer,
    id: 'duplicate-official-summer-20',
    title: 'Duplicate title for the same source and code'
  };
  const inputs = [duplicate, officialOffer];
  const originalInputs = structuredClone(inputs);

  const result = findOffers(request, inputs);

  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].observationId, 'duplicate-official-summer-20');
  assert.deepEqual(inputs, originalInputs);
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
