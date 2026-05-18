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
import {
  captureMarketplaceSnapshots,
  type MarketplaceSnapshotCaptureResult
} from '$lib/server/marketplace-history';
import { isAuthorizedCronRequest } from '$lib/server/security';

type MarketplaceCaptureStatus =
  | ({ success: true } & MarketplaceSnapshotCaptureResult)
  | { success: false; error: string };

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

export const GET: RequestHandler = async ({ request, platform }) => {
  // Require explicit authorization in production to avoid spoofable-header bypasses.
  if (!isAuthorizedCronRequest(request, platform?.env?.CRON_SECRET, platform?.env?.ENVIRONMENT)) {
    throw error(401, 'Unauthorized');
  }

  const env = platform?.env;
  if (!env?.DB) {
    throw error(500, 'Database not configured');
  }
  const db = env.DB;

  const airtable = getAirtableClient(env);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  let assetsToSnapshot: Awaited<ReturnType<typeof airtable.getAllAssetsForSnapshot>> = [];

  try {
    const allAssets = await airtable.getAllAssetsForSnapshot();
    assetsToSnapshot = allAssets.filter(
      (asset) =>
        (asset.uniqueViewers ?? 0) > 0 ||
        (asset.cumulativePurchases ?? 0) > 0 ||
        (asset.cumulativeRevenue ?? 0) > 0
    );

    if (assetsToSnapshot.length > 0) {
      // Batch insert/update snapshots using INSERT OR REPLACE
      const stmt = db.prepare(`
				INSERT OR REPLACE INTO analytics_snapshots
				(asset_id, captured_at, unique_viewers, cumulative_purchases, cumulative_revenue)
				VALUES (?, ?, ?, ?, ?)
			`);

      const batch = assetsToSnapshot.map((asset) =>
        stmt.bind(
          asset.id,
          today,
          asset.uniqueViewers || 0,
          asset.cumulativePurchases || 0,
          asset.cumulativeRevenue || 0
        )
      );

      await db.batch(batch);
    }
  } catch (err) {
    console.error('[Snapshot Cron] Asset snapshot failed:', err);
    throw error(500, `Failed to capture asset snapshots: ${getErrorMessage(err)}`);
  }

  let marketplace: MarketplaceCaptureStatus;
  try {
    const [leaderboard, categories] = await Promise.all([
      airtable.getLeaderboard({ maxRecords: null }),
      airtable.getCategoryPerformance()
    ]);

    marketplace = {
      success: true,
      ...(await captureMarketplaceSnapshots(db, {
        leaderboard,
        categories
      }))
    };
  } catch (err) {
    console.error('[Snapshot Cron] Marketplace snapshot failed:', err);
    marketplace = {
      success: false,
      error: getErrorMessage(err)
    };
  }

  if (assetsToSnapshot.length === 0) {
    return json({
      success: true,
      message: 'No assets with analytics data to snapshot',
      captured: 0,
      date: today,
      marketplace
    });
  }

  return json({
    success: true,
    captured: assetsToSnapshot.length,
    date: today,
    marketplace,
    assets: assetsToSnapshot.map((a) => ({ id: a.id, name: a.name }))
  });
};

// Also support POST for cron providers that do not send GET requests.
export const POST: RequestHandler = async (event) => {
  return GET(event);
};
