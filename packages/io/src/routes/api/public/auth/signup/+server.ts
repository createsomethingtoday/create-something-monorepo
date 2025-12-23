import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';

const IDENTITY_API = 'https://id.createsomething.space';

interface SignupResponse extends TokenResponse {
	user: User;
}

interface ErrorResponse {
	error: string;
}

interface SignupRequest {
	email?: string;
	password?: string;
	name?: string;
	source?: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = (await request.json()) as SignupRequest;
		const { email, password, name, source } = body;

		if (!email || !password) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		// Register via Identity Worker
		const response = await fetch(`${IDENTITY_API}/v1/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email,
				password,
				name,
				source: source || 'io'
			})
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json({ error: errorResult.error || 'Signup failed' }, { status: response.status });
		}

		const result = (await response.json()) as SignupResponse;

		// Set session cookies
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.io' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction ?? true
		);

		return json({
			success: true,
			user: result.user
		});
	} catch (error) {
		console.error('Signup error:', error);
		return json({ error: 'Signup failed' }, { status: 500 });
	}
};
