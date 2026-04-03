import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import {
	getExistingConciergeSessionId,
	getWorkspacePageData
} from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, platform }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);

	const sessionId = getExistingConciergeSessionId(cookies);

	return {
		workspace: sessionId ? await getWorkspacePageData(sessionId, platform) : null
	};
};
