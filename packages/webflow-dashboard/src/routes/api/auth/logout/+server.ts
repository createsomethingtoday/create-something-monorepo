import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const sessionToken = cookies.get('session_token');

	if (sessionToken) {
		// Delete session from KV
		const kv = platform?.env.SESSIONS;
		if (kv) {
			try {
				await deleteSession(kv, sessionToken);
			} catch (error) {
				console.error('Logout error:', error);
			}
		}
	}

	// Clear cookie
	cookies.delete('session_token', { path: '/' });

	return json({ message: 'Logged out successfully' });
};
