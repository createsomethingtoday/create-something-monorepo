import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
	UserAnalytics,
	PropertyAnalytics,
	PropertyBreakdown,
	DailyActivityPoint,
	CategoryBreakdown,
	TopPage,
	Property
} from '@create-something/components/analytics';

/**
 * Property URLs for fetching analytics
 * In production, these will be the actual domain URLs
 */
const PROPERTY_URLS: Record<Property, string> = {
	io: '', // Local fetch (same origin)
	space: 'https://createsomething.space',
	ltd: 'https://createsomething.ltd',
	agency: 'https://createsomething.agency',
	lms: 'https://learn.createsomething.space'
};

/**
 * GET /api/user/analytics/aggregate
 *
 * Aggregates analytics data from all CREATE SOMETHING properties
 * for the authenticated user. Returns a unified UserAnalytics object.
 */
export const GET: RequestHandler = async ({ locals, url, fetch: localFetch }) => {
	// Get user from locals (set by auth middleware)
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Authentication required');
	}

	const days = url.searchParams.get('days') || '30';

	try {
		// Fetch from all properties in parallel
		const propertyResults = await Promise.allSettled([
			// Local fetch for .io (same origin)
			localFetch(`/api/user/analytics?days=${days}`).then((r) => r.json() as Promise<PropertyAnalytics>),
			// Cross-origin fetches for other properties
			fetchPropertyAnalytics('space', userId, days),
			fetchPropertyAnalytics('ltd', userId, days),
			fetchPropertyAnalytics('agency', userId, days),
			fetchPropertyAnalytics('lms', userId, days)
		]);

		// Extract successful results
		const successfulResults: PropertyAnalytics[] = [];
		propertyResults.forEach((result, index) => {
			if (result.status === 'fulfilled' && result.value) {
				successfulResults.push(result.value);
			} else if (result.status === 'rejected') {
				const properties: Property[] = ['io', 'space', 'ltd', 'agency', 'lms'];
				console.warn(`Failed to fetch analytics from ${properties[index]}:`, result.reason);
			}
		});

		// Merge results into unified analytics
		const aggregated = mergePropertyAnalytics(successfulResults);

		return json(aggregated);
	} catch (err) {
		console.error('Failed to aggregate user analytics:', err);
		throw error(500, 'Failed to aggregate analytics');
	}
};

/**
 * Fetch analytics from a specific property
 */
async function fetchPropertyAnalytics(
	property: Property,
	userId: string,
	days: string
): Promise<PropertyAnalytics | null> {
	const baseUrl = PROPERTY_URLS[property];
	if (!baseUrl) return null;

	try {
		// Note: In production, this would need proper service-to-service auth
		// For now, using userId param which the endpoint accepts
		const response = await fetch(
			`${baseUrl}/api/user/analytics?userId=${encodeURIComponent(userId)}&days=${days}&token=internal`,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		if (!response.ok) {
			console.warn(`Property ${property} returned ${response.status}`);
			return null;
		}

		return await response.json();
	} catch (err) {
		console.warn(`Failed to fetch from ${property}:`, err);
		return null;
	}
}

/**
 * Merge multiple PropertyAnalytics into a unified UserAnalytics
 */
function mergePropertyAnalytics(results: PropertyAnalytics[]): UserAnalytics {
	// Calculate totals
	let totalSessions = 0;
	let totalPageViews = 0;
	let totalDurationSeconds = 0;

	// Build property breakdown
	const propertyBreakdown: PropertyBreakdown[] = [];

	// Collect daily activity (merge by date)
	const dailyMap = new Map<string, number>();

	// Collect category breakdown (merge by category)
	const categoryMap = new Map<string, number>();

	// Collect top pages (with property tag)
	const allTopPages: TopPage[] = [];

	for (const result of results) {
		// Aggregate totals
		totalSessions += result.sessions.total;
		totalPageViews += result.sessions.pageViews;
		totalDurationSeconds += result.sessions.durationSeconds;

		// Add to property breakdown
		propertyBreakdown.push({
			property: result.property,
			sessions: result.sessions.total,
			pageViews: result.sessions.pageViews,
			timeMinutes: Math.round(result.sessions.durationSeconds / 60)
		});

		// Merge daily activity
		for (const day of result.dailyActivity) {
			const existing = dailyMap.get(day.date) || 0;
			dailyMap.set(day.date, existing + day.count);
		}

		// Merge category breakdown
		for (const cat of result.categoryBreakdown) {
			const existing = categoryMap.get(cat.category) || 0;
			categoryMap.set(cat.category, existing + cat.count);
		}

		// Collect top pages with property tag
		for (const page of result.topPages) {
			allTopPages.push({
				url: page.url,
				property: result.property,
				views: page.views
			});
		}
	}

	// Convert daily map to sorted array
	const dailyActivity: DailyActivityPoint[] = Array.from(dailyMap.entries())
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));

	// Convert category map to sorted array
	const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
		.map(([category, count]) => ({
			category: category as CategoryBreakdown['category'],
			count
		}))
		.sort((a, b) => b.count - a.count);

	// Sort top pages by views and take top 10
	const topPages = allTopPages.sort((a, b) => b.views - a.views).slice(0, 10);

	return {
		totalSessions,
		totalPageViews,
		totalTimeMinutes: Math.round(totalDurationSeconds / 60),
		dailyActivity,
		propertyBreakdown: propertyBreakdown.filter((p) => p.sessions > 0 || p.timeMinutes > 0),
		topPages,
		categoryBreakdown
	};
}
