import { error } from '@sveltejs/kit';
import { buildProfileAudit } from '$server/profile/extractor';
import { determineNextStep } from '$server/orchestration/next-step';
import { getDemoThread } from '$server/threads/demo';
import { splitWidgetsByPlacement } from '$server/widgets/select';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const thread = getDemoThread(params.threadId);

	if (!thread) {
		throw error(404, `Unknown demo thread: ${params.threadId}`);
	}

	const widgets = splitWidgetsByPlacement(thread);

	return {
		thread,
		nextStep: determineNextStep(thread),
		profileAudit: buildProfileAudit(thread.profile),
		inlineWidgets: widgets.inline,
		railWidgets: widgets.rail
	};
};
