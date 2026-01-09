import type { LayoutServerLoad } from './$types';

/**
 * OUTERFIELDS Root Layout Server Load
 *
 * Loads auth state for all pages
 */

export const load: LayoutServerLoad = async ({ cookies }) => {
	const accessToken = cookies.get('access_token');
	const userRole = cookies.get('user_role');

	if (!accessToken) {
		return {
			user: null
		};
	}

	try {
		// Decode the demo token (base64 encoded JSON)
		const userData = JSON.parse(atob(accessToken));

		// Check if token is expired
		if (userData.exp && userData.exp < Date.now()) {
			cookies.delete('access_token', { path: '/' });
			cookies.delete('user_role', { path: '/' });
			return { user: null };
		}

		return {
			user: {
				id: userData.id,
				email: userData.email,
				name: userData.name,
				role: userRole || userData.role || 'user'
			}
		};
	} catch (error) {
		// Invalid token, clear it
		cookies.delete('access_token', { path: '/' });
		cookies.delete('user_role', { path: '/' });
		return { user: null };
	}
};
