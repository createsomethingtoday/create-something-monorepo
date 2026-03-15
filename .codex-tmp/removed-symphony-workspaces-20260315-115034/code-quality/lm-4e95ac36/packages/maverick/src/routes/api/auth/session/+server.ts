/**
 * Auth Session API - Check authentication status
 * GET /api/auth/session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateSession } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies, platform }) => {
	const sessionToken = cookies.get('maverick_session');

	if (!sessionToken) {
		return json({ authenticated: false });
	}

	const sessions = platform?.env?.SESSIONS;
	if (!sessions) {
		return json({ authenticated: false });
	}

	const session = await validateSession(sessionToken, sessions);

	if (!session) {
		// Invalid session — clear the stale cookie
		cookies.delete('maverick_session', { path: '/' });
		return json({ authenticated: false });
	}

	return json({
		authenticated: true,
		user: {
			email: session.email,
			name: 'Admin'
		}
	});
};
