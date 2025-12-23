import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSessionManager } from '@create-something/components/auth';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	// Check if user is already authenticated
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.space'
	});

	const user = await session.getUser();

	// If already logged in, redirect to home or intended destination
	if (user) {
		const redirectTo = url.searchParams.get('redirect') || '/';
		throw redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/'
	};
};
