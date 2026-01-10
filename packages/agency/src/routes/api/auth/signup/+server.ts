import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	IDENTITY_API,
	getDomainConfig,
	handleIdentityResponse,
	createAuthErrorResponse,
	handleIdentityError,
	type TokenResponse,
	type User
} from '@create-something/components/auth';
import type { ApiResponse } from '@create-something/components/types';
import { signupSchema, parseBody } from '@create-something/components/validation';

interface SignupResponse extends TokenResponse {
	user: User;
}

interface IdentityErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		// Validate request body with Zod schema
		const parseResult = await parseBody(request, signupSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const { email, password, name, source } = parseResult.data;

		const response = await fetch(`${IDENTITY_API}/v1/auth/register`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name, source: source || 'agency' })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as IdentityErrorResponse;
			return handleIdentityError(errorResult, 'Signup failed', response.status);
		}

		const result = (await response.json()) as SignupResponse;
		const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);

		return handleIdentityResponse(cookies, result, domainConfig);
	} catch (err) {
		return createAuthErrorResponse('Signup', err);
	}
};
