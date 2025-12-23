import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { IDENTITY_API, setSessionCookies, type TokenResponse } from '@create-something/components/auth';

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

	console.log('[Cross-Domain Exchange .space] Starting', {
		hasToken: !!token,
		tokenLength: token?.length,
		redirectTo
	});

	if (!token) {
		console.log('[Cross-Domain Exchange .space] No token provided');
		redirect(302, '/login?error=invalid_token');
	}

	try {
		// Exchange cross-domain token for session tokens
		console.log('[Cross-Domain Exchange .space] Calling identity-worker...');
		const response = await fetch(`${IDENTITY_API}/v1/auth/cross-domain/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token }),
		});

		console.log('[Cross-Domain Exchange .space] Identity response status:', response.status);

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			console.log('[Cross-Domain Exchange .space] Identity error:', errorResult);
			const errorMsg = encodeURIComponent(errorResult.error || 'exchange_failed');
			redirect(302, `/login?error=${errorMsg}`);
		}

		const result = (await response.json()) as ExchangeResponse;
		console.log('[Cross-Domain Exchange .space] Token exchanged successfully', {
			hasAccessToken: !!result.access_token,
			hasRefreshToken: !!result.refresh_token,
			userId: result.user?.id
		});

		// Set session cookies
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.space' : undefined;

		console.log('[Cross-Domain Exchange .space] Setting cookies', { isProduction, domain });

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain,
			},
			isProduction ?? true
		);

		console.log('[Cross-Domain Exchange .space] Redirecting to:', redirectTo);

		// Redirect to final destination
		redirect(302, redirectTo);
	} catch (err) {
		// If it's already a redirect, re-throw it
		if (err instanceof Response || (err as { status?: number }).status === 302) {
			throw err;
		}

		console.error('[Cross-Domain Exchange .space] Error:', err);
		redirect(302, '/login?error=exchange_failed');
	}
};
