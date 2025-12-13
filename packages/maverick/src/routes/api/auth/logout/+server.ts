/**
 * Auth Logout API - Clear session
 * POST /api/auth/logout
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('maverick_session', { path: '/' });

	return json({ success: true });
};
