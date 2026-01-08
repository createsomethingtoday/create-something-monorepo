import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	// Redirect to login page with signup mode hint
	const redirectTo = url.searchParams.get('redirect') || '/demo';
	redirect(302, `/login?redirect=${encodeURIComponent(redirectTo)}&mode=signup`);
};
