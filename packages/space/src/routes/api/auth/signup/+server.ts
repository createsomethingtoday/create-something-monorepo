import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { setSessionCookies } from '@create-something/canon/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/canon/api';
import { catchApiError, apiError, createLogger } from '@create-something/canon/utils';

const logger = createLogger('SignupAPI');

export const POST: RequestHandler = catchApiError('Signup', async ({ request, cookies, platform }) => {
	const body = (await request.json()) as { email?: string; password?: string; name?: string; source?: string };
	const { email, password, name, source } = body;

	if (!email || !password) {
		return apiError('Email and password are required', 400);
	}

	logger.info('Signup attempt', { email });

	const result = await identityClient.signup({
		email,
		password,
		name,
		source: source || 'space'
	});

	if (!result.success) {
		logger.warn('Signup failed', { email, error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Signup failed') },
			{ status: result.status }
		);
	}

	const isProduction = platform?.env?.ENVIRONMENT === 'production';
	const domain = isProduction ? '.createsomething.space' : undefined;

	setSessionCookies(
		cookies,
		{
			accessToken: result.data.access_token,
			refreshToken: result.data.refresh_token,
			domain
		},
		isProduction
	);

	logger.info('Signup successful', { email, userId: result.data.user.id });
	return json({ success: true, user: result.data.user });
});
