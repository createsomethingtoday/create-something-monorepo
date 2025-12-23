import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { IDENTITY_API, setSessionCookies, type TokenResponse } from '@create-something/components/auth';

interface VerifyResponse extends TokenResponse {
	// TokenResponse has access_token and refresh_token
}

interface ErrorResponse {
	error: string;
}

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const token = url.searchParams.get('token');
	const redirectTo = url.searchParams.get('redirect') || '/';

	if (!token) {
		redirect(302, '/login?error=invalid_token');
	}

	try {
		// Exchange magic link token for session tokens
		const response = await fetch(`${IDENTITY_API}/v1/auth/verify-magic-link`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token })
		});

		if (!response.ok) {
			const errorResult = (await response.json()) as ErrorResponse;
			redirect(302, `/login?error=${encodeURIComponent(errorResult.error || 'verification_failed')}`);
		}

		const result = (await response.json()) as VerifyResponse;

		// Set session cookies
		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.io' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction ?? true
		);

		// Redirect to intended destination
		redirect(302, redirectTo);
	} catch (err) {
		// If it's already a redirect, re-throw it
		if (err instanceof Response || (err as { status?: number }).status === 302) {
			throw err;
		}

		console.error('Magic link verification error:', err);
		redirect(302, '/login?error=verification_failed');
	}
};
