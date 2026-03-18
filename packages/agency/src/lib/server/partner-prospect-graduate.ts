import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	getLatestActiveConsent,
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
	parseOptionalIsoTimestamp,
	randomId,
	requirePartnerAdmin,
	upsertPartnerAccessLane,
} from './partner-auth.js';
import {
	buildAgencyEntitlementSnapshot,
	evaluateAgencyMcpEntitlement,
	reconcileAgencyMcpEntitlement,
} from './mcp-entitlements.js';
import { createPartnerProspectGraduatePostHandler } from './partner-prospect-graduate-core.js';

export function createPartnerProspectGraduatePostHandlerWithDefaults() {
	return createPartnerProspectGraduatePostHandler({
		partnerKey: HALF_DOZEN_PARTNER_KEY,
		buildAgencyEntitlementSnapshot,
		evaluateAgencyMcpEntitlement,
		getLatestActiveConsent,
		getPartnerAccessLaneBySlug,
		getPartnerClientBySlug,
		isProspectGraduated: isPartnerProspectGraduated,
		isProspectRecord: isPartnerProspectRecord,
		normalizeEmail,
		normalizePartnerAccessLaneSlug,
		normalizePartnerSlug,
		parseJsonArray,
		parseJsonObject,
		parseJsonStringArray,
		parseOptionalIsoTimestamp,
		randomId,
		reconcileAgencyMcpEntitlement,
		requirePartnerAdmin,
		upsertPartnerAccessLane,
		isHttpError: (error): error is PartnerAuthHttpError => error instanceof PartnerAuthHttpError,
	});
}
