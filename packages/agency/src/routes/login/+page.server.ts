import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const redirectTo = url.searchParams.get('redirect_url') ?? url.searchParams.get('redirect');
	const signInUrl = new URL('/sign-in', url);

	if (redirectTo) {
		signInUrl.searchParams.set('redirect_url', redirectTo);
	}

	throw redirect(302, signInUrl.toString());
};
