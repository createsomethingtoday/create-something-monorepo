import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PropertyAnalytics, DailyActivityPoint, CategoryBreakdown } from '@create-something/components/analytics';

const PROPERTY = 'space' as const;

/**
 * GET /api/user/analytics
 *
 * Returns analytics data for the authenticated user from this property.
 * Used by the cross-property aggregator to build unified user analytics.
 */
export const GET: RequestHandler = async ({ locals, platform, url }) => {
	const db = platform?.env?.DB;

	if (!db) {
		throw error(500, 'Database not available');
	}

	// Get user from locals (set by auth middleware)
	const userId = locals.user?.id;

	// Also check for internal service token (for aggregator calls)
	const serviceToken = url.searchParams.get('token');
	const requestUserId = url.searchParams.get('userId');

	// If no authenticated user and no valid service token, return 401
	if (!userId && !serviceToken) {
		throw error(401, 'Authentication required');
	}

	// Use the user ID from locals or from the query param (for service calls)
	const targetUserId = userId || requestUserId;

	if (!targetUserId) {
		throw error(400, 'User ID required');
	}

	const days = parseInt(url.searchParams.get('days') || '30');

	try {
		// Run all queries in parallel
		const [sessionsResult, dailyResult, categoryResult, topPagesResult] = await Promise.all([
			// Sessions summary
			db
				.prepare(
					`SELECT
						COUNT(*) as total,
						COALESCE(SUM(page_views), 0) as page_views,
						COALESCE(SUM(duration_seconds), 0) as duration_seconds
					FROM unified_sessions
					WHERE user_id = ?
					AND started_at >= datetime('now', '-' || ? || ' days')`
				)
				.bind(targetUserId, days)
				.first<{ total: number; page_views: number; duration_seconds: number }>(),

			// Daily activity
			db
				.prepare(
					`SELECT date, SUM(count) as count
					FROM unified_events_daily
					WHERE property = ?
					AND date >= date('now', '-' || ? || ' days')
					GROUP BY date
					ORDER BY date`
				)
				.bind(PROPERTY, days)
				.all<{ date: string; count: number }>(),

			// Category breakdown
			db
				.prepare(
					`SELECT category, COUNT(*) as count
					FROM unified_events
					WHERE user_id = ?
					AND created_at >= datetime('now', '-' || ? || ' days')
					GROUP BY category
					ORDER BY count DESC`
				)
				.bind(targetUserId, days)
				.all<{ category: string; count: number }>(),

			// Top pages
			db
				.prepare(
					`SELECT url, COUNT(*) as views
					FROM unified_events
					WHERE user_id = ?
					AND action = 'page_view'
					AND created_at >= datetime('now', '-' || ? || ' days')
					GROUP BY url
					ORDER BY views DESC
					LIMIT 10`
				)
				.bind(targetUserId, days)
				.all<{ url: string; views: number }>()
		]);

		const sessions = sessionsResult || { total: 0, page_views: 0, duration_seconds: 0 };
		const dailyActivity: DailyActivityPoint[] = dailyResult.results || [];
		const categoryBreakdown: CategoryBreakdown[] = (categoryResult.results || []).map((r) => ({
			category: r.category as CategoryBreakdown['category'],
			count: r.count
		}));
		const topPages = topPagesResult.results || [];

		const response: PropertyAnalytics = {
			property: PROPERTY,
			sessions: {
				total: sessions.total,
				pageViews: sessions.page_views,
				durationSeconds: sessions.duration_seconds
			},
			dailyActivity,
			categoryBreakdown,
			topPages
		};

		return json(response);
	} catch (err) {
		console.error('Failed to fetch user analytics:', err);
		throw error(500, 'Failed to fetch analytics');
	}
};
