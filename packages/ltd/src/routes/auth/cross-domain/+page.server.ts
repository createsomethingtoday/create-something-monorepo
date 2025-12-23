import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { setSessionCookies, type TokenResponse } from '@create-something/components/auth';

const IDENTITY_API = 'https://id.createsomething.space';

interface ExchangeResponse extends TokenResponse {
	user: {
		id: string;
		email: string;
		email_verified: boolean;
		name: string | null;
		avatar_url: string | null;
		tier: 'free' | 'pro' | 'agency';
		analytics_opt_out: boolean;
		created_at: string;
	};
}

interface ErrorResponse {
	error: string;
}

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const token = url.searchParams.get('token');
	const redirectTo = url.searchParams.get('redirect') || '/account';

	console.log('[Cross-Domain Exchange] Starting', {
		hasToken: !!token,
		tokenLength: token?.length,
		redirectTo
	});

	if (!token) {
		console.log('[Cross-Domain Exchange] No token provided');
		redirect(302, '/login?error=invalid_token');
	}

	try {
		// Exchange cross-domain token for session tokens
		console.log('[Cross-Domain Exchange] Calling identity-worker...');
		const response = await fetch(`${IDENTITY_API}/v1/auth/cross-domain/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token }),
		});

		console.log('[Cross-Domain Exchange] Identity response status:', response.status);

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			console.log('[Cross-Domain Exchange] Identity error:', errorResult);
			redirect(302, `/login?error=${encodeURIComponent(errorResult.error || 'exchange_failed')}`);
		}

		const result = (await response.json()) as ExchangeResponse;
		console.log('[Cross-Domain Exchange] Token exchanged successfully', {
			hasAccessToken: !!result.access_token,
			hasRefreshToken: !!result.refresh_token,
			userId: result.user?.id,
			userEmail: result.user?.email
		});

		// Set session cookies
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.ltd' : undefined;

		console.log('[Cross-Domain Exchange] Setting cookies', {
			isProduction,
			domain
		});

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain,
			},
			isProduction
		);

		console.log('[Cross-Domain Exchange] Cookies set, redirecting to:', redirectTo);

		// Redirect to final destination
		redirect(302, redirectTo);
	} catch (err) {
		// If it's already a redirect, re-throw it
		if (err instanceof Response || (err as { status?: number }).status === 302) {
			throw err;
		}

		console.error('[Cross-Domain Exchange] Error:', err);
		redirect(302, '/login?error=exchange_failed');
	}
};
