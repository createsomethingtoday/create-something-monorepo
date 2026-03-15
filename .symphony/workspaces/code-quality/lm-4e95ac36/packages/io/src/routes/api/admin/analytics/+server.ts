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
			// Unified analytics queries
			totalViewsResult,
			viewsByPropertyResult,
			topPagesResult,
			topExperimentsResult,
			topCountriesResult,
			dailyViewsResult,
			topReferrersResult,
			// Behavioral analytics
			unifiedCategoryBreakdown,
			unifiedTopActions,
			unifiedSessionStats,
			unifiedDailyAggregates,
			// Cross-property flow data
			propertyTransitions,
		] = await Promise.all([
			// Total page views from unified_events
			db
				.prepare(
					`SELECT COUNT(*) as count FROM unified_events
					WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-${days} days')`
				)
				.first(),

			// Page views by property from unified_events
			db
				.prepare(
					`SELECT property, COUNT(*) as count
					FROM unified_events
					WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					GROUP BY property
					ORDER BY count DESC`
				)
				.all(),

			// Top pages from unified_events (extract path from url)
			db
				.prepare(
					`SELECT
						CASE
							WHEN instr(url, '?') > 0 THEN substr(url, instr(url, '://') + 3)
							ELSE substr(url, instr(url, '://') + 3)
						END as full_url,
						substr(
							CASE
								WHEN instr(url, '?') > 0 THEN substr(url, 1, instr(url, '?') - 1)
								ELSE url
							END,
							instr(url, '://') + 3 + instr(substr(url, instr(url, '://') + 3), '/')
						) as path,
						property,
						COUNT(*) as count
					FROM unified_events
					WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					AND url IS NOT NULL
					GROUP BY path, property
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Top experiments from unified_events (extract from URL)
			db
				.prepare(
					`SELECT
						substr(url, instr(url, '/experiments/') + 13) as experiment_id,
						COUNT(*) as count
					FROM unified_events
					WHERE category = 'navigation'
					AND action = 'page_view'
					AND url LIKE '%/experiments/%'
					AND created_at >= datetime('now', '-${days} days')
					GROUP BY experiment_id
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Top countries from unified_events
			db
				.prepare(
					`SELECT ip_country as country, COUNT(*) as count
					FROM unified_events
					WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-${days} days')
					AND ip_country IS NOT NULL
					AND ip_country != ''
					GROUP BY ip_country
					ORDER BY count DESC
					LIMIT 10`
				)
				.all(),

			// Daily page views from unified_events
			db
				.prepare(
					`SELECT DATE(created_at) as date, COUNT(*) as count
					FROM unified_events
					WHERE category = 'navigation' AND action = 'page_view'
					AND created_at >= datetime('now', '-30 days')
					GROUP BY DATE(created_at)
					ORDER BY date ASC`
				)
				.all(),

			// Referrers from unified_events
			db
				.prepare(
					`SELECT referrer, COUNT(*) as count
					FROM unified_events
					WHERE category = 'navigation' AND action = 'page_view'
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
