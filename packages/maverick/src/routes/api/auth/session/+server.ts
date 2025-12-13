/**
 * Auth Session API - Check authentication status
 * GET /api/auth/session
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionToken = cookies.get('maverick_session');

	if (!sessionToken) {
		return json({ authenticated: false });
	}

	// For now, any valid session token means authenticated
	// In production, validate against a session store
	return json({
		authenticated: true,
		user: {
			email: 'admin@maverickx.com',
			name: 'Admin'
		}
	});
};
