import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IDENTITY_API, setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';

interface LoginResponse extends TokenResponse {
	user: User;
}

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = (await request.json()) as { email?: string; password?: string };
		const { email, password } = body;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		const response = await fetch(`${IDENTITY_API}/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json({ error: errorResult.error || 'Invalid credentials' }, { status: response.status });
		}

		const result = (await response.json()) as LoginResponse;

		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.ltd' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction ?? true
		);

		return json({ success: true, user: result.user });
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: 'Login failed' }, { status: 500 });
	}
};
