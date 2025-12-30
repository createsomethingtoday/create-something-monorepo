/**
 * Auth Login API - Authenticate user
 * POST /api/auth/login
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const adminPassword = platform?.env?.ADMIN_PASSWORD;
		if (!adminPassword) {
			console.error('ADMIN_PASSWORD not configured');
			throw error(500, 'Server configuration error');
		}

		const body = await request.json() as { email?: string; password?: string };
		const { email, password } = body;

		if (!email || !password) {
			throw error(400, 'Email and password required');
		}

		// Simple auth check
		if (password !== adminPassword) {
			throw error(401, 'Invalid credentials');
		}

		// Set session cookie
		const sessionToken = crypto.randomUUID();
		cookies.set('maverick_session', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		return json({
			success: true,
			user: {
				email,
				name: 'Admin'
			}
		});
	} catch (e) {
		console.error('Login error:', e);
		throw error(401, 'Invalid credentials');
	}
};
