import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processSubscription, type NewsletterRequest } from '@create-something/components/newsletter';
import { catchApiError, createLogger } from '@create-something/components/utils';

const logger = createLogger('NewsletterAPI');

export const POST: RequestHandler = catchApiError('Newsletter', async ({ request, platform, getClientAddress }) => {
	const body = (await request.json()) as NewsletterRequest;
	
	logger.info('Newsletter signup', { email: body.email });
	
	const { result, status } = await processSubscription(
		body,
		platform?.env,
		getClientAddress(),
		'agency'
	);
	
	if (result.success) {
		logger.info('Newsletter signup successful', { email: body.email });
	} else {
		logger.warn('Newsletter signup failed', { email: body.email, message: result.message });
	}
	
	return json(result, { status });
});
