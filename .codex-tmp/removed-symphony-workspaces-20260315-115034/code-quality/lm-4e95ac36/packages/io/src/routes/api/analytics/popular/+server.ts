/**
 * Public Analytics: Popular Content
 *
 * Returns popular papers and experiments based on view counts and engagement.
 * Works for both authenticated and anonymous users.
 *
 * GET /api/analytics/popular
 * Query params:
 *   - type: 'papers' | 'experiments' | 'all' (default: 'all')
 *   - period: '7d' | '30d' | 'all' (default: '30d')
 *   - limit: number (default: 10, max: 50)
 *
 * For authenticated users, also returns their reading history.
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import {
	fetchPopularAnalytics,
	type ContentType,
} from '@create-something/canon/analytics';

export const GET = async ({ url, platform, cookies }: RequestEvent) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	// Parse query params
	const type = (url.searchParams.get('type') || 'all') as ContentType;
	const period = (url.searchParams.get('period') || '30d') as '7d' | '30d' | 'all';
	const limit = parseInt(url.searchParams.get('limit') || '10');

	// Check for authenticated user (from session cookie)
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
			// Session validation failed, continue as anonymous
		}
	}

	try {
		const result = await fetchPopularAnalytics(db, {
			type,
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
