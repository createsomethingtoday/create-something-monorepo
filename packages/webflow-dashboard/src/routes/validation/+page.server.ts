import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	return {
		user: locals.user
	};
};
