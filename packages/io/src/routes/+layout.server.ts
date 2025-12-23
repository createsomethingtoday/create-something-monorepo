import type { LayoutServerLoad } from './$types';
import { createSessionManager } from '@create-something/components/auth';

export const load: LayoutServerLoad = async ({ cookies, platform }) => {
	// Get user from session cookies (with auto-refresh)
	const session = createSessionManager(cookies, {
		isProduction: platform?.env?.ENVIRONMENT === 'production',
		domain: '.createsomething.io'
	});

	const user = await session.getUser();

	// Debug logging for SSO investigation
	console.log('[IO Layout] User loaded:', {
		hasUser: !!user,
		userId: user?.id,
		email: user?.email
	});

	return {
		turnstileSiteKey: platform?.env?.TURNSTILE_SITE_KEY ?? '',
		user
	};
};
