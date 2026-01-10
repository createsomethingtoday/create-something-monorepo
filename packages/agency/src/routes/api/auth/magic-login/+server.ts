import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	IDENTITY_API,
	createAuthErrorResponse,
	handleIdentityError
} from '@create-something/components/auth';
import type { ApiResponse } from '@create-something/components/types';
import { magicLinkSchema, parseBody } from '@create-something/components/validation';

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Validate request body with Zod schema
		const parseResult = await parseBody(request, magicLinkSchema);
		if (!parseResult.success) {
			return json(
				{ success: false, error: parseResult.error } as ApiResponse<never>,
				{ status: 400 }
			);
		}

		const { email } = parseResult.data;

		const response = await fetch(`${IDENTITY_API}/v1/auth/magic-login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, source: 'agency' })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return handleIdentityError(errorResult, 'Failed to send magic link', response.status);
		}

		return json({ success: true } as ApiResponse<void>);
	} catch (error) {
		return createAuthErrorResponse('Magic login', error, 'An unexpected error occurred');
	}
};
