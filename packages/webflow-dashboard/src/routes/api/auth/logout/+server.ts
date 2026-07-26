import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, deleteSession } from '$lib/server/kv';

/**
 * POST /api/auth/logout
 *
 * Invalidates the current session and clears the cookie.
 */
export const POST: RequestHandler = async ({ platform, cookies }) => {
	const sessionToken = cookies.get(SESSION_COOKIE_NAME);
	const sessions = platform?.env?.SESSIONS;

	if (sessionToken && sessions) {
		try {
			// Delete session from KV
			await deleteSession(sessions, sessionToken);
		} catch (error) {
			console.error('Session deletion error:', error);
			// Continue with logout even if KV deletion fails
		}
	}

	// Clear cookie with the same flags used when setting it
	cookies.delete(SESSION_COOKIE_NAME, {
		path: SESSION_COOKIE_OPTIONS.path,
		secure: SESSION_COOKIE_OPTIONS.secure,
		httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
		sameSite: SESSION_COOKIE_OPTIONS.sameSite
	});

	return json({ message: 'Logged out successfully' });
};
