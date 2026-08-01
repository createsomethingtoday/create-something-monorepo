import { findOffers as resolveOffers } from './resolve.js';
import { canonicalStringify, hashReceipt } from './canonical.js';
import type {
  OfferDecision,
  OfferObservation,
  OfferRequest,
  OfferRequestInput,
  OfferResolutionResult
} from './types.js';

export type OfferConfidenceLabel =
  | 'Verified'
  | 'High confidence'
  | 'Worth trying'
  | 'Evidence only'
  | 'Uncertain'
  | 'Do not use';

export interface OfferDiscoveryProvider {
  discover(request: OfferRequest): Promise<OfferObservation[]>;
}

export interface UserOffer {
  observationId: string;
  merchant: string;
  title: string;
  code?: string;
  status: OfferDecision['status'];
  confidence: {
    label: OfferConfidenceLabel;
    score: number;
  };
  freshness: {
    score: number;
  };
  projectedSavings?: {
    amount: number;
    currency: string;
  };
  source: {
    url: string;
    kind: OfferDecision['sourceKind'];
    lane: OfferDecision['discoveryLane'];
  };
  disclosure: string;
  receiptHash: string;
  actions: {
    canCopyCode: boolean;
    canWatch: boolean;
  };
}

export interface FindOffersServiceResult {
  schemaVersion: 'offer_service.v0.1';
  operation: 'find_offers';
  observedAt: string;
  receiptHash: string;
  resolution: OfferResolutionResult;
  offers: UserOffer[];
  ltkOffers: UserOffer[];
  supplementalOffers: UserOffer[];
  evidence: UserOffer[];
  counts: {
    ltk: number;
    supplemental: number;
    evidence: number;
  };
}

export type OfferVerificationStatus = 'verified' | 'needs_checkout' | 'unverified' | 'rejected';

export interface VerifyOfferInput {
  request: OfferRequestInput;
  observation: OfferObservation;
}

export interface VerifyOfferServiceResult {
  schemaVersion: 'offer_service.v0.1';
  operation: 'verify_offer';
  verification: OfferVerificationStatus;
  offer: UserOffer;
  resolution: OfferResolutionResult;
}

export type OfferWatchStatus = 'active' | 'completed' | 'cancelled';

export interface OfferWatchRun {
  id: string;
  status: 'succeeded' | 'failed';
  requestedAt: string;
  completedAt: string;
  receiptHash?: string;
  error?: string;
}

export interface OfferWatch {
  schemaVersion: 'offer_watch.v0.1';
  id: string;
  status: OfferWatchStatus;
  request: OfferRequest;
  until: string;
  createdAt: string;
  updatedAt: string;
  runCount: number;
  runs: OfferWatchRun[];
  latestResult?: FindOffersServiceResult;
}

export interface WatchOffersInput {
  request: OfferRequestInput;
  until: string;
  idempotencyKey: string;
}

export interface WatchOffersServiceResult {
  schemaVersion: 'offer_service.v0.1';
  operation: 'watch_offers';
  created: boolean;
  watch: OfferWatch;
}

export interface OfferWatchRepository {
  findByIdempotencyKey(key: string): Promise<OfferWatch | undefined>;
  get(id: string): Promise<OfferWatch | undefined>;
  list(): Promise<OfferWatch[]>;
  save(key: string, watch: OfferWatch): Promise<void>;
  update(watch: OfferWatch): Promise<void>;
}

export interface RunDueWatchesInput {
  runKey: string;
  limit?: number;
}

export interface RunDueWatchesResult {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface OfferService {
  findOffers(request: OfferRequestInput): Promise<FindOffersServiceResult>;
  verifyOffer(input: VerifyOfferInput): Promise<VerifyOfferServiceResult>;
  watchOffers(input: WatchOffersInput): Promise<WatchOffersServiceResult>;
  getWatch(id: string): Promise<OfferWatch | undefined>;
  runDueWatches(input: RunDueWatchesInput): Promise<RunDueWatchesResult>;
}

export interface CreateOfferServiceOptions {
  discovery: OfferDiscoveryProvider;
  watches?: OfferWatchRepository;
  clock?: () => Date;
}

function isEvidenceOnly(decision: OfferDecision): boolean {
  return decision.reliability.caps.some((cap) => cap.code === 'OFFER_VALUE_UNKNOWN');
}

function confidenceLabel(decision: OfferDecision, evidenceOnly = false): OfferConfidenceLabel {
  if (evidenceOnly) return 'Evidence only';
  if (decision.status === 'rejected') return 'Do not use';
  if (decision.status === 'recommend') return 'Verified';
  if (decision.reliability.score >= 70) return 'High confidence';
  if (decision.reliability.score >= 50) return 'Worth trying';
  return 'Uncertain';
}

function disclosure(decision: OfferDecision): string {
  if (decision.reliability.reasons.length > 0) {
    return decision.reliability.reasons.join(' ');
  }
  if (decision.status === 'recommend') {
    return 'Verified against direct public evidence for the supplied request.';
  }
  return 'Review the source and retailer terms before relying on this offer.';
}

function presentOffer(
  decision: OfferDecision,
  request: OfferRequest,
  evidenceOnly = false
): UserOffer {
  const usable = decision.status !== 'rejected' && !evidenceOnly;
  return {
    observationId: decision.observationId,
    merchant: decision.merchant,
    title: decision.title,
    code: decision.offerCode,
    status: decision.status,
    confidence: {
      label: confidenceLabel(decision, evidenceOnly),
      score: decision.reliability.score
    },
    freshness: {
      score: decision.reliability.components.freshness
    },
    projectedSavings:
      decision.projectedSavingsAtBudget === undefined
        ? undefined
        : {
            amount: decision.projectedSavingsAtBudget,
            currency: request.currency
          },
    source: {
      url: decision.sourceUrl,
      kind: decision.sourceKind,
      lane: decision.discoveryLane
    },
    disclosure: disclosure(decision),
    receiptHash: decision.receiptHash,
    actions: {
      canCopyCode: usable && decision.offerCode !== undefined,
      canWatch: usable
    }
  };
}

function verificationStatus(decision: OfferDecision): OfferVerificationStatus {
  if (decision.status === 'rejected') return 'rejected';
  if (decision.status === 'recommend') return 'verified';
  if (decision.offerCode) return 'needs_checkout';
  return 'unverified';
}

export function createOfferService(options: CreateOfferServiceOptions): OfferService {
  const clock = options.clock ?? (() => new Date());
  let watchRunQueue = Promise.resolve();

  function materializeRequest(request: OfferRequestInput): OfferRequest {
    const { asOf: _callerObservationTime, ...publicRequest } = request as OfferRequestInput & {
      asOf?: string;
    };
    return {
      ...publicRequest,
      asOf: clock().toISOString()
    };
  }

  async function executeDueWatches(
    service: OfferService,
    input: RunDueWatchesInput
  ): Promise<RunDueWatchesResult> {
    if (!options.watches) throw new Error('Offer watch persistence is not configured.');
    const runKey = input.runKey.trim();
    if (!runKey) throw new Error('runKey must not be empty');
    const limit = input.limit ?? 25;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('limit must be an integer from 1 to 100');
    }
    const now = clock();
    const watches = (await options.watches.list())
      .filter((watch) => watch.status === 'active' && new Date(watch.until) >= now)
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, limit);
    const summary: RunDueWatchesResult = { attempted: 0, succeeded: 0, failed: 0, skipped: 0 };

    for (const watch of watches) {
      const runId = `run_${hashReceipt({
        scope: 'offer_watch_run',
        watchId: watch.id,
        runKey
      }).slice('sha256:'.length, 'sha256:'.length + 24)}`;
      if (watch.runs.some((run) => run.id === runId)) {
        summary.skipped += 1;
        continue;
      }
      summary.attempted += 1;
      const requestedAt = clock().toISOString();
      try {
        const { asOf: _previousObservationTime, ...nextRequest } = watch.request;
        const latestResult = await service.findOffers(nextRequest);
        const completedAt = clock().toISOString();
        const updated: OfferWatch = {
          ...watch,
          updatedAt: completedAt,
          runCount: watch.runCount + 1,
          runs: [
            ...watch.runs,
            {
              id: runId,
              status: 'succeeded',
              requestedAt,
              completedAt,
              receiptHash: hashReceipt(latestResult.resolution)
            }
          ],
          latestResult
        };
        await options.watches.update(JSON.parse(canonicalStringify(updated)) as OfferWatch);
        summary.succeeded += 1;
      } catch (error: unknown) {
        const completedAt = clock().toISOString();
        const updated: OfferWatch = {
          ...watch,
          updatedAt: completedAt,
          runCount: watch.runCount + 1,
          runs: [
            ...watch.runs,
            {
              id: runId,
              status: 'failed',
              requestedAt,
              completedAt,
              error: (error instanceof Error ? error.message : 'Offer discovery failed.').slice(
                0,
                500
              )
            }
          ]
        };
        await options.watches.update(JSON.parse(canonicalStringify(updated)) as OfferWatch);
        summary.failed += 1;
      }
    }
    return summary;
  }

  const service: OfferService = {
    async findOffers(request) {
      const observedRequest = materializeRequest(request);
      const observations = await options.discovery.discover(observedRequest);
      const resolution = resolveOffers(observedRequest, observations);
      const visibleDecisions = resolution.decisions.filter(
        (decision) => decision.status !== 'rejected'
      );
      const offerDecisions = visibleDecisions.filter((decision) => !isEvidenceOnly(decision));
      const evidence = resolution.decisions
        .filter((decision) => decision.status !== 'rejected' && isEvidenceOnly(decision))
        .map((decision) => presentOffer(decision, resolution.request, true));
      const ltkOffers = offerDecisions
        .filter((decision) => decision.discoveryLane === 'ltk')
        .map((decision) => presentOffer(decision, resolution.request));
      const supplementalOffers = offerDecisions
        .filter((decision) => decision.discoveryLane === 'supplemental')
        .map((decision) => presentOffer(decision, resolution.request));
      return {
        schemaVersion: 'offer_service.v0.1',
        operation: 'find_offers',
        observedAt: resolution.request.asOf,
        receiptHash: hashReceipt({ operation: 'find_offers', resolution }),
        resolution,
        offers: [...ltkOffers, ...supplementalOffers],
        ltkOffers,
        supplementalOffers,
        evidence,
        counts: {
          ltk: ltkOffers.length,
          supplemental: supplementalOffers.length,
          evidence: evidence.length
        }
      };
    },
    async verifyOffer({ request, observation }) {
      const resolution = resolveOffers(materializeRequest(request), [observation]);
      const [decision] = resolution.decisions;
      if (!decision) throw new Error('The supplied offer did not produce a decision.');
      return {
        schemaVersion: 'offer_service.v0.1',
        operation: 'verify_offer',
        verification: verificationStatus(decision),
        offer: presentOffer(decision, resolution.request, isEvidenceOnly(decision)),
        resolution
      };
    },
    async watchOffers(input) {
      if (!options.watches) throw new Error('Offer watch persistence is not configured.');
      const idempotencyKey = input.idempotencyKey.trim();
      if (!idempotencyKey) throw new Error('idempotencyKey must not be empty');
      const until = new Date(input.until);
      if (!Number.isFinite(until.getTime())) throw new Error('until must be a valid date');
      const existing = await options.watches.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        const normalizedRequest = resolveOffers(
          { ...input.request, asOf: existing.request.asOf },
          []
        ).request;
        const { asOf: _existingObservationTime, ...expectedRequest } = existing.request;
        const { asOf: _receivedObservationTime, ...receivedRequest } = normalizedRequest;
        const expected = canonicalStringify({ request: expectedRequest, until: existing.until });
        const received = canonicalStringify({
          request: receivedRequest,
          until: until.toISOString()
        });
        if (expected !== received) {
          throw new Error('idempotencyKey was already used for a different watch request.');
        }
        return {
          schemaVersion: 'offer_service.v0.1',
          operation: 'watch_offers',
          created: false,
          watch: existing
        };
      }

      const baseline = await this.findOffers(input.request);
      const timestamp = clock().toISOString();
      const watchId = `watch_${hashReceipt({
        scope: 'offer_watch',
        request: baseline.resolution.request,
        until: until.toISOString(),
        idempotencyKey
      }).slice('sha256:'.length, 'sha256:'.length + 24)}`;
      const watch: OfferWatch = {
        schemaVersion: 'offer_watch.v0.1',
        id: watchId,
        status: 'active',
        request: baseline.resolution.request,
        until: until.toISOString(),
        createdAt: timestamp,
        updatedAt: timestamp,
        runCount: 1,
        runs: [
          {
            id: `run_${hashReceipt({
              scope: 'offer_watch_initial_run',
              watchId
            }).slice('sha256:'.length, 'sha256:'.length + 24)}`,
            status: 'succeeded',
            requestedAt: timestamp,
            completedAt: timestamp,
            receiptHash: hashReceipt(baseline.resolution)
          }
        ],
        latestResult: baseline
      };
      const persistedWatch = JSON.parse(canonicalStringify(watch)) as OfferWatch;
      await options.watches.save(idempotencyKey, persistedWatch);
      return {
        schemaVersion: 'offer_service.v0.1',
        operation: 'watch_offers',
        created: true,
        watch: persistedWatch
      };
    },
    async getWatch(id) {
      if (!options.watches) throw new Error('Offer watch persistence is not configured.');
      return options.watches.get(id);
    },
    async runDueWatches(input) {
      const run = watchRunQueue.then(() => executeDueWatches(service, input));
      watchRunQueue = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    }
  };
  return service;
}
