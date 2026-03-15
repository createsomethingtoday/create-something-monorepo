import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setSessionCookies } from '@create-something/canon/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/canon/api';
import { catchApiError, apiError, createLogger } from '@create-something/canon/utils';

const logger = createLogger('LoginAPI');

export const POST: RequestHandler = catchApiError('Login', async ({ request, cookies, platform }) => {
	const body = (await request.json()) as { email?: string; password?: string };
	const { email, password } = body;

	if (!email || !password) {
		return apiError('Email and password are required', 400);
	}

	logger.info('Login attempt', { email });

	const result = await identityClient.login({ email, password });

	if (!result.success) {
		logger.warn('Login failed', { email, error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Invalid credentials') },
			{ status: result.status }
		);
	}

	const { access_token, refresh_token, user } = result.data;
	const isProduction = platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.ltd' : undefined;

	setSessionCookies(
		cookies,
		{ accessToken: access_token, refreshToken: refresh_token, domain },
		isProduction ?? true
	);

	logger.info('Login successful', { email, userId: user.id });
	return json({ success: true, user });
});
