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

	// Fetch analytics_opt_out from local database if user is logged in
	let analytics_opt_out = false;
	if (user && platform?.env?.DB) {
		try {
			const dbUser = await platform.env.DB
				.prepare('SELECT analytics_opt_out FROM users WHERE id = ?')
				.bind(user.id)
				.first<{ analytics_opt_out: number }>();
			analytics_opt_out = dbUser?.analytics_opt_out === 1;
		} catch (err) {
			console.warn('[IO Layout] Failed to fetch analytics_opt_out:', err);
		}
	}

	return {
		turnstileSiteKey: platform?.env?.TURNSTILE_SITE_KEY ?? '',
		user: user ? { ...user, analytics_opt_out } : null
	};
};
