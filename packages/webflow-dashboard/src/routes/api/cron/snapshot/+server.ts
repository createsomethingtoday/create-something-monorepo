/**
 * Analytics Snapshot Cron Job
 * 
 * Captures daily snapshots of asset metrics and marketplace analytics for
 * historical tracking. This enables real sparkline/category trend rendering
 * in the dashboard.
 * 
 * Schedule: Run daily at midnight UTC via Cloudflare Cron Trigger
 * Trigger URL: /api/cron/snapshot
 *
 * Trigger with CRON_SECRET:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://webflow-dashboard.pages.dev/api/cron/snapshot
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { captureMarketplaceSnapshots } from '$lib/server/marketplace-history';
import { isAuthorizedCronRequest } from '$lib/server/security';

export const GET: RequestHandler = async ({ request, platform }) => {
	// Require explicit authorization in production to avoid spoofable-header bypasses.
	if (
		!isAuthorizedCronRequest(
			request,
			platform?.env?.CRON_SECRET,
			platform?.env?.ENVIRONMENT
		)
	) {
		throw error(401, 'Unauthorized');
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not configured');
	}

	try {
		const airtable = getAirtableClient(platform?.env);

		// Fetch all snapshot sources in parallel. Marketplace data changes weekly,
		// but capturing it alongside daily asset snapshots keeps D1 history current
		// without adding a second cron surface.
		const [allAssets, leaderboard, categories] = await Promise.all([
			airtable.getAllAssetsForSnapshot(),
			airtable.getLeaderboard({ maxRecords: null }),
			airtable.getCategoryPerformance()
		]);

		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

		// Filter to assets with meaningful data
		const assetsToSnapshot = allAssets.filter(asset =>
			(asset.uniqueViewers ?? 0) > 0 ||
			(asset.cumulativePurchases ?? 0) > 0 ||
			(asset.cumulativeRevenue ?? 0) > 0
		);
		const marketplace = await captureMarketplaceSnapshots(db, {
			leaderboard,
			categories
		});

		if (assetsToSnapshot.length === 0) {
			return json({
				success: true,
				message: 'No assets with analytics data to snapshot',
				captured: 0,
				date: today,
				marketplace
			});
		}

		// Batch insert/update snapshots using INSERT OR REPLACE
		const stmt = db.prepare(`
			INSERT OR REPLACE INTO analytics_snapshots 
			(asset_id, captured_at, unique_viewers, cumulative_purchases, cumulative_revenue)
			VALUES (?, ?, ?, ?, ?)
		`);

		const batch = assetsToSnapshot.map(asset => 
			stmt.bind(
				asset.id,
				today,
				asset.uniqueViewers || 0,
				asset.cumulativePurchases || 0,
				asset.cumulativeRevenue || 0
			)
		);

		await db.batch(batch);

		return json({
			success: true,
			captured: assetsToSnapshot.length,
			date: today,
			marketplace,
			assets: assetsToSnapshot.map(a => ({ id: a.id, name: a.name }))
		});

	} catch (err) {
		console.error('Snapshot cron error:', err);
		throw error(500, `Failed to capture snapshots: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

// Also support POST for cron providers that do not send GET requests.
export const POST: RequestHandler = async (event) => {
	return GET(event);
};
