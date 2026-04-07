import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import { ensureConciergeSession, getWorkspacePageData } from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, platform, url, parent }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);
	const parentData = await parent();
	const pageData = await getWorkspacePageData(
		ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
		platform
	);

	if (parentData.agencyAccess.status !== 'allowed') {
		throw redirect(303, pageData.latestThreadId ? `/chat/${pageData.latestThreadId}` : '/apply');
	}

	return pageData;
};
