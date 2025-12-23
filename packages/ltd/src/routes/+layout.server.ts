import type { LayoutServerLoad } from './$types';
import { createSessionManager } from '@create-something/components/auth';

export const load: LayoutServerLoad = async ({ url, cookies, platform }) => {
	// Get user from session cookies (with auto-refresh)
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.ltd'
	});

	const user = await session.getUser();

	return {
		pathname: url.pathname,
		user
	};
};
