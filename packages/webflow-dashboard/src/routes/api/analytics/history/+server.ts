/**
 * Aggregate Analytics History API
 * 
 * Returns aggregated historical snapshots across all user's assets.
 * Powers portfolio-level sparkline trends.
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

/** D1 allows 100 bound parameters per query; one slot is reserved for `days`. */
const ASSET_ID_CHUNK_SIZE = 99;

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

		// D1 caps a query at 100 bound parameters and getAssetsByEmail applies no
		// cap, so a creator with 99+ assets would overflow a single IN (...) list
		// and lose every sparkline. Chunk at 99, leaving one slot for `days`.
		const chunks: string[][] = [];
		for (let index = 0; index < assetIds.length; index += ASSET_ID_CHUNK_SIZE) {
			chunks.push(assetIds.slice(index, index + ASSET_ID_CHUNK_SIZE));
		}

		const chunkResults = await Promise.all(
			chunks.map((chunk) => {
				const placeholders = chunk.map(() => '?').join(', ');

				return db.prepare(`
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
				`).bind(...chunk, days).all<AggregateSnapshot>();
			})
		);

		// Merge per-chunk sums by date. SQL NULL sums (no matching rows) coerce to 0.
		const totalsByDate = new Map<string, AggregateSnapshot>();
		for (const chunkResult of chunkResults) {
			for (const row of chunkResult.results || []) {
				const existing = totalsByDate.get(row.captured_at) ?? {
					captured_at: row.captured_at,
					total_viewers: 0,
					total_purchases: 0,
					total_revenue: 0
				};

				existing.total_viewers += row.total_viewers ?? 0;
				existing.total_purchases += row.total_purchases ?? 0;
				existing.total_revenue += row.total_revenue ?? 0;
				totalsByDate.set(row.captured_at, existing);
			}
		}

		// Slice AFTER merging: the union of per-chunk date sets can be wider than
		// `days`, so trimming earlier would drop dates from the newest window.
		const snapshots = Array.from(totalsByDate.values())
			.sort((a, b) => b.captured_at.localeCompare(a.captured_at))
			.slice(0, days)
			.reverse(); // chronological order (oldest first) for sparklines

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
