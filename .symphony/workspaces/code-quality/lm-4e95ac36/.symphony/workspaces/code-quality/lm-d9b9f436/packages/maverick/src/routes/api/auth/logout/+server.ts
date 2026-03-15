/**
 * Auth Logout API - Clear session
 * POST /api/auth/logout
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const sessionId = cookies.get('maverick_session');

	// Delete session from KV store
	if (sessionId && platform?.env?.SESSIONS) {
		await platform.env.SESSIONS.delete(sessionId);
	}

	cookies.delete('maverick_session', { path: '/' });

	return json({ success: true });
};
