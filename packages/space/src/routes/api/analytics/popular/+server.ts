/**
 * Public Analytics: Popular Experiments
 *
 * Returns popular experiments based on view counts and engagement.
 * Works for both authenticated and anonymous users.
 *
 * GET /api/analytics/popular
 * Query params:
 *   - period: '7d' | '30d' | 'all' (default: '30d')
 *   - limit: number (default: 10, max: 50)
 *
 * For authenticated users, also returns their reading history.
 *
 * Note: .space only serves experiments (no papers), so type is fixed.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPopularAnalytics } from '@create-something/components/analytics';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Parse query params (type is always 'experiments' on .space)
	const period = (url.searchParams.get('period') || '30d') as '7d' | '30d' | 'all';
	const limit = parseInt(url.searchParams.get('limit') || '10');

	// Check for authenticated user
	const sessionToken = cookies.get('session_token');
	let userId: string | null = null;

	if (sessionToken) {
		try {
			const session = await db
				.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")')
				.bind(sessionToken)
				.first<{ user_id: string }>();
			userId = session?.user_id || null;
		} catch {
			// Continue as anonymous
		}
	}

	try {
		const result = await fetchPopularAnalytics(db, {
			type: 'experiments', // .space only has experiments
			period,
			limit,
			userId,
		});

		return json(result, {
			headers: {
				'Cache-Control': userId ? 'private, max-age=60' : 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('Popular analytics error:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};
