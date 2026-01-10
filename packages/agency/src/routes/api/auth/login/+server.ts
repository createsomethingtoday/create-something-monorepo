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
import { loginSchema, parseBody } from '@create-something/components/validation';

interface LoginResponse extends TokenResponse {
	user: User;
}

interface IdentityErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		// Validate request body with Zod schema
		const parseResult = await parseBody(request, loginSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const { email, password } = parseResult.data;

		const response = await fetch(`${IDENTITY_API}/v1/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as IdentityErrorResponse;
			return handleIdentityError(errorResult, 'Invalid credentials', response.status);
		}

		const result = (await response.json()) as LoginResponse;
		const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);

		return handleIdentityResponse(cookies, result, domainConfig);
	} catch (err) {
		return createAuthErrorResponse('Login', err);
	}
};
