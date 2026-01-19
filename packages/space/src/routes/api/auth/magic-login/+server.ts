import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { identityClient, getIdentityErrorMessage } from '@create-something/components/api';
import { catchApiError, apiError, createLogger } from '@create-something/components/utils';

const logger = createLogger('MagicLoginAPI');

export const POST: RequestHandler = catchApiError('MagicLogin', async ({ request }) => {
	const body = (await request.json()) as { email?: string; source?: string };
	const { email, source } = body;

	if (!email) {
		return apiError('Email is required', 400);
	}

	logger.info('Magic login requested', { email });

	const result = await identityClient.magicLogin({ email, source: source || 'space' });

	if (!result.success) {
		logger.warn('Magic login failed', { email, error: result.error });
		return json(
			{ error: getIdentityErrorMessage(result, 'Failed to send magic link') },
			{ status: result.status }
		);
	}

	logger.info('Magic link sent', { email });
	return json({ success: true });
});
