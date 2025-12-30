import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IDENTITY_API, setSessionCookies, type TokenResponse, type User } from '@create-something/components/auth';
import { generateCorrelationId, logError } from '@create-something/components/utils';
import type { ApiResponse } from '@create-something/components/types';

interface SignupResponse extends TokenResponse {
	user: User;
}

interface IdentityErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const body = (await request.json()) as { email?: string; password?: string; name?: string; source?: string };
		const { email, password, name, source } = body;

		if (!email || !password) {
			return json(
				{ success: false, error: 'Email and password are required' } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const response = await fetch(`${IDENTITY_API}/v1/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name, source: source || 'agency' })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as IdentityErrorResponse;
			return json(
				{ success: false, error: errorResult.error || 'Signup failed' } as ApiResponse<never>,
				{ status: response.status }
			);
		}

		const result = (await response.json()) as SignupResponse;

		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.agency' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction ?? true
		);

		return json({ success: true, data: { user: result.user } } as ApiResponse<{ user: User }>);
	} catch (err) {
		const correlationId = generateCorrelationId();
		logError('Signup', err, correlationId);
		return json(
			{ success: false, error: 'Signup failed', correlationId } as ApiResponse<never>,
			{ status: 500 }
		);
	}
};
