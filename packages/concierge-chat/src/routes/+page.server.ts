import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import {
	clearCommunicationRules,
	difyRuntimeBoundary,
	operatorMode,
	operatorShellPlanes,
	operatorStateDefinitions
} from '$lib/operator/clear-shell';
import {
	getExistingConciergeSessionId,
	getWorkspacePageData
} from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, platform }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);

	const sessionId = getExistingConciergeSessionId(cookies);

	return {
		workspace: sessionId ? await getWorkspacePageData(sessionId, platform) : null,
		operatorMode,
		operatorShellPlanes,
		operatorStateDefinitions,
		clearCommunicationRules,
		difyRuntimeBoundary
	};
};
