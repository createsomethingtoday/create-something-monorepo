import type {
  EvidenceState,
  OfferObservation,
  OfferRequest,
  ReliabilityCap,
  SourcePolicy,
  OfferSourceKind
} from './types.js';

export const POLICY_VERSION = 'offer_reliability.v0.2' as const;

export const MERCHANT_OFFICIAL_DOMAINS: Readonly<Record<string, readonly string[]>> = {
  'abercrombie-fitch': ['abercrombie.com'],
  'ulta-beauty': ['ulta.com'],
  sephora: ['sephora.com'],
  'cvs-pharmacy': ['cvs.com'],
  walgreens: ['walgreens.com'],
  target: ['target.com'],
  osea: ['oseamalibu.com']
};

export const SOURCE_POLICIES: Readonly<Record<OfferSourceKind, SourcePolicy>> = {
  official_retailer: { authority: 100, maximumScore: 100, role: 'verification' },
  retailer_checkout: { authority: 100, maximumScore: 100, role: 'verification' },
  user_authorized: { authority: 95, maximumScore: 100, role: 'verification' },
  affiliate_feed: { authority: 80, maximumScore: 90, role: 'corroboration' },
  creator_owned: { authority: 75, maximumScore: 85, role: 'corroboration' },
  ltk_public: { authority: 70, maximumScore: 85, role: 'corroboration' },
  search_index: { authority: 35, maximumScore: 45, role: 'discovery' },
  deal_aggregator: { authority: 30, maximumScore: 45, role: 'discovery' }
};

export function sourcePolicyFor(kind: OfferSourceKind): SourcePolicy {
  return SOURCE_POLICIES[kind];
}

function merchantKey(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\band\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function hostnameMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isNonProductionHostname(hostname: string): boolean {
  return /(^|[.-])(qa\d*|stage|staging|dev|test|preview|sandbox)([.-]|$)/i.test(hostname);
}

export function isVerifiedOfficialDomain(merchant: string, sourceUrl: string): boolean {
  const domains = MERCHANT_OFFICIAL_DOMAINS[merchantKey(merchant)] ?? [];
  const hostname = new URL(sourceUrl).hostname.toLowerCase();
  if (isNonProductionHostname(hostname)) return false;
  return domains.some((domain) => hostnameMatches(hostname, domain));
}

function hasOfficialCorroboration(request: OfferRequest, observation: OfferObservation): boolean {
  return observation.evidence.corroboratingUrls.some((url) =>
    isVerifiedOfficialDomain(observation.merchant || request.merchant, url)
  );
}

export function sourceAuthorityFor(request: OfferRequest, observation: OfferObservation): number {
  if (
    (observation.source.kind === 'official_retailer' ||
      observation.source.kind === 'retailer_checkout') &&
    !isVerifiedOfficialDomain(observation.merchant || request.merchant, observation.source.url)
  ) {
    return 50;
  }
  return sourcePolicyFor(observation.source.kind).authority;
}

function evidenceValue(value: EvidenceState): number {
  if (value === 'confirmed') return 100;
  if (value === 'unknown') return 50;
  return 0;
}

export function scoreValidity(observation: OfferObservation): number {
  if (observation.offer.status === 'expired' || observation.offer.status === 'revoked') return 0;
  if (observation.offer.status === 'unknown') return 40;

  const terms = observation.evidence.terms;
  const code = observation.evidence.code;
  if (terms === 'explicit' && (code === 'verified' || code === 'not_applicable')) return 100;
  if (terms === 'partial' && (code === 'verified' || code === 'not_applicable')) return 90;
  if (terms === 'explicit' && code === 'reported') return 85;
  if (terms === 'partial' && code === 'reported') return 70;
  return 45;
}

export function scoreApplicability(observation: OfferObservation): number {
  const values = Object.values(observation.applicability).map(evidenceValue);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function scoreFulfillment(request: OfferRequest, observation: OfferObservation): number {
  if (!request.deadline) return 100;
  if (observation.fulfillment.deadline === 'confirmed') return 100;
  if (observation.fulfillment.deadline === 'misses') return 0;
  return 35;
}

export function scoreFreshness(asOf: string, observedAt: string): number {
  const ageMs = new Date(asOf).getTime() - new Date(observedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < -5 * 60 * 1000) return 0;
  const days = Math.max(0, ageMs) / 86_400_000;
  if (days <= 1) return 100;
  if (days <= 3) return 90;
  if (days <= 7) return 75;
  if (days <= 14) return 55;
  if (days <= 30) return 35;
  return 15;
}

export function collectCaps(
  request: OfferRequest,
  observation: OfferObservation
): ReliabilityCap[] {
  const caps: ReliabilityCap[] = [];
  const source = sourcePolicyFor(observation.source.kind);

  if (source.role === 'discovery') {
    caps.push({
      code: 'DISCOVERY_ONLY_SOURCE',
      maximum: source.maximumScore,
      reason:
        'Treat search indexes and deal sites as leads until a direct source corroborates them.'
    });
  }
  if (source.maximumScore < 100 && source.role !== 'discovery') {
    caps.push({
      code: 'SOURCE_CLASS_LIMIT',
      maximum: source.maximumScore,
      reason: 'This source class cannot receive full official-source authority.'
    });
  }
  if (source.role === 'corroboration' && !hasOfficialCorroboration(request, observation)) {
    caps.push({
      code: 'CORROBORATION_REQUIRED',
      maximum: 79,
      reason: 'An official merchant source must corroborate this offer before recommendation.'
    });
  }
  if (
    (observation.source.kind === 'official_retailer' ||
      observation.source.kind === 'retailer_checkout') &&
    !isVerifiedOfficialDomain(observation.merchant || request.merchant, observation.source.url)
  ) {
    caps.push({
      code: 'OFFICIAL_DOMAIN_UNVERIFIED',
      maximum: 69,
      reason: 'The claimed official source is not in the trusted merchant-domain registry.'
    });
  }
  if (!observation.source.direct) {
    caps.push({
      code: 'NO_DIRECT_SOURCE',
      maximum: 45,
      reason: 'No direct offer source was observed.'
    });
  }
  if (observation.source.access === 'app_only' || observation.source.access === 'blocked') {
    caps.push({
      code: 'APP_ONLY_OR_BLOCKED',
      maximum: 50,
      reason: 'The evidence could not be independently inspected on a public surface.'
    });
  }
  if (observation.evidence.terms === 'none') {
    caps.push({ code: 'TERMS_MISSING', maximum: 50, reason: 'Offer terms were not observed.' });
  }
  const discount = observation.offer.discount;
  const hasNumericDiscount =
    (discount.kind === 'percent' || discount.kind === 'amount') &&
    discount.value !== undefined &&
    discount.value > 0;
  const hasShippingBenefit =
    discount.kind === 'shipping' &&
    (observation.offer.minimumSubtotal !== undefined || Boolean(observation.offer.code));
  if (!observation.offer.code && !hasNumericDiscount && !hasShippingBenefit) {
    caps.push({
      code: 'OFFER_VALUE_UNKNOWN',
      maximum: 45,
      reason: 'No concrete discount, shipping benefit, or offer code was observed.'
    });
  }
  if (observation.offer.status === 'unknown') {
    caps.push({ code: 'STATUS_UNKNOWN', maximum: 55, reason: 'Current offer status is unknown.' });
  }
  if (
    (observation.source.kind === 'ltk_public' || observation.source.kind === 'creator_owned') &&
    !observation.source.publishedAt
  ) {
    caps.push({
      code: 'PUBLICATION_DATE_UNKNOWN',
      maximum: 55,
      reason: 'The creator post publication time is unknown, so freshness cannot be verified.'
    });
  }
  if (observation.offer.code && observation.evidence.code === 'unknown') {
    caps.push({
      code: 'CODE_UNVERIFIED',
      maximum: 55,
      reason: 'The reported code was not verified.'
    });
  }
  if (
    (observation.source.kind === 'ltk_public' || observation.source.kind === 'creator_owned') &&
    observation.evidence.code === 'reported' &&
    observation.evidence.corroboratingUrls.length === 0
  ) {
    caps.push({
      code: 'CREATOR_CODE_UNCORROBORATED',
      maximum: 69,
      reason: 'Verify the code at the retailer before relying on it.'
    });
  }
  if (observation.offer.checkoutOnly && observation.evidence.code !== 'verified') {
    caps.push({
      code: 'CHECKOUT_UNVERIFIED',
      maximum: 55,
      reason: 'Checkout-only eligibility was not verified without transacting.'
    });
  }
  if (observation.fulfillment.deadline === 'confirmed' && !observation.fulfillment.evidenceUrl) {
    caps.push({
      code: 'FULFILLMENT_EVIDENCE_MISSING',
      maximum: 69,
      reason: 'The claimed deadline fit has no direct fulfillment evidence URL.'
    });
  }
  if (observation.fulfillment.deadline === 'unknown') {
    caps.push({
      code: 'DEADLINE_UNVERIFIED',
      maximum: 69,
      reason: 'Delivery or pickup by the requested deadline is unverified.'
    });
  }
  if (Object.values(observation.applicability).some((value) => value === 'unknown')) {
    caps.push({
      code: 'APPLICABILITY_UNCERTAIN',
      maximum: 79,
      reason: 'At least one eligibility constraint remains unknown.'
    });
  }

  return caps;
}
