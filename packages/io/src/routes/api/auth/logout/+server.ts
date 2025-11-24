import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	try {
		const sessionToken = cookies.get('session');

		if (sessionToken) {
			const db = platform?.env?.DB;
			if (db) {
				// Delete session from database (using id as token)
				await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionToken).run();
			}
		}

		// Clear session cookie
		cookies.delete('session', { path: '/' });

		return json({ success: true });
	} catch (error) {
		console.error('Logout error:', error);
		return json({ error: 'Logout failed' }, { status: 500 });
	}
};
