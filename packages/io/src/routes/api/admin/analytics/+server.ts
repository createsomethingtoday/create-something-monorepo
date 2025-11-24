import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
	const db = platform?.env?.DB;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const days = parseInt(url.searchParams.get('days') || '30');

		// Total page views
		const totalViewsResult = await db
			.prepare(
				`SELECT COUNT(*) as count FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= datetime('now', '-${days} days')`
			)
			.first();

		// Page views by property
		const viewsByPropertyResult = await db
			.prepare(
				`SELECT property, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= datetime('now', '-${days} days')
				GROUP BY property
				ORDER BY count DESC`
			)
			.all();

		// Top pages
		const topPagesResult = await db
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
			.all();

		// Top experiments
		const topExperimentsResult = await db
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
			.all();

		// Top countries
		const topCountriesResult = await db
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
			.all();

		// Daily page views (last 30 days)
		const dailyViewsResult = await db
			.prepare(
				`SELECT DATE(created_at) as date, COUNT(*) as count
				FROM analytics_events
				WHERE event_type = 'page_view'
				AND created_at >= datetime('now', '-30 days')
				GROUP BY DATE(created_at)
				ORDER BY date DESC`
			)
			.all();

		// Referrers
		const topReferrersResult = await db
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
			.all();

		return json({
			total_views: totalViewsResult?.count || 0,
			views_by_property: viewsByPropertyResult.results || [],
			top_pages: topPagesResult.results || [],
			top_experiments: topExperimentsResult.results || [],
			top_countries: topCountriesResult.results || [],
			daily_views: dailyViewsResult.results || [],
			top_referrers: topReferrersResult.results || []
		});
	} catch (error) {
		console.error('Failed to fetch analytics:', error);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};
