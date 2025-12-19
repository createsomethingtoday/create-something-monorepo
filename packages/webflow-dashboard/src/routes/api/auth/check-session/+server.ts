import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/kv';

/**
 * GET /api/auth/check-session
 *
 * Validates the current session and returns user info.
 */
export const GET: RequestHandler = async ({ platform, cookies }) => {
	const sessionToken = cookies.get('session_token');

	if (!sessionToken) {
		return json({ authenticated: false }, { status: 401 });
	}

	try {
		const sessionData = await getSession(platform!.env.SESSIONS, sessionToken);

		if (!sessionData) {
			// Clear invalid cookie
			cookies.delete('session_token', { path: '/' });
			return json({ authenticated: false }, { status: 401 });
		}

		return json({
			authenticated: true,
			user: { email: sessionData.email }
		});
	} catch (error) {
		console.error('Session check error:', error);
		return json({ authenticated: false, error: 'Session validation failed' }, { status: 500 });
	}
};
