import type { OfferRequest, OfferSearchCategory } from './types.js';

export const DISCOVERY_POLICY_VERSION = 'offer_discovery_ltk_first.v0.1' as const;

export const CATEGORY_MERCHANTS: Readonly<Record<OfferSearchCategory, readonly string[]>> = {
  health_and_beauty: ['Ulta Beauty', 'Sephora', 'CVS Pharmacy', 'Walgreens', 'Target', 'OSEA']
};

export const CATEGORY_LABELS: Readonly<Record<OfferSearchCategory, string>> = {
  health_and_beauty: 'Health & Beauty'
};

export interface NormalizedOfferRequest extends OfferRequest {
  candidateMerchants: string[];
}

export interface OfferDiscoveryStage {
  lane: 'ltk' | 'supplemental';
  ordinal: 1 | 2;
  domains: string[];
  queries: string[];
  instructions: string;
}

export interface OfferDiscoveryPlan {
  policyVersion: typeof DISCOVERY_POLICY_VERSION;
  candidateMerchants: string[];
  stages: [OfferDiscoveryStage, OfferDiscoveryStage];
}

export function parseOfferSearchCategory(value: string): OfferSearchCategory {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'health_and_beauty') return normalized;
  throw new Error(`Unsupported offer category: ${value}`);
}

export function normalizeOfferRequest(input: OfferRequest): NormalizedOfferRequest {
  if (input.searchCategory && !(input.searchCategory in CATEGORY_MERCHANTS)) {
    throw new Error(`Unsupported offer category: ${String(input.searchCategory)}`);
  }
  const candidateMerchants = input.searchCategory
    ? [...CATEGORY_MERCHANTS[input.searchCategory]]
    : [input.merchant];
  return {
    ...input,
    candidateMerchants
  };
}

export function planOfferDiscovery(input: OfferRequest): OfferDiscoveryPlan {
  const request = normalizeOfferRequest(input);
  const merchantQueries = request.candidateMerchants.map(
    (merchant) =>
      `site:shopltk.com/explore "${merchant}" "${request.need}" coupon promo code LTK exclusive`
  );
  const categoryQuery = request.searchCategory
    ? [
        `site:shopltk.com/explore "${CATEGORY_LABELS[request.searchCategory]}" coupon promo code under ${request.budget} ${request.currency}`
      ]
    : [];
  const supplementalQueries = request.candidateMerchants.flatMap((merchant) => [
    `"${merchant}" official coupon promotion "${request.need}" ${request.deadline}`,
    `"${merchant}" shipping pickup ${request.postalCode} by ${request.deadline}`
  ]);

  return {
    policyVersion: DISCOVERY_POLICY_VERSION,
    candidateMerchants: [...request.candidateMerchants],
    stages: [
      {
        lane: 'ltk',
        ordinal: 1,
        domains: ['shopltk.com'],
        queries: [...categoryQuery, ...merchantQueries],
        instructions:
          'Search public LTK posts, creator profiles, captions, product links, and search-indexed LTK pages first. Detect creator-specific, stackable, time-limited, LTK-exclusive, and app-gated Copy Promo Code offers. Record app-only access without extracting gated codes. LTK being the primary discovery lane does not make a result recommendable; preserve every factual candidate for deterministic scoring.'
      },
      {
        lane: 'supplemental',
        ordinal: 2,
        domains: [],
        queries: supplementalQueries,
        instructions:
          'Only after the LTK stage, search supplemental sources. Corroborate LTK candidates through creator-owned pages and official retailer terms, eligibility, shipping, or pickup evidence. Then fill gaps for candidate merchants through official retailer pages, authorized feeds, search indexes, and deal aggregators. Do not replace or relabel LTK findings.'
      }
    ]
  };
}
