import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { ensureConciergeSession, getWorkspacePageData } from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, platform, url }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);

	return getWorkspacePageData(
		ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
		platform
	);
};
