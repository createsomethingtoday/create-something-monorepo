import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { IDENTITY_API, getSessionCookies } from '@create-something/components/auth';

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

		console.log('[Cross-Domain Generate .space] Starting', { target, redirect });

		if (!target || !TARGET_DOMAINS[target]) {
			console.log('[Cross-Domain Generate .space] Invalid target:', target);
			return json({ error: 'Invalid target property' }, { status: 400 });
		}

		// Check if user is logged in
		const session = getSessionCookies(cookies);
		console.log('[Cross-Domain Generate .space] Session check', {
			hasAccessToken: !!session.accessToken,
			hasRefreshToken: !!session.refreshToken
		});

		if (!session.accessToken) {
			console.log('[Cross-Domain Generate .space] No access token');
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Call identity-worker to generate cross-domain token
		console.log('[Cross-Domain Generate .space] Calling identity-worker...');
		const response = await fetch(`${IDENTITY_API}/v1/auth/cross-domain/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.accessToken}`,
			},
			body: JSON.stringify({ target }),
		});

		console.log('[Cross-Domain Generate .space] Identity response status:', response.status);

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			console.log('[Cross-Domain Generate .space] Identity error:', errorResult);
			return json({ error: errorResult.error || 'Token generation failed' }, { status: response.status });
		}

		const result = (await response.json()) as GenerateResponse;
		console.log('[Cross-Domain Generate .space] Token generated, expires_in:', result.expires_in);

		// Build redirect URL with token and final destination
		const targetUrl = new URL('/auth/cross-domain', TARGET_DOMAINS[target]);
		targetUrl.searchParams.set('token', result.token);
		targetUrl.searchParams.set('redirect', redirect);

		console.log('[Cross-Domain Generate .space] Redirecting to:', targetUrl.toString());

		// Redirect to target property
		return new Response(null, {
			status: 302,
			headers: {
				Location: targetUrl.toString(),
			},
		});
	} catch (err) {
		console.error('[Cross-Domain Generate .space] Error:', err);
		return json({ error: 'An unexpected error occurred' }, { status: 500 });
	}
};
