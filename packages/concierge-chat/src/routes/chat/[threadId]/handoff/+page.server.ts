import { error } from '@sveltejs/kit';
import { createHandoffPacket } from '$server/handoff/create-packet';
import { getDemoThread } from '$server/threads/demo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const thread = getDemoThread(params.threadId);

	if (!thread) {
		throw error(404, `Unknown demo thread: ${params.threadId}`);
	}

	return {
		thread,
		packet: createHandoffPacket(thread)
	};
};
