import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const IDENTITY_API = 'https://id.createsomething.space';

interface SignupResponse {
	access_token: string;
	refresh_token: string;
	user: {
		id: string;
		email: string;
		name?: string;
	};
}

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const body = await request.json();
		const { email, password, name, source } = body;

		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		const response = await fetch(`${IDENTITY_API}/v1/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email,
				password,
				name,
				source: source || 'outerfields'
			})
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json(
				{ success: false, error: errorResult.error || 'Signup failed' },
				{ status: response.status }
			);
		}

		const result = (await response.json()) as SignupResponse;

		// Set session cookies
		cookies.set('access_token', result.access_token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 // 1 hour
		});

		cookies.set('refresh_token', result.refresh_token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ success: true, data: { user: result.user } });
	} catch (err) {
		console.error('Signup error:', err);
		return json({ success: false, error: 'Signup failed' }, { status: 500 });
	}
};
