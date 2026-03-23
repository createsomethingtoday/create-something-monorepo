import {
	HALF_DOZEN_PARTNER_KEY,
	getLatestActiveConsent,
	getPartnerAccessLaneBySlug,
	getPartnerClientBySlug,
	normalizePartnerAccessLaneSlug,
	normalizePartnerSlug,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
	PartnerAuthHttpError,
	requirePartnerAdmin,
} from './partner-auth.js';
import { createPartnerAccessLaneStatusGetHandler } from './partner-access-lane-status-core.js';

export function createPartnerAccessLaneStatusGetHandlerWithDefaults() {
	return createPartnerAccessLaneStatusGetHandler({
		partnerKey: HALF_DOZEN_PARTNER_KEY,
		getLatestActiveConsent,
		getPartnerAccessLaneBySlug,
		getPartnerClientBySlug,
		normalizePartnerAccessLaneSlug,
		normalizePartnerSlug,
		parseJsonArray,
		parseJsonObject,
		parseJsonStringArray,
		requirePartnerAdmin,
		isHttpError: (error): error is PartnerAuthHttpError => error instanceof PartnerAuthHttpError,
	});
}
