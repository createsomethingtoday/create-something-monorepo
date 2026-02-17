import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAdminUser } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) {
		redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	if (!isAdminUser(locals.user, platform?.env)) {
		throw error(403, 'Admin access required');
	}

	return {
		user: locals.user
	};
};

