import { hashReceipt } from './canonical.js';
import {
  POLICY_VERSION,
  collectCaps,
  scoreApplicability,
  scoreFreshness,
  scoreFulfillment,
  scoreValidity,
  sourceAuthorityFor
} from './policy.js';
import type {
  OfferDecision,
  OfferDecisionStatus,
  OfferObservation,
  OfferRequest,
  OfferResolutionResult
} from './types.js';

const STATUS_ORDER: Record<OfferDecisionStatus, number> = {
  recommend: 0,
  verify: 1,
  lead: 2,
  rejected: 3
};

function requireText(name: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${name} must not be empty`);
  return normalized;
}

function requireDate(name: string, value: string, dateOnly = false): string {
  if (dateOnly && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD`);
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${name} must be a valid date`);
  return value;
}

function requireUrl(name: string, value: string): string {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol))
    throw new Error(`${name} must use HTTP or HTTPS`);
  return parsed.toString();
}

function normalizeRequest(input: OfferRequest): OfferRequest {
  if (!Number.isFinite(input.budget) || input.budget <= 0) {
    throw new Error('budget must be greater than zero');
  }
  if (!/^\d{5}$/.test(input.postalCode)) {
    throw new Error('postalCode must be a 5-digit US ZIP code');
  }
  return {
    merchant: requireText('merchant', input.merchant),
    need: requireText('need', input.need),
    budget: input.budget,
    currency: requireText('currency', input.currency).toUpperCase(),
    postalCode: input.postalCode,
    deadline: requireDate('deadline', input.deadline, true),
    asOf: new Date(requireDate('asOf', input.asOf)).toISOString(),
    channels: [...new Set(input.channels)].sort()
  };
}

function normalizeObservation(input: OfferObservation): OfferObservation {
  const normalized: OfferObservation = {
    id: requireText('observation.id', input.id),
    merchant: requireText('observation.merchant', input.merchant),
    title: requireText('observation.title', input.title),
    source: {
      ...input.source,
      url: requireUrl('observation.source.url', input.source.url),
      publisher: requireText('observation.source.publisher', input.source.publisher),
      observedAt: new Date(
        requireDate('observation.source.observedAt', input.source.observedAt)
      ).toISOString()
    },
    offer: {
      ...input.offer,
      code: input.offer.code?.trim().toUpperCase() || undefined,
      startsAt: input.offer.startsAt
        ? new Date(requireDate('observation.offer.startsAt', input.offer.startsAt)).toISOString()
        : undefined,
      endsAt: input.offer.endsAt
        ? new Date(requireDate('observation.offer.endsAt', input.offer.endsAt)).toISOString()
        : undefined
    },
    applicability: { ...input.applicability },
    fulfillment: {
      ...input.fulfillment,
      evidenceUrl: input.fulfillment.evidenceUrl
        ? requireUrl('observation.fulfillment.evidenceUrl', input.fulfillment.evidenceUrl)
        : undefined
    },
    evidence: {
      ...input.evidence,
      corroboratingUrls: [
        ...new Set(
          input.evidence.corroboratingUrls.map((url) => requireUrl('corroboratingUrl', url))
        )
      ].sort()
    }
  };
  return normalized;
}

function rejectionReasons(request: OfferRequest, observation: OfferObservation): string[] {
  const reasons: string[] = [];
  const asOf = new Date(request.asOf).getTime();
  if (observation.offer.status === 'expired' || observation.offer.status === 'revoked') {
    reasons.push('The offer is expired or revoked.');
  }
  if (observation.offer.endsAt && new Date(observation.offer.endsAt).getTime() < asOf) {
    reasons.push('The observed end time is before the request time.');
  }
  if (observation.offer.startsAt && new Date(observation.offer.startsAt).getTime() > asOf) {
    reasons.push('The offer has not started.');
  }
  if (
    observation.offer.minimumSubtotal !== undefined &&
    request.budget < observation.offer.minimumSubtotal
  ) {
    reasons.push('The budget is below the minimum subtotal.');
  }
  for (const [name, state] of Object.entries(observation.applicability)) {
    if (state === 'conflict') reasons.push(`The ${name} requirement conflicts with the request.`);
  }
  if (observation.fulfillment.deadline === 'misses') {
    reasons.push('The offer cannot be fulfilled by the requested deadline.');
  }
  return [...new Set(reasons)].sort();
}

function projectedSavings(
  request: OfferRequest,
  observation: OfferObservation
): number | undefined {
  const { kind, value } = observation.offer.discount;
  if (value === undefined || !Number.isFinite(value) || value < 0) return undefined;
  if (kind === 'percent') return Number(((request.budget * Math.min(value, 100)) / 100).toFixed(2));
  if (kind === 'amount') return Number(Math.min(request.budget, value).toFixed(2));
  return undefined;
}

function decide(request: OfferRequest, observation: OfferObservation): OfferDecision {
  const components = {
    validity: scoreValidity(observation),
    applicability: scoreApplicability(observation),
    fulfillment: scoreFulfillment(request, observation),
    sourceAuthority: sourceAuthorityFor(request, observation),
    freshness: scoreFreshness(request.asOf, observation.source.observedAt)
  };
  const uncappedScore = Math.round(
    components.validity * 0.3 +
      components.applicability * 0.25 +
      components.fulfillment * 0.15 +
      components.sourceAuthority * 0.2 +
      components.freshness * 0.1
  );
  const rejected = rejectionReasons(request, observation);
  const caps = collectCaps(request, observation);
  const cappedScore = caps.reduce((score, cap) => Math.min(score, cap.maximum), uncappedScore);
  const score = rejected.length > 0 ? 0 : cappedScore;
  const status: OfferDecisionStatus = rejected.length
    ? 'rejected'
    : score >= 80
      ? 'recommend'
      : score >= 60
        ? 'verify'
        : 'lead';
  const reasons = [...new Set([...rejected, ...caps.map((cap) => cap.reason)])];
  const reliability = { score, uncappedScore, components, caps, reasons };
  const receipt = {
    policyVersion: POLICY_VERSION,
    request,
    observation,
    reliability,
    status
  };
  return {
    observationId: observation.id,
    merchant: observation.merchant,
    title: observation.title,
    sourceUrl: observation.source.url,
    sourceKind: observation.source.kind,
    offerCode: observation.offer.code,
    projectedSavingsAtBudget: projectedSavings(request, observation),
    status,
    reliability,
    receiptHash: hashReceipt(receipt)
  };
}

export function findOffers(
  requestInput: OfferRequest,
  observationInputs: OfferObservation[]
): OfferResolutionResult {
  const request = normalizeRequest(requestInput);
  const observations = observationInputs.map(normalizeObservation);
  const ids = new Set<string>();
  for (const observation of observations) {
    if (ids.has(observation.id)) throw new Error(`duplicate observation id: ${observation.id}`);
    ids.add(observation.id);
  }
  const decisions = observations
    .map((observation) => decide(request, observation))
    .sort((left, right) => {
      return (
        STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
        right.reliability.score - left.reliability.score ||
        left.observationId.localeCompare(right.observationId)
      );
    });
  const summary: OfferResolutionResult['summary'] = {
    recommend: 0,
    verify: 0,
    lead: 0,
    rejected: 0
  };
  for (const decision of decisions) summary[decision.status] += 1;

  return {
    schemaVersion: 'offer_resolution.v0.1',
    policyVersion: POLICY_VERSION,
    request,
    decisions,
    summary
  };
}
