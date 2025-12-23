import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getSessionCookies } from '@create-something/components/auth';

const IDENTITY_API = 'https://id.createsomething.space';

const TARGET_DOMAINS: Record<string, string> = {
	ltd: 'https://createsomething.ltd',
	io: 'https://createsomething.io',
	space: 'https://createsomething.space',
	agency: 'https://createsomething.agency',
	lms: 'https://learn.createsomething.space',
};

interface GenerateResponse {
	token: string;
	expires_in: number;
}

interface ErrorResponse {
	error: string;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		// Get target and redirect params
		const target = url.searchParams.get('target');
		const redirect = url.searchParams.get('redirect') || '/account';

		if (!target || !TARGET_DOMAINS[target]) {
			return json({ error: 'Invalid target property' }, { status: 400 });
		}

		// Check if user is logged in
		const session = getSessionCookies(cookies);
		if (!session.accessToken) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Call identity-worker to generate cross-domain token
		const response = await fetch(`${IDENTITY_API}/v1/auth/cross-domain/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.accessToken}`,
			},
			body: JSON.stringify({ target }),
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			return json({ error: errorResult.error || 'Token generation failed' }, { status: response.status });
		}

		const result = (await response.json()) as GenerateResponse;

		// Build redirect URL with token and final destination
		const targetUrl = new URL('/auth/cross-domain', TARGET_DOMAINS[target]);
		targetUrl.searchParams.set('token', result.token);
		targetUrl.searchParams.set('redirect', redirect);

		// Redirect to target property
		return new Response(null, {
			status: 302,
			headers: {
				Location: targetUrl.toString(),
			},
		});
	} catch (err) {
		console.error('Cross-domain SSO error:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
