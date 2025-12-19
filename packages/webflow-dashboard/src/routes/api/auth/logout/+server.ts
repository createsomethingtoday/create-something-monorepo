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

	if (sessionToken) {
		try {
			// Delete session from KV
			await deleteSession(platform!.env.SESSIONS, sessionToken);
		} catch (error) {
			console.error('Session deletion error:', error);
			// Continue with logout even if KV deletion fails
		}
	}

	// Clear cookie
	cookies.delete('session_token', { path: '/' });

	return json({ message: 'Logged out successfully' });
};
