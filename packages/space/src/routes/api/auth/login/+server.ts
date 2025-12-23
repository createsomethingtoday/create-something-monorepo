import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { IDENTITY_API, setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';

interface LoginResponse extends TokenResponse {
	user: User;
}

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = await request.json() as { email?: string; password?: string };
		const { email, password } = body;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		// Forward to Identity Worker
		const response = await fetch(`${IDENTITY_API}/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!response.ok) {
			const errorResult = await response.json() as ErrorResponse;
			return json(
				{ error: errorResult.error || 'Login failed' },
				{ status: response.status }
			);
		}

		const result = await response.json() as LoginResponse;

		// Set session cookies
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.space' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction
		);

		return json({
			success: true,
			user: result.user
		});
	} catch (err) {
		console.error('Login error:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
