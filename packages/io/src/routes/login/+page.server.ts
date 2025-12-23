import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSessionManager } from '@create-something/components/auth';

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	// Check if already authenticated
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.io'
	});

	const user = await session.getUser();
	if (user) {
		// Already logged in, redirect to home or intended destination
		const redirectTo = url.searchParams.get('redirect') || '/';
		redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/'
	};
};
