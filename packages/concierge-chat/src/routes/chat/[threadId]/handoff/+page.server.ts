import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { ensureConciergeSession, getRequiredHandoffThreadView } from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, params, platform, url, parent }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);
	const parentData = await parent();

	if (parentData.agencyAccess.status === 'anonymous') {
		throw redirect(303, `/chat/${params.threadId}`);
	}

	return {
		threadView: await getRequiredHandoffThreadView(
			ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
			params.threadId,
			platform
		)
	};
};
