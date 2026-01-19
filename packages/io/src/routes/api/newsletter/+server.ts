import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processSubscription, type NewsletterRequest } from '@create-something/components/newsletter';
import { invalidateAdminStats } from '$lib/server/cache-invalidation';
import { catchApiError, createLogger } from '@create-something/components/utils';

const logger = createLogger('NewsletterAPI');

export const POST: RequestHandler = catchApiError('Newsletter', async ({ request, platform, getClientAddress }) => {
	const body = (await request.json()) as NewsletterRequest;
	
	logger.info('Newsletter signup', { email: body.email });
	
	const { result, status } = await processSubscription(
		body,
		platform?.env,
		getClientAddress(),
		'io'
	);

	// Invalidate admin stats cache when subscriber count changes
	if (result.success && platform?.env?.CACHE) {
		await invalidateAdminStats(platform.env.CACHE);
		logger.info('Newsletter signup successful, cache invalidated', { email: body.email });
	} else if (result.success) {
		logger.info('Newsletter signup successful', { email: body.email });
	} else {
		logger.warn('Newsletter signup failed', { email: body.email, message: result.message });
	}

	return json(result, { status });
});
