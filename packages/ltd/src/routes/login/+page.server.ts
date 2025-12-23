import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { createSessionManager } from '@create-something/components/auth';

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.ltd'
	});

	const user = await session.getUser();
	if (user) {
		const redirectTo = url.searchParams.get('redirect') || '/';
		redirect(302, redirectTo);
	}

	return {
		redirectTo: url.searchParams.get('redirect') || '/'
	};
};
