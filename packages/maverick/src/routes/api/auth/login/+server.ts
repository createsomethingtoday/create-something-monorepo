/**
 * Auth Login API - Authenticate user
 * POST /api/auth/login
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple password check - in production use proper auth
const ADMIN_PASSWORD = 'maverick2024';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password } = await request.json();

		if (!email || !password) {
			throw error(400, 'Email and password required');
		}

		// Simple auth check
		if (password !== ADMIN_PASSWORD) {
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
