import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME, getSession } from '$lib/server/kv';

/**
 * GET /api/auth/check-session
 *
 * Validates the current session and returns user info.
 */
export const GET: RequestHandler = async ({ platform, cookies }) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	const sessions = platform?.env?.SESSIONS;

	if (!sessionToken) {
		return json({ authenticated: false }, { status: 401 });
	}

	if (!sessions) {
		return json({ authenticated: false, error: 'Authentication service unavailable' }, { status: 503 });
	}

	try {
		const sessionData = await getSession(sessions, sessionToken);

		if (!sessionData) {
			// Clear invalid cookie
			cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
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
