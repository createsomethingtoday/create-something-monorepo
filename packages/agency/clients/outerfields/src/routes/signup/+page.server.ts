import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	// If already authenticated, skip signup
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirect') || '/demo';
		redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/demo'
	};
};
