import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import {
	clearCommunicationRules,
	difyRuntimeBoundary,
	operatorMode,
	operatorShellPlanes,
	selectOperatorState
} from '$lib/operator/clear-shell';
import { ensureConciergeSession, getRequiredThreadView } from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, params, platform, url }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);

	const threadView = await getRequiredThreadView(
		ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url }),
		params.threadId,
		platform
	);
	const operatorState = selectOperatorState({
		threadStatus: threadView.thread.status,
		hasActionRequiredTool: threadView.thread.connectedTools.some(
			(tool) => tool.status === 'action_required'
		),
		hasBlockedArtifact: threadView.thread.artifacts.some((artifact) => artifact.status === 'blocked'),
		hasHandoff: threadView.hasHandoff
	});

	return {
		threadView,
		operatorMode,
		operatorShellPlanes,
		operatorState,
		clearCommunicationRules,
		difyRuntimeBoundary
	};
};
