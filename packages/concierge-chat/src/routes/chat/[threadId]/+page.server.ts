import type { PageServerLoad } from './$types';
import { CONCIERGE_SESSION_DEPENDENCY } from '$chat/api-contract';
import {
	buildOperatorCommandCenter,
	clearCommunicationRules,
	agentRuntimeBoundary,
	operatorMode,
	operatorShellPlanes,
	selectOperatorState
} from '$lib/operator/clear-shell';
import {
	ensureConciergeSession,
	getRequiredThreadView,
	getWorkspacePageData
} from '$lib/server/threads/session';

export const load: PageServerLoad = async ({ depends, cookies, params, platform, url }) => {
	depends(CONCIERGE_SESSION_DEPENDENCY);
	const sessionId = ensureConciergeSession(cookies, url.protocol === 'https:', { platform, url });

	const threadView = await getRequiredThreadView(sessionId, params.threadId, platform);
	const workspaceData = await getWorkspacePageData(sessionId, platform);
	const operatorState = selectOperatorState({
		threadStatus: threadView.thread.status,
		hasActionRequiredTool: threadView.thread.connectedTools.some(
			(tool) => tool.status === 'action_required'
		),
		hasBlockedArtifact: threadView.thread.artifacts.some((artifact) => artifact.status === 'blocked'),
		hasHandoff: threadView.hasHandoff
	});
	const operatorCommandCenter = buildOperatorCommandCenter({
		thread: threadView.thread,
		nextStep: threadView.nextStep,
		operatorState,
		inlineWidgetCount: threadView.inlineWidgets.length,
		railWidgetCount: threadView.railWidgets.length,
		hasHandoff: threadView.hasHandoff
	});

	return {
		threadView,
		...workspaceData,
		operatorMode,
		operatorShellPlanes,
		operatorState,
		operatorCommandCenter,
		clearCommunicationRules,
		agentRuntimeBoundary
	};
};
