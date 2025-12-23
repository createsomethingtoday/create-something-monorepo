/**
 * Public Analytics: Popular Content
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
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface PopularContent {
	path: string;
	title: string;
	type: 'experiment';
	views: number;
	uniqueSessions: number;
	avgReadTime: number;
	avgScrollDepth: number;
}

interface UserReadingHistory {
	path: string;
	title: string;
	type: 'experiment';
	lastViewed: string;
	viewCount: number;
	maxScrollDepth: number;
	totalTimeSpent: number;
}

interface PopularResponse {
	popular: PopularContent[];
	trending: PopularContent[];
	userHistory?: UserReadingHistory[];
	period: string;
	generatedAt: string;
}

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const period = url.searchParams.get('period') || '30d';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

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

	// Date range
	const now = new Date();
	let startDate: string;
	switch (period) {
		case '7d':
			startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
			break;
		case '30d':
			startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
			break;
		default:
			startDate = '2020-01-01T00:00:00Z';
	}

	const pathFilter = "AND url LIKE '%/experiments/%'";

	try {
		// Popular experiments
		const popularQuery = `
			SELECT
				url as path,
				COUNT(*) as views,
				COUNT(DISTINCT session_id) as unique_sessions,
				COALESCE(AVG(CASE WHEN action = 'time_on_page' THEN value END), 0) as avg_read_time,
				COALESCE(MAX(CASE WHEN action = 'scroll_depth' THEN value END), 0) as avg_scroll_depth
			FROM unified_events
			WHERE category IN ('navigation', 'content')
				AND action IN ('page_view', 'time_on_page', 'scroll_depth')
				AND created_at >= ?
				${pathFilter}
			GROUP BY url
			ORDER BY views DESC
			LIMIT ?
		`;

		const popularResults = await db.prepare(popularQuery).bind(startDate, limit).all<{
			path: string;
			views: number;
			unique_sessions: number;
			avg_read_time: number;
			avg_scroll_depth: number;
		}>();

		// Trending
		const trendingQuery = `
			WITH recent AS (
				SELECT url, COUNT(*) as views
				FROM unified_events
				WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-7 days')
					${pathFilter}
				GROUP BY url
			),
			previous AS (
				SELECT url, COUNT(*) as views
				FROM unified_events
				WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-14 days')
					AND created_at < datetime('now', '-7 days')
					${pathFilter}
				GROUP BY url
			)
			SELECT
				r.url as path,
				r.views as recent_views,
				COALESCE(p.views, 0) as previous_views,
				CASE WHEN COALESCE(p.views, 0) = 0 THEN 100
					 ELSE ((r.views - p.views) * 100.0 / p.views)
				END as growth
			FROM recent r
			LEFT JOIN previous p ON r.url = p.url
			WHERE r.views >= 3
			ORDER BY growth DESC
			LIMIT ?
		`;

		const trendingResults = await db.prepare(trendingQuery).bind(limit).all<{
			path: string;
			recent_views: number;
			previous_views: number;
			growth: number;
		}>();

		const popular: PopularContent[] = (popularResults.results || []).map((row) => ({
			path: row.path,
			title: extractTitle(row.path),
			type: 'experiment' as const,
			views: row.views,
			uniqueSessions: row.unique_sessions,
			avgReadTime: Math.round(row.avg_read_time || 0),
			avgScrollDepth: Math.round(row.avg_scroll_depth || 0)
		}));

		const trending: PopularContent[] = (trendingResults.results || []).map((row) => ({
			path: row.path,
			title: extractTitle(row.path),
			type: 'experiment' as const,
			views: row.recent_views,
			uniqueSessions: 0,
			avgReadTime: 0,
			avgScrollDepth: 0
		}));

		const response: PopularResponse = {
			popular,
			trending,
			period,
			generatedAt: new Date().toISOString()
		};

		// User history if authenticated
		if (userId) {
			const userHistoryQuery = `
				SELECT
					url as path,
					COUNT(*) as view_count,
					MAX(created_at) as last_viewed,
					MAX(CASE WHEN action = 'scroll_depth' THEN value ELSE 0 END) as max_scroll_depth,
					SUM(CASE WHEN action = 'time_on_page' THEN value ELSE 0 END) as total_time_spent
				FROM unified_events
				WHERE user_id = ?
					AND category IN ('navigation', 'content')
					${pathFilter}
				GROUP BY url
				ORDER BY last_viewed DESC
				LIMIT 20
			`;

			const userResults = await db.prepare(userHistoryQuery).bind(userId).all<{
				path: string;
				view_count: number;
				last_viewed: string;
				max_scroll_depth: number;
				total_time_spent: number;
			}>();

			response.userHistory = (userResults.results || []).map((row) => ({
				path: row.path,
				title: extractTitle(row.path),
				type: 'experiment' as const,
				lastViewed: row.last_viewed,
				viewCount: row.view_count,
				maxScrollDepth: Math.round(row.max_scroll_depth || 0),
				totalTimeSpent: Math.round(row.total_time_spent || 0)
			}));
		}

		return json(response, {
			headers: {
				'Cache-Control': userId ? 'private, max-age=60' : 'public, max-age=300'
			}
		});
	} catch (error) {
		console.error('Popular analytics error:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};

function extractTitle(path: string): string {
	const slug = path.split('/').pop() || '';
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
