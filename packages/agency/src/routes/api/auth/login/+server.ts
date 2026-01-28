import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDomainConfig, handleIdentityResponse } from '@create-something/canon/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/canon/api';
import { catchApiError, createLogger } from '@create-something/canon/utils';
import { loginSchema, parseBody } from '@create-something/canon/validation';

const logger = createLogger('LoginAPI');

export const POST: RequestHandler = catchApiError('Login', async ({ request, cookies, platform }) => {
	const parseResult = await parseBody(request, loginSchema);
	if (!parseResult.success) {
		return json({ success: false, error: parseResult.error }, { status: 400 });
	}

	const { email, password } = parseResult.data;

	logger.info('Login attempt', { email });

	const result = await identityClient.login({ email, password });

	if (!result.success) {
		logger.warn('Login failed', { email, error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Invalid credentials') },
			{ status: result.status }
		);
	}

	logger.info('Login successful', { email, userId: result.data.user.id });
	const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);
	return handleIdentityResponse(cookies, result.data, domainConfig);
});
