import type { LayoutServerLoad } from './$types';
import { createSessionManager } from '@create-something/components/auth';

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
	// Get user from session cookies (with auto-refresh)
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.agency'
	});

	const user = await session.getUser();

	return {
		user
	};
};
