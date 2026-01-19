import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { setSessionCookies } from '@create-something/components/auth';
import { identityClient } from '@create-something/components/api';
import { createLogger } from '@create-something/components/utils';

const logger = createLogger('MagicLinkCallback');

export const load: PageServerLoad = async ({ url, cookies, platform }) => {
	const token = url.searchParams.get('token');
	const redirectTo = url.searchParams.get('redirect') || '/';

	if (!token) {
		redirect(302, '/login?error=invalid_token');
	}

	const result = await identityClient.verifyMagicLink({ token });

	if (!result.success) {
		logger.warn('Magic link verification failed', { error: result.error });
		redirect(302, `/login?error=${encodeURIComponent(result.error || 'verification_failed')}`);
	}

	const isProduction = platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.agency' : undefined;

	setSessionCookies(
		cookies,
		{
			accessToken: result.data.access_token,
			refreshToken: result.data.refresh_token,
			domain
		},
		isProduction ?? true
	);

	logger.info('Magic link verified', { userId: result.data.user?.id });
	redirect(302, redirectTo);
};
