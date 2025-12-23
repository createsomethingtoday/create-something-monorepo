import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const IDENTITY_API = 'https://id.createsomething.space';

interface ErrorResponse {
	error: string;
}

interface MagicLoginRequest {
	email?: string;
	source?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as MagicLoginRequest;
		const { email, source } = body;

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		// Request magic link from Identity Worker
		const response = await fetch(`${IDENTITY_API}/v1/auth/magic-login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, source: source || 'io' })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json(
				{ error: errorResult.error || 'Failed to send magic link' },
				{ status: response.status }
			);
		}

		return json({ success: true });
	} catch (error) {
		console.error('Magic login error:', error);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
