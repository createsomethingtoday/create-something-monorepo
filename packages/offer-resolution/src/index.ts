export { canonicalStringify, hashReceipt } from './canonical.js';
export {
  CATEGORY_LABELS,
  CATEGORY_MERCHANTS,
  DISCOVERY_POLICY_VERSION,
  normalizeOfferRequest,
  parseOfferSearchCategory,
  planOfferDiscovery
} from './discovery.js';
export {
  MERCHANT_OFFICIAL_DOMAINS,
  POLICY_VERSION,
  SOURCE_POLICIES,
  isVerifiedOfficialDomain,
  sourceAuthorityFor,
  sourcePolicyFor
} from './policy.js';
export { findOffers } from './resolve.js';
export { createOfferService } from './service.js';
export { createOfferHttpHandler } from './http.js';
export {
  findOffersInputSchema,
  offerEvidenceInputSchema,
  offerObservationSchema,
  offerRequestSchema,
  resolveOffersInputSchema,
  verifyOfferInputSchema,
  watchOffersInputSchema
} from './schemas.js';
export { createFileOfferWatchRepository } from './watch-repository.js';
export type {
  CreateOfferServiceOptions,
  FindOffersServiceResult,
  OfferConfidenceLabel,
  OfferDiscoveryProvider,
  OfferService,
  OfferVerificationStatus,
  OfferWatch,
  OfferWatchRun,
  OfferWatchRepository,
  OfferWatchStatus,
  RunDueWatchesInput,
  RunDueWatchesResult,
  ResolveOffersInput,
  VerifyOfferInput,
  VerifyOfferServiceResult,
  WatchOffersInput,
  WatchOffersServiceResult,
  UserOffer
} from './service.js';
export type { CreateFileOfferWatchRepositoryOptions } from './watch-repository.js';
export type * from './types.js';
