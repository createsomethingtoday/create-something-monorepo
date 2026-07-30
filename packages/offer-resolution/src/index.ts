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
export type * from './types.js';
