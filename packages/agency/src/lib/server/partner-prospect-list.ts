import { requireAgencySessionUser } from './mcp-token.js';
import { listPartnerProspectClaimsForAgencyUser } from './partner-prospect-discovery.js';
import { createPartnerProspectListGetHandler } from './partner-prospect-list-core.js';

export function createPartnerProspectListGetHandlerWithDefaults() {
	return createPartnerProspectListGetHandler({
		requireAgencySessionUser: ({ cookies, platform }) =>
			requireAgencySessionUser({
				cookies: cookies as Parameters<typeof requireAgencySessionUser>[0]['cookies'],
				platform,
			}),
		listPartnerProspectClaimsForAgencyUser,
	});
}
