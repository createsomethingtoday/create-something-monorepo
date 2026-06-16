import { error } from '@sveltejs/kit';
import { buildProfileAudit } from '$server/profile/extractor';
import { determineNextStep } from '$server/orchestration/next-step';
import { getDemoThread } from '$server/threads/demo';
import { splitWidgetsByPlacement } from '$server/widgets/select';
import {
	clearCommunicationRules,
	difyRuntimeBoundary,
	operatorMode,
	operatorShellPlanes,
	selectOperatorState
} from '$lib/operator/clear-shell';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const thread = getDemoThread(params.threadId);

	if (!thread) {
		throw error(404, `Unknown demo thread: ${params.threadId}`);
	}

	const widgets = splitWidgetsByPlacement(thread);
	const operatorState = selectOperatorState({
		threadStatus: thread.status,
		hasActionRequiredTool: thread.connectedTools.some((tool) => tool.status === 'action_required'),
		hasBlockedArtifact: thread.artifacts.some((artifact) => artifact.status === 'blocked')
	});

	return {
		thread,
		nextStep: determineNextStep(thread),
		profileAudit: buildProfileAudit(thread.profile),
		inlineWidgets: widgets.inline,
		railWidgets: widgets.rail,
		operatorMode,
		operatorShellPlanes,
		operatorState,
		clearCommunicationRules,
		difyRuntimeBoundary
	};
};
