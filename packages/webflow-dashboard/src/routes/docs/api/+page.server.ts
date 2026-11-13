import type { PageServerLoad } from './$types';
import { API_KEY_LIFETIME_DAYS, MAX_ACTIVE_API_KEYS } from '$lib/server/api-keys';
import {
	ASSET_LIST_DEFAULT_LIMIT,
	ASSET_LIST_MAX_LIMIT,
	ASSET_STATUSES,
	ASSET_TYPES,
	CREATOR_API_DATA_TTL_SECONDS,
	CREATOR_API_QUOTA
} from '$lib/server/creator-api';

/**
 * Public reference for the Creator API. Every number on the page comes from
 * the constants the API enforces, so the reference cannot drift from the code.
 */
export const load: PageServerLoad = ({ url }) => ({
	apiBase: `${url.origin}/api/v1/creator`,
	requestsPerHour: CREATOR_API_QUOTA.requests,
	maxActiveKeys: MAX_ACTIVE_API_KEYS,
	keyLifetimeDays: API_KEY_LIFETIME_DAYS,
	dataDelayMinutes: Math.round(CREATOR_API_DATA_TTL_SECONDS / 60),
	listDefaultLimit: ASSET_LIST_DEFAULT_LIMIT,
	listMaxLimit: ASSET_LIST_MAX_LIMIT,
	statuses: [...ASSET_STATUSES],
	types: [...ASSET_TYPES]
});
