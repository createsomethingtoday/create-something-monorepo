import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectTo = url.searchParams.get('redirect') || '/dashboard';

	if (locals.user) {
		throw redirect(302, redirectTo);
	}

	return { redirectTo };
};
