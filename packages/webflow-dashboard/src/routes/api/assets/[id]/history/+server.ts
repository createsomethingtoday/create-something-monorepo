/**
 * Analytics History API
 * 
 * Returns historical snapshots for an asset's analytics.
 * Used to generate real sparkline trends in the dashboard.
 * 
 * GET /api/assets/:id/history?days=30
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface AnalyticsSnapshot {
	captured_at: string;
	unique_viewers: number;
	cumulative_purchases: number;
	cumulative_revenue: number;
}

export interface HistoryResponse {
	asset_id: string;
	snapshots: AnalyticsSnapshot[];
	/** Number of days of data available */
	days_available: number;
}

export const GET: RequestHandler = async ({ params, url, locals, platform }) => {
	// Require authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;
	if (!id) {
		throw error(400, 'Asset ID required');
	}

	const db = platform?.env?.DB;
	if (!db) {
		// Return empty history if DB not configured (graceful degradation)
		return json({
			asset_id: id,
			snapshots: [],
			days_available: 0
		} satisfies HistoryResponse);
	}

	// Default to 30 days, max 90 days
	const daysParam = url.searchParams.get('days');
	const days = Math.min(Math.max(parseInt(daysParam || '30', 10) || 30, 1), 90);

	try {
		const result = await db.prepare(`
			SELECT 
				captured_at,
				unique_viewers,
				cumulative_purchases,
				cumulative_revenue
			FROM analytics_snapshots
			WHERE asset_id = ?
			ORDER BY captured_at DESC
			LIMIT ?
		`).bind(id, days).all<AnalyticsSnapshot>();

		// Reverse to get chronological order (oldest first) for sparklines
		const snapshots = (result.results || []).reverse();

		return json({
			asset_id: id,
			snapshots,
			days_available: snapshots.length
		} satisfies HistoryResponse);

	} catch (err) {
		console.error('History query error:', err);
		// Return empty on error (table might not exist yet)
		return json({
			asset_id: id,
			snapshots: [],
			days_available: 0
		} satisfies HistoryResponse);
	}
};
