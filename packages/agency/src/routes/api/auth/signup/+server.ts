import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDomainConfig, handleIdentityResponse } from '@create-something/components/auth';
import { identityClient, getIdentityErrorMessage } from '@create-something/components/api';
import { catchApiError, createLogger } from '@create-something/components/utils';
import { signupSchema, parseBody } from '@create-something/components/validation';

const logger = createLogger('SignupAPI');

export const POST: RequestHandler = catchApiError('Signup', async ({ request, cookies, platform }) => {
	const parseResult = await parseBody(request, signupSchema);
	if (!parseResult.success) {
		return json({ success: false, error: parseResult.error }, { status: 400 });
	}

	const { email, password, name, source } = parseResult.data;

	logger.info('Signup attempt', { email });

	const result = await identityClient.signup({
		email,
		password,
		name,
		source: source || 'agency'
	});

	if (!result.success) {
		logger.warn('Signup failed', { email, error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Signup failed') },
			{ status: result.status }
		);
	}

	logger.info('Signup successful', { email, userId: result.data.user.id });
	const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);
	return handleIdentityResponse(cookies, result.data, domainConfig);
});
