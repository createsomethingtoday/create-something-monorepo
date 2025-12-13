/**
 * Signup API Route
 *
 * Proxies to Identity Worker and sets cookies.
 *
 * Canon: Creation begins with a single step.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';

interface SignupRequest {
	email: string;
	password: string;
	name?: string;
}

interface AuthResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	user: {
		id: string;
		email: string;
		name?: string;
	};
	error?: string;
	message?: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = (await request.json()) as SignupRequest;

		const response = await fetch(`${IDENTITY_WORKER}/v1/auth/signup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...body,
				source: 'lms', // Tag users as coming from LMS
			}),
		});

		const data = (await response.json()) as AuthResponse;

		if (!response.ok) {
			return json(data, { status: response.status });
		}

		// Set cookies for the tokens
		cookies.set('cs_access_token', data.access_token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: data.expires_in,
		});

		cookies.set('cs_refresh_token', data.refresh_token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60, // 7 days
		});

		return json({ success: true, user: data.user });
	} catch (error) {
		console.error('Signup error:', error);
		return json({ error: 'internal_error', message: 'Signup failed' }, { status: 500 });
	}
};
