import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Check if already authenticated via session
	if (locals.user) {
		const redirectTo = url.searchParams.get('redirect') || (locals.user.role === 'admin' ? '/admin' : '/demo');
		redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/demo'
	};
};
