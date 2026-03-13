/**
 * Auth Login API - Authenticate user
 * POST /api/auth/login
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeEqual } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = await request.json() as { email?: string; password?: string };
		const { password } = body;

		if (!password) {
			throw error(400, 'Password required');
		}

		const adminPasswordHash = platform?.env?.ADMIN_PASSWORD_HASH;
		if (!adminPasswordHash) {
			console.error('ADMIN_PASSWORD_HASH not configured');
			throw error(500, 'Auth not configured');
		}

		// Constant-time comparison to prevent timing attacks
		if (!timingSafeEqual(password, adminPasswordHash)) {
			throw error(401, 'Invalid credentials');
		}

		// Generate session and store in KV
		const sessionToken = crypto.randomUUID();
		const sessionData = JSON.stringify({
			email: 'admin@maverickx.com',
			createdAt: Date.now()
		});

		const sessions = platform?.env?.SESSIONS;
		if (sessions) {
			await sessions.put(sessionToken, sessionData, {
				expirationTtl: 86400 // 24 hours
			});
		}

		cookies.set('maverick_session', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 86400 // 24 hours
		});

		return json({
			success: true,
			user: {
				email: 'admin@maverickx.com',
				name: 'Admin'
			}
		});
	} catch (e) {
		if ((e as { status?: number }).status) {
			throw e;
		}
		console.error('Login error:', e);
		throw error(401, 'Invalid credentials');
	}
};
