import {
	HALF_DOZEN_PARTNER_KEY,
	isPartnerProspectGraduated,
	isPartnerProspectRecord,
	listPartnerAccessLanes,
	listPartnerClients,
	normalizeEmail,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
} from './partner-auth.js';
import {
	findAgencyIdentitySeedByEmail,
	findAgencyMcpEntitlementByAuthSubject,
	normalizeAgencyServiceTier,
} from './mcp-entitlements.js';
import { listPartnerProspectClaimsForUser } from './partner-prospect-discovery-core.js';

export function listPartnerProspectClaimsForAgencyUser(input: {
	db: D1Database;
	authSubject: string;
	email: string;
}) {
	return listPartnerProspectClaimsForUser(
		{
			partnerKey: HALF_DOZEN_PARTNER_KEY,
			findAgencyIdentitySeedByEmail,
			findAgencyMcpEntitlementByAuthSubject,
			listPartnerClients,
			listPartnerAccessLanes,
			isProspectRecord: isPartnerProspectRecord,
			isProspectGraduated: isPartnerProspectGraduated,
			normalizeAgencyServiceTier,
			normalizeEmail,
			parseJsonArray,
			parseJsonObject,
			parseJsonStringArray,
		},
		input,
	);
}
