import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/kv';

/**
 * POST /api/auth/logout
 *
 * Invalidates the current session and clears the cookie.
 */
export const POST: RequestHandler = async ({ platform, cookies }) => {
	const sessionToken = cookies.get('session_token');
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

	// Clear cookie with same flags used when setting
	cookies.delete('session_token', { 
		path: '/',
		secure: true,
		httpOnly: true,
		sameSite: 'none'
	});

	return json({ message: 'Logged out successfully' });
};
