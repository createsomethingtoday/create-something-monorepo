import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPlatformAnalyticsMetrics } from '$lib/server/analytics';

export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env?.DB;
	if (!db) {
		return json(
			{
				success: false,
				error: 'Database not available'
			},
			{ status: 503 }
		);
	}

	try {
		const metrics = await getPlatformAnalyticsMetrics(db, platform?.env?.VIDEO_STATS);
		return json({
			success: true,
			data: metrics,
			source: 'd1+kv'
		});
	} catch (error) {
		console.error('Platform analytics error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch platform analytics'
			},
			{ status: 500 }
		);
	}
};
