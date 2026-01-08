import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Check if already authenticated via cookie
	const accessToken = cookies.get('access_token');
	if (accessToken) {
		const redirectTo = url.searchParams.get('redirect') || '/demo';
		redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/demo'
	};
};
