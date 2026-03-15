/**
 * Instagram Analytics API Endpoint
 *
 * Returns live social-style health metrics derived from platform data.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { getRecentEngagementRate, getRecentVideoCount } from '$lib/server/analytics';

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
		const usersResult = await db
			.prepare('SELECT COUNT(*) as count FROM users')
			.first<{ count: number }>();
		const followers = Number(usersResult?.count || 0);

		const [engagement, recentPosts] = await Promise.all([
			getRecentEngagementRate(db),
			getRecentVideoCount(db, 30)
		]);

		return json({
			success: true,
			data: {
				followers,
				engagement,
				recentPosts
			},
			source: 'd1'
		});
	} catch (error) {
		console.error('Instagram analytics error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch Instagram analytics'
			},
			{ status: 500 }
		);
	}
};
