/**
 * Admin Analytics API
 *
 * Fetches analytics data from unified_events and related tables
 * for the admin analytics dashboard.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const days = parseInt(url.searchParams.get('days') || '7', 10);

	try {
		// Fetch all data in parallel
		const [dailyAggregates, recentEvents, categoryBreakdown, topActions, sessionStats] =
			await Promise.all([
				// Daily aggregates from unified_events_daily
				db
					.prepare(
						`SELECT date, category, action, count, unique_sessions as uniqueSessions
						 FROM unified_events_daily
						 WHERE date >= date('now', ? || ' days')
						 ORDER BY date ASC, count DESC`
					)
					.bind(`-${days}`)
					.all(),

				// Recent events
				db
					.prepare(
						`SELECT id, category, action, target, url, created_at
						 FROM unified_events
						 WHERE created_at >= datetime('now', ? || ' days')
						 ORDER BY created_at DESC
						 LIMIT 50`
					)
					.bind(`-${days}`)
					.all(),

				// Category breakdown
				db
					.prepare(
						`SELECT category, COUNT(*) as count
						 FROM unified_events
						 WHERE created_at >= datetime('now', ? || ' days')
						 GROUP BY category
						 ORDER BY count DESC`
					)
					.bind(`-${days}`)
					.all(),

				// Top actions
				db
					.prepare(
						`SELECT action, COUNT(*) as count
						 FROM unified_events
						 WHERE created_at >= datetime('now', ? || ' days')
						 GROUP BY action
						 ORDER BY count DESC
						 LIMIT 20`
					)
					.bind(`-${days}`)
					.all(),

				// Session stats
				db
					.prepare(
						`SELECT
						   COUNT(DISTINCT id) as total,
						   AVG(page_views) as avgPageViews,
						   AVG(COALESCE(duration_seconds, 0)) as avgDuration
						 FROM unified_sessions
						 WHERE started_at >= datetime('now', ? || ' days')`
					)
					.bind(`-${days}`)
					.first(),
			]);

		return json({
			dailyAggregates: dailyAggregates.results || [],
			recentEvents: recentEvents.results || [],
			categoryBreakdown: categoryBreakdown.results || [],
			topActions: topActions.results || [],
			sessionStats: {
				total: (sessionStats as any)?.total || 0,
				avgPageViews: (sessionStats as any)?.avgPageViews || 0,
				avgDuration: (sessionStats as any)?.avgDuration || 0,
			},
		});
	} catch (error) {
		console.error('Analytics error:', error);
		return json(
			{
				dailyAggregates: [],
				recentEvents: [],
				categoryBreakdown: [],
				topActions: [],
				sessionStats: { total: 0, avgPageViews: 0, avgDuration: 0 },
			},
			{ status: 200 }
		);
	}
};
