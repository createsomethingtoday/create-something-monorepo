import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { IDENTITY_API, setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';

interface SignupResponse extends TokenResponse {
	user: User;
}

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = await request.json() as { email?: string; password?: string; name?: string; source?: string };
		const { email, password, name, source } = body;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		// Forward to Identity Worker
		const response = await fetch(`${IDENTITY_API}/v1/auth/signup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name, source: source || 'space' })
		});

		if (!response.ok) {
			const errorResult = await response.json() as ErrorResponse;
			return json(
				{ error: errorResult.error || 'Signup failed' },
				{ status: response.status }
			);
		}

		const result = await response.json() as SignupResponse;

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
		console.error('Signup error:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
