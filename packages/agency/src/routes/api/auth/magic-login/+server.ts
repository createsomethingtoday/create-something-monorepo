import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { IDENTITY_API } from '@create-something/components/auth';

interface ErrorResponse {
	error: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as { email?: string; source?: string };
		const { email, source } = body;

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		const response = await fetch(`${IDENTITY_API}/v1/auth/magic-login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, source: source || 'agency' })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json({ error: errorResult.error || 'Failed to send magic link' }, { status: response.status });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Magic login error:', error);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
