import type { AdminRequestResult } from './client';

export const SUPPORTED_ANALYTICS_PROPERTIES = ['agency', 'io', 'space', 'ltd', 'lms'] as const;
export type AnalyticsProperty = (typeof SUPPORTED_ANALYTICS_PROPERTIES)[number];
export type AnalyticsDays = 7 | 30 | 90;

export interface AnalyticsDashboardData {
	total_views: number;
	views_by_property: Array<{ property: string; count: number }>;
	top_pages: Array<{ path: string; property: string; count: number }>;
	top_experiments: Array<{ experiment_id: string; title?: string; count: number }>;
	top_countries: Array<{ country: string; count: number }>;
	daily_views: Array<{ date: string; count: number }>;
	top_referrers: Array<{ referrer: string; count: number }>;
	unified: {
		categoryBreakdown: Array<{ category: string; count: number }>;
		topActions: Array<{ action: string; count: number }>;
		sessionStats: { total: number; avgPageViews: number; avgDuration: number };
		dailyAggregates: Array<{
			date: string;
			category: string;
			action: string;
			count: number;
			uniqueSessions: number;
		}>;
		propertyTransitions: Array<{ source: string; target: string; count: number }>;
	};
}

export type AnalyticsDashboardState =
	| { status: 'ready'; analytics: AnalyticsDashboardData }
	| { status: 'error'; error: Extract<AdminRequestResult<never>, { ok: false }>['error'] };

export function createEmptyAnalyticsDashboard(): AnalyticsDashboardData {
	return {
		total_views: 0,
		views_by_property: [],
		top_pages: [],
		top_experiments: [],
		top_countries: [],
		daily_views: [],
		top_referrers: [],
		unified: {
			categoryBreakdown: [],
			topActions: [],
			sessionStats: { total: 0, avgPageViews: 0, avgDuration: 0 },
			dailyAggregates: [],
			propertyTransitions: []
		}
	};
}

export function getAnalyticsPropertyStats(analytics: AnalyticsDashboardData) {
	return SUPPORTED_ANALYTICS_PROPERTIES.map((property) => {
		const count = analytics.views_by_property.find((row) => row.property === property)?.count ?? 0;

		return {
			property,
			count,
			percentage:
				analytics.total_views > 0 ? Math.round((count / analytics.total_views) * 100) : 0
		};
	});
}

export function normalizeAnalyticsDays(value: string | null): AnalyticsDays {
	const days = Number.parseInt(value ?? '', 10);
	return days === 7 || days === 30 || days === 90 ? days : 30;
}

export function normalizeAnalyticsPath(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0) return '/';
	return value.startsWith('/') ? value : `/${value}`;
}

export function settleAnalyticsRequest(
	result: AdminRequestResult<AnalyticsDashboardData>
): AnalyticsDashboardState {
	if (result.ok) {
		return { status: 'ready', analytics: result.data };
	}

	return { status: 'error', error: result.error };
}
