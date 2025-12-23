import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IDENTITY_API, setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';

interface SignupResponse extends TokenResponse {
	user: User;
}

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = (await request.json()) as { email?: string; password?: string; name?: string; source?: string };
		const { email, password, name, source } = body;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		const response = await fetch(`${IDENTITY_API}/v1/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name, source: source || 'ltd' })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json({ error: errorResult.error || 'Signup failed' }, { status: response.status });
		}

		const result = (await response.json()) as SignupResponse;

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
		console.error('Signup error:', error);
		return json({ error: 'Signup failed' }, { status: 500 });
	}
};
