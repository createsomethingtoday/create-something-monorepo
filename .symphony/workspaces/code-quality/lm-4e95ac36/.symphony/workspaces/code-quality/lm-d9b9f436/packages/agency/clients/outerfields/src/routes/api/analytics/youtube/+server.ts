/**
 * YouTube Analytics API Endpoint
 *
 * Returns live subscriber/view metrics based on platform data.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
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
		const [membersResult, platformMetrics] = await Promise.all([
			db.prepare('SELECT COUNT(*) as count FROM users WHERE membership = 1').first<{ count: number }>(),
			getPlatformAnalyticsMetrics(db, platform?.env?.VIDEO_STATS)
		]);

		const subscribers = Number(membersResult?.count || 0);

		return json({
			success: true,
			data: {
				subscribers,
				views: platformMetrics.totalViews,
				avgViews: platformMetrics.avgViews
			},
			source: 'd1+kv'
		});
	} catch (error) {
		console.error('YouTube analytics error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch YouTube analytics'
			},
			{ status: 500 }
		);
	}
};
