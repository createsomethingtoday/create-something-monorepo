import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { setSessionCookies, type TokenResponse } from '@create-something/components/auth';

const IDENTITY_API = 'https://id.createsomething.space';

interface VerifyResponse extends TokenResponse {}

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

		const isProduction = platform?.env?.ENVIRONMENT === 'production';
		const domain = isProduction ? '.createsomething.agency' : undefined;

		setSessionCookies(
			cookies,
			{
				accessToken: result.access_token,
				refreshToken: result.refresh_token,
				domain
			},
			isProduction ?? true
		);

		redirect(302, redirectTo);
	} catch (err) {
		if (err instanceof Response || (err as { status?: number }).status === 302) {
			throw err;
		}

		console.error('Magic link verification error:', err);
		redirect(302, '/login?error=verification_failed');
	}
};
