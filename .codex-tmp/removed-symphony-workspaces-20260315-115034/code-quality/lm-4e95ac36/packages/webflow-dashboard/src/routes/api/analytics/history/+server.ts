/**
 * Aggregate Analytics History API
 * 
 * Returns aggregated historical snapshots across all user's assets.
 * Used to generate sparkline trends in the StatsBar.
 * 
 * GET /api/analytics/history?days=14
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export interface AggregateSnapshot {
	captured_at: string;
	total_viewers: number;
	total_purchases: number;
	total_revenue: number;
}

export interface AggregateHistoryResponse {
	snapshots: AggregateSnapshot[];
	days_available: number;
}

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	// Require authentication
	if (!locals.user?.email) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		// Return empty history if DB not configured (graceful degradation)
		return json({
			snapshots: [],
			days_available: 0
		} satisfies AggregateHistoryResponse);
	}

	// Default to 14 days for aggregate (dashboard view), max 30 days
	const daysParam = url.searchParams.get('days');
	const days = Math.min(Math.max(parseInt(daysParam || '14', 10) || 14, 1), 30);

	try {
		// First, get the user's asset IDs from Airtable
		const airtable = getAirtableClient(platform?.env);
		const userAssets = await airtable.getAssetsByEmail(locals.user.email);
		
		if (userAssets.length === 0) {
			return json({
				snapshots: [],
				days_available: 0
			} satisfies AggregateHistoryResponse);
		}

		const assetIds = userAssets.map(a => a.id);
		
		// Build query with IN clause for user's assets
		const placeholders = assetIds.map(() => '?').join(', ');
		
		// Aggregate by date across all user's assets
		const result = await db.prepare(`
			SELECT 
				captured_at,
				SUM(unique_viewers) as total_viewers,
				SUM(cumulative_purchases) as total_purchases,
				SUM(cumulative_revenue) as total_revenue
			FROM analytics_snapshots
			WHERE asset_id IN (${placeholders})
			GROUP BY captured_at
			ORDER BY captured_at DESC
			LIMIT ?
		`).bind(...assetIds, days).all<AggregateSnapshot>();

		// Reverse to get chronological order (oldest first) for sparklines
		const snapshots = (result.results || []).reverse();

		return json({
			snapshots,
			days_available: snapshots.length
		} satisfies AggregateHistoryResponse);

	} catch (err) {
		console.error('Aggregate history query error:', err);
		// Return empty on error (table might not exist yet)
		return json({
			snapshots: [],
			days_available: 0
		} satisfies AggregateHistoryResponse);
	}
};
