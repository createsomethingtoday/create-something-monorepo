import type { LayoutServerLoad } from './$types';

/**
 * OUTERFIELDS Root Layout Server Load
 *
 * Loads auth state for all pages
 */

export const load: LayoutServerLoad = async ({ cookies }) => {
	const sessionToken = cookies.get('session');

	if (!sessionToken) {
		return {
			user: null
		};
	}

	try {
		// In production, this would validate the session token with the Identity API
		// For demo purposes, we'll decode a simple mock token
		const [, payload] = sessionToken.split('.');
		if (!payload) {
			return { user: null };
		}

		const userData = JSON.parse(atob(payload));

		return {
			user: {
				id: userData.sub,
				email: userData.email,
				role: userData.role || 'user'
			}
		};
	} catch (error) {
		// Invalid token, clear it
		cookies.delete('session', { path: '/' });
		return { user: null };
	}
};
