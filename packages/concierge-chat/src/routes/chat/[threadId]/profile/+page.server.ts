import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { ensureConciergeSession, getRequiredThreadView } from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, params, platform, url }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);

	return {
		threadView: await getRequiredThreadView(
			ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
			params.threadId,
			platform
		)
	};
};
