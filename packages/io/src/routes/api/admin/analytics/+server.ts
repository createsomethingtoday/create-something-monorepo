import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const days = parseInt(url.searchParams.get('days') || '30');

		// Run all queries in parallel
		const [
			// Legacy analytics_events queries
			totalViewsResult,
			viewsByPropertyResult,
			topPagesResult,
			topExperimentsResult,
			topCountriesResult,
			dailyViewsResult,
			topReferrersResult,
			// Unified events queries
			unifiedCategoryBreakdown,
			unifiedTopActions,
			unifiedSessionStats,
			unifiedDailyAggregates,
			// Cross-property flow data
			propertyTransitions,
		] = await Promise.all([
			// Total page views (legacy)
			db
				.prepare(
					`SELECT COUNT(*) as count FROM analytics_events
					WHERE event_type = 'page_view'
					AND created_at >= datetime('now', '-${days} days')`
				)
				.first(),

			// Page views by property (legacy)
			db
				.prepare(
					`SELECT property, COUNT(*) as count
					FROM analytics_events
					WHERE event_type = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					GROUP BY property
					ORDER BY count DESC`
				)
				.all(),

			// Top pages (legacy)
			db
				.prepare(
					`SELECT path, property, COUNT(*) as count
					FROM analytics_events
					WHERE event_type = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					AND path IS NOT NULL
					GROUP BY path, property
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Top experiments (legacy)
			db
				.prepare(
					`SELECT e.experiment_id, p.title, COUNT(*) as count
					FROM analytics_events e
					LEFT JOIN papers p ON e.experiment_id = p.id
					WHERE e.event_type IN ('page_view', 'experiment_view')
					AND e.experiment_id IS NOT NULL
					AND e.created_at >= datetime('now', '-${days} days')
					GROUP BY e.experiment_id, p.title
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Top countries (legacy)
			db
				.prepare(
					`SELECT country, COUNT(*) as count
					FROM analytics_events
					WHERE event_type = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					AND country != ''
					GROUP BY country
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Daily page views (legacy)
			db
				.prepare(
					`SELECT DATE(created_at) as date, COUNT(*) as count
					FROM analytics_events
					WHERE event_type = 'page_view'
					AND created_at >= datetime('now', '-30 days')
					GROUP BY DATE(created_at)
					ORDER BY date ASC`
				)
				.all(),

			// Referrers (legacy)
			db
				.prepare(
					`SELECT referrer, COUNT(*) as count
					FROM analytics_events
					WHERE event_type = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					AND referrer IS NOT NULL
					AND referrer != ''
					GROUP BY referrer
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Unified: Category breakdown
			db
				.prepare(
					`SELECT category, COUNT(*) as count
					FROM unified_events
					WHERE created_at >= datetime('now', '-${days} days')
					AND property = 'io'
					GROUP BY category
					ORDER BY count DESC`
				)
				.all(),

			// Unified: Top actions
			db
				.prepare(
					`SELECT action, COUNT(*) as count
					FROM unified_events
					WHERE created_at >= datetime('now', '-${days} days')
					AND property = 'io'
					GROUP BY action
					ORDER BY count DESC
					LIMIT 15`
				)
				.all(),

			// Unified: Session stats
			db
				.prepare(
					`SELECT
						COUNT(DISTINCT id) as total,
						AVG(page_views) as avgPageViews,
						AVG(COALESCE(duration_seconds, 0)) as avgDuration
					FROM unified_sessions
					WHERE started_at >= datetime('now', '-${days} days')
					AND property = 'io'`
				)
				.first(),

			// Unified: Daily aggregates
			db
				.prepare(
					`SELECT date, category, action, count, unique_sessions as uniqueSessions
					FROM unified_events_daily
					WHERE date >= date('now', '-${days} days')
					AND property = 'io'
					ORDER BY date ASC, count DESC`
				)
				.all(),

			// Cross-property transitions (Anti-Concierge wayfinding)
			db
				.prepare(
					`SELECT
						json_extract(metadata, '$.sourceProperty') as source,
						json_extract(metadata, '$.targetProperty') as target,
						COUNT(*) as count
					FROM unified_events
					WHERE action = 'property_transition'
					AND created_at >= datetime('now', '-${days} days')
					GROUP BY source, target
					ORDER BY count DESC
					LIMIT 20`
				)
				.all(),
		]);

		return json({
			// Legacy data
			total_views: (totalViewsResult as { count: number } | null)?.count || 0,
			views_by_property: viewsByPropertyResult.results || [],
			top_pages: topPagesResult.results || [],
			top_experiments: topExperimentsResult.results || [],
			top_countries: topCountriesResult.results || [],
			daily_views: dailyViewsResult.results || [],
			top_referrers: topReferrersResult.results || [],
			// Unified data
			unified: {
				categoryBreakdown: unifiedCategoryBreakdown.results || [],
				topActions: unifiedTopActions.results || [],
				sessionStats: {
					total: (unifiedSessionStats as { total: number } | null)?.total || 0,
					avgPageViews: (unifiedSessionStats as { avgPageViews: number } | null)?.avgPageViews || 0,
					avgDuration: (unifiedSessionStats as { avgDuration: number } | null)?.avgDuration || 0,
				},
				dailyAggregates: unifiedDailyAggregates.results || [],
				propertyTransitions: propertyTransitions.results || [],
			},
		});
	} catch (error) {
		console.error('Failed to fetch analytics:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};
