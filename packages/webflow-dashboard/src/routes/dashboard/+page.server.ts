import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// User is guaranteed to exist here due to hooks.server.ts protection
	return {
		user: locals.user
	};
};
