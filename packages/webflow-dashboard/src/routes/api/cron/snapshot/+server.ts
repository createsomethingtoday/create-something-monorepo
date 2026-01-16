/**
 * Analytics Snapshot Cron Job
 * 
 * Captures daily snapshots of asset metrics for historical tracking.
 * This enables real sparkline trends in the dashboard.
 * 
 * Schedule: Run daily at midnight UTC via Cloudflare Cron Trigger
 * Trigger URL: /api/cron/snapshot
 * 
 * Can also be triggered manually with CRON_SECRET for testing:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://webflow-dashboard.pages.dev/api/cron/snapshot
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAirtableClient } from '$lib/server/airtable';

export const GET: RequestHandler = async ({ request, platform }) => {
	// Verify cron secret for manual triggers (Cloudflare cron bypasses this)
	const authHeader = request.headers.get('Authorization');
	const cronSecret = platform?.env?.CRON_SECRET;
	
	// Allow if: no secret configured, or valid bearer token, or Cloudflare cron (no auth header needed)
	const isCloudfareCron = request.headers.get('CF-Worker') !== null;
	if (cronSecret && !isCloudfareCron) {
		if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
			throw error(401, 'Unauthorized');
		}
	}

	const db = platform?.env?.DB;
	if (!db) {
		throw error(500, 'Database not configured');
	}

	try {
		const airtable = getAirtableClient(platform?.env);
		
		// Get all assets that have analytics data (published or were published)
		const allAssets = await airtable.getAllAssetsForSnapshot();
		
		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		
		// Filter to assets with meaningful data
		const assetsToSnapshot = allAssets.filter(asset => 
			(asset.uniqueViewers ?? 0) > 0 || 
			(asset.cumulativePurchases ?? 0) > 0 || 
			(asset.cumulativeRevenue ?? 0) > 0
		);

		if (assetsToSnapshot.length === 0) {
			return json({ 
				success: true, 
				message: 'No assets with analytics data to snapshot',
				captured: 0,
				date: today
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
			assets: assetsToSnapshot.map(a => ({ id: a.id, name: a.name }))
		});

	} catch (err) {
		console.error('Snapshot cron error:', err);
		throw error(500, `Failed to capture snapshots: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
