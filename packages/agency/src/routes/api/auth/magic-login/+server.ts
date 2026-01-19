import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { identityClient, getIdentityErrorMessage } from '@create-something/components/api';
import { catchApiError, createLogger } from '@create-something/components/utils';
import { magicLinkSchema, parseBody } from '@create-something/components/validation';

const logger = createLogger('MagicLoginAPI');

export const POST: RequestHandler = catchApiError('MagicLogin', async ({ request }) => {
	const parseResult = await parseBody(request, magicLinkSchema);
	if (!parseResult.success) {
		return json({ success: false, error: parseResult.error }, { status: 400 });
	}

	const { email } = parseResult.data;

	logger.info('Magic login request', { email });

	const result = await identityClient.magicLogin({ email, source: 'agency' });

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
