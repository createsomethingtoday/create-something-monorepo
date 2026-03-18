import {
  HALF_DOZEN_PARTNER_KEY,
  PartnerAuthHttpError,
  authorizePartnerToolkitAdminAction,
  getComposioClient,
  getPartnerClientBySlug,
  normalizePartnerSlug,
  normalizeToolkitSlug,
  parseJsonObject,
  randomId,
  requirePartnerAdmin,
  resolveAuthConfigId,
} from "./partner-auth.js";
import { createPartnerToolkitConnectLinkPostHandler } from "./partner-toolkit-connect-link-core.js";

export function createPartnerToolkitConnectLinkPostHandlerWithDefaults() {
  return createPartnerToolkitConnectLinkPostHandler({
    partnerKey: HALF_DOZEN_PARTNER_KEY,
    authorizePartnerToolkitAdminAction,
    getComposioClient,
    getPartnerClientBySlug,
    normalizePartnerSlug,
    normalizeToolkitSlug,
    parseJsonObject,
    randomId,
    requirePartnerAdmin,
    resolveAuthConfigId,
    isHttpError: (error): error is PartnerAuthHttpError => error instanceof PartnerAuthHttpError,
  });
}
