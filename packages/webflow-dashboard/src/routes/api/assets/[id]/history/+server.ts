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
import { getAirtableClient } from '$lib/server/airtable';
import { deriveBeaconSlug, fetchTemplateViewDaily } from '$lib/server/template-views';
import { VIEWER_DATA_AVAILABLE } from '$lib/config/viewer-data';

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

	if (!platform?.env) {
		throw error(500, 'Platform environment not available');
	}

	// Enforce ownership before exposing per-asset analytics history. The same
	// record also yields the beacon slug for the viewer trend.
	const airtable = getAirtableClient(platform.env);
	const { asset, isOwner } = await airtable.getAssetForOwner(id, locals.user.email);
	if (!asset || !isOwner) {
		throw error(403, 'You do not have permission to view this asset');
	}

	const db = platform.env.DB;
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
		const beaconSlug = VIEWER_DATA_AVAILABLE ? deriveBeaconSlug(asset) : undefined;
		const [result, beaconDaily] = await Promise.all([
			db.prepare(`
				SELECT 
					captured_at,
					unique_viewers,
					cumulative_purchases,
					cumulative_revenue
				FROM analytics_snapshots
				WHERE asset_id = ?
				ORDER BY captured_at DESC
				LIMIT ?
			`).bind(id, days).all<AnalyticsSnapshot>(),
			beaconSlug ? fetchTemplateViewDaily(platform.env, beaconSlug, 365) : Promise.resolve(null)
		]);

		// Reverse to get chronological order (oldest first) for sparklines
		const snapshots = mergeBeaconViewers((result.results || []).reverse(), beaconDaily, days);

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

/**
 * Replace the frozen Airtable viewer column with cumulative beacon sessions.
 *
 * Snapshot rows carry purchases/revenue from the nightly cron; their
 * `unique_viewers` column is the dead pre-2026-07-21 Airtable value. When the
 * beacon has rows for this template, viewers become the running total of
 * sessions up to each day. Days the beacon saw but the cron did not (common:
 * the cron only snapshots assets with sales) are synthesized, carrying the
 * last known purchases/revenue forward so every metric shares one x-axis.
 */
export function mergeBeaconViewers(
	snapshots: AnalyticsSnapshot[],
	beaconDaily: Array<{ day: string; sessions: number }> | null,
	days: number
): AnalyticsSnapshot[] {
	if (!beaconDaily) return snapshots;

	const purchasesByDay = new Map<string, Pick<AnalyticsSnapshot, 'cumulative_purchases' | 'cumulative_revenue'>>();
	for (const snapshot of snapshots) {
		purchasesByDay.set(snapshot.captured_at.slice(0, 10), {
			cumulative_purchases: snapshot.cumulative_purchases,
			cumulative_revenue: snapshot.cumulative_revenue
		});
	}

	const dayset = new Set<string>([...purchasesByDay.keys(), ...beaconDaily.map((row) => row.day)]);
	const orderedDays = Array.from(dayset).sort();
	const sessionsByDay = new Map(beaconDaily.map((row) => [row.day, row.sessions]));

	let cumulativeSessions = 0;
	let lastPurchases = 0;
	let lastRevenue = 0;
	const merged: AnalyticsSnapshot[] = [];
	for (const day of orderedDays) {
		cumulativeSessions += sessionsByDay.get(day) ?? 0;
		const known = purchasesByDay.get(day);
		if (known) {
			lastPurchases = known.cumulative_purchases;
			lastRevenue = known.cumulative_revenue;
		}
		merged.push({
			captured_at: day,
			unique_viewers: cumulativeSessions,
			cumulative_purchases: lastPurchases,
			cumulative_revenue: lastRevenue
		});
	}

	return merged.slice(-days);
}
