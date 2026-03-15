import { error } from '@sveltejs/kit';
import { buildProfileAudit } from '$server/profile/extractor';
import { getDemoThread } from '$server/threads/demo';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const thread = getDemoThread(params.threadId);

	if (!thread) {
		throw error(404, `Unknown demo thread: ${params.threadId}`);
	}

	return {
		thread,
		audit: buildProfileAudit(thread.profile)
	};
};
