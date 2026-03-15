import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Behind-the-scenes: members only (client transcript)
	if (!locals.user) {
		redirect(302, '/login?redirect=/design');
	}

	if (!locals.user.membership) {
		redirect(302, '/#pricing');
	}

	return {};
};

