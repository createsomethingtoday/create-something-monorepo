import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { processSubscription, type NewsletterRequest } from '@create-something/components/newsletter';
import { invalidateAdminStats } from '$lib/server/cache-invalidation';

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
	try {
		const body = (await request.json()) as NewsletterRequest;
		const { result, status } = await processSubscription(
			body,
			platform?.env,
			getClientAddress(),
			'io'
		);

		// Invalidate admin stats cache when subscriber count changes
		if (result.success && platform?.env?.CACHE) {
			await invalidateAdminStats(platform.env.CACHE);
		}

		return json(result, { status });
	} catch (err) {
		console.error('Newsletter signup error:', err);
		return json(
			{
				success: false,
				message: `Error processing newsletter signup: ${err instanceof Error ? err.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
};
