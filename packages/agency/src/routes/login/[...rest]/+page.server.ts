import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEFAULT_REDIRECT = '/dashboard';

export const load: PageServerLoad = async ({ url, locals }) => {
	const redirectTo = url.searchParams.get('redirect') || DEFAULT_REDIRECT;

	// Already authenticated — skip login
	if (locals.user) {
		throw redirect(302, redirectTo);
	}

	return {
		redirectTo,
		error: url.searchParams.get('error') || null,
	};
};
