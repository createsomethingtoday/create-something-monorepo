import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Logout API endpoint.
 *
 * With Clerk, sign-out is handled client-side via clerk.signOut().
 * This endpoint exists for server-initiated logout (e.g., session revocation).
 * It clears legacy cookies and returns a redirect URL.
 */

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		// Clear any legacy session cookies that may linger from Auth0
		const legacyCookies = ['cs_access_token', 'cs_refresh_token', 'cs_auth_state', 'cs_auth_redirect'];
		for (const name of legacyCookies) {
			cookies.delete(name, { path: '/' });
		}

		const url = new URL(request.url);

		return json({
			success: true,
			logoutUrl: `${url.origin}/login`,
		});
	} catch (error) {
		console.error('Logout error:', error);
		return json({ error: 'Logout failed' }, { status: 500 });
	}
};
