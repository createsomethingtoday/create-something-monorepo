import {
	HALF_DOZEN_PARTNER_KEY,
	getPartnerAccessLaneBySlug,
	getPartnerClientBySlug,
	isPartnerProspectGraduated,
	isPartnerProspectRecord,
	normalizeEmail,
	normalizePartnerAccessLaneSlug,
	normalizePartnerSlug,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
	upsertPartnerAccessLane,
} from './partner-auth.js';
import {
	buildAgencyEntitlementSnapshot,
	evaluateAgencyMcpEntitlement,
	findAgencyIdentitySeedByEmail,
	findAgencyMcpEntitlementByAuthSubject,
	normalizeAgencyServiceTier,
	reconcileAgencyMcpEntitlement,
	upsertAgencyIdentitySeed,
} from './mcp-entitlements.js';
import { requireAgencySessionUser } from './mcp-token.js';
import { createPartnerProspectClaimPostHandler } from './partner-prospect-claim-core.js';

export function createPartnerProspectClaimPostHandlerWithDefaults() {
	return createPartnerProspectClaimPostHandler({
		partnerKey: HALF_DOZEN_PARTNER_KEY,
		buildAgencyEntitlementSnapshot,
		evaluateAgencyMcpEntitlement,
		findAgencyIdentitySeedByEmail,
		findAgencyMcpEntitlementByAuthSubject,
		getPartnerAccessLaneBySlug,
		getPartnerClientBySlug,
		isProspectGraduated: isPartnerProspectGraduated,
		isProspectRecord: isPartnerProspectRecord,
		normalizeAgencyServiceTier,
		normalizeEmail,
		normalizePartnerAccessLaneSlug,
		normalizePartnerSlug,
		parseJsonArray,
		parseJsonObject,
		parseJsonStringArray,
		reconcileAgencyMcpEntitlement,
		requireAgencySessionUser,
		upsertAgencyIdentitySeed,
		upsertPartnerAccessLane,
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});
}
