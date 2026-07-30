export type OfferChannel = 'online' | 'pickup' | 'in_store';

export type OfferSourceKind =
  | 'official_retailer'
  | 'retailer_checkout'
  | 'ltk_public'
  | 'creator_owned'
  | 'affiliate_feed'
  | 'user_authorized'
  | 'search_index'
  | 'deal_aggregator';

export type EvidenceState = 'confirmed' | 'conflict' | 'unknown';

export interface OfferRequest {
  merchant: string;
  need: string;
  budget: number;
  currency: string;
  postalCode: string;
  deadline: string;
  asOf: string;
  channels: OfferChannel[];
}

export interface OfferObservation {
  id: string;
  merchant: string;
  title: string;
  source: {
    kind: OfferSourceKind;
    url: string;
    publisher: string;
    observedAt: string;
    access: 'public' | 'authenticated' | 'app_only' | 'blocked';
    direct: boolean;
  };
  offer: {
    code?: string;
    discount: {
      kind: 'percent' | 'amount' | 'shipping' | 'unknown';
      value?: number;
    };
    status: 'active' | 'expired' | 'revoked' | 'unknown';
    startsAt?: string;
    endsAt?: string;
    minimumSubtotal?: number;
    checkoutOnly?: boolean;
  };
  applicability: {
    merchant: EvidenceState;
    budget: EvidenceState;
    location: EvidenceState;
    channel: EvidenceState;
    membership: EvidenceState;
  };
  fulfillment: {
    deadline: 'confirmed' | 'misses' | 'unknown';
    evidenceUrl?: string;
  };
  evidence: {
    terms: 'explicit' | 'partial' | 'none';
    code: 'verified' | 'reported' | 'not_applicable' | 'unknown';
    corroboratingUrls: string[];
  };
}

export interface SourcePolicy {
  authority: number;
  maximumScore: number;
  role: 'verification' | 'corroboration' | 'discovery';
}

export interface ReliabilityCap {
  code:
    | 'DISCOVERY_ONLY_SOURCE'
    | 'SOURCE_CLASS_LIMIT'
    | 'CORROBORATION_REQUIRED'
    | 'OFFICIAL_DOMAIN_UNVERIFIED'
    | 'NO_DIRECT_SOURCE'
    | 'APP_ONLY_OR_BLOCKED'
    | 'TERMS_MISSING'
    | 'STATUS_UNKNOWN'
    | 'CODE_UNVERIFIED'
    | 'CREATOR_CODE_UNCORROBORATED'
    | 'CHECKOUT_UNVERIFIED'
    | 'FULFILLMENT_EVIDENCE_MISSING'
    | 'DEADLINE_UNVERIFIED'
    | 'APPLICABILITY_UNCERTAIN';
  maximum: number;
  reason: string;
}

export interface OfferReliability {
  score: number;
  uncappedScore: number;
  components: {
    validity: number;
    applicability: number;
    fulfillment: number;
    sourceAuthority: number;
    freshness: number;
  };
  caps: ReliabilityCap[];
  reasons: string[];
}

export type OfferDecisionStatus = 'recommend' | 'verify' | 'lead' | 'rejected';

export interface OfferDecision {
  observationId: string;
  merchant: string;
  title: string;
  sourceUrl: string;
  sourceKind: OfferSourceKind;
  offerCode?: string;
  projectedSavingsAtBudget?: number;
  status: OfferDecisionStatus;
  reliability: OfferReliability;
  receiptHash: string;
}

export interface OfferResolutionResult {
  schemaVersion: 'offer_resolution.v0.1';
  policyVersion: 'offer_reliability.v0.1';
  request: OfferRequest;
  decisions: OfferDecision[];
  summary: Record<OfferDecisionStatus, number>;
}
