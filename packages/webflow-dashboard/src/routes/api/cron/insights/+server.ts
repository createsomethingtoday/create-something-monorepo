/**
 * Weekly Marketplace Insights publication.
 *
 * Reads the 30-day sellers window that the Fivetran activation writes to
 * Airtable, builds the complete snapshot, publishes it to the snapshot table and
 * verifies the readback. Same code as the CLI
 * (webflow-automation/marketplace-insights-sync), from webflow-dashboard-core.
 *
 * Called by the marketplace-insights-cron Worker on Tuesdays (Pages projects
 * have no cron triggers). Idempotent: publishing a window again replaces its
 * record. A window the orders load does not cover yet has no sellers rows, so
 * the call fails instead of publishing a short week.
 *
 *   curl -X POST -H "Authorization: Bearer $SCHEDULER_CRON_SECRET" <dashboard>/api/cron/insights
 *   ...?asOf=2026-11-09T16:00:00.000Z   republish a specific window end
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  createAirtableRest,
  latestMondayBoundary,
  publishMarketplaceInsights
} from '@create-something/webflow-dashboard-core/marketplace-insights-publish';
import { isAuthorizedSchedulerRequest } from '$lib/server/security';

export const POST: RequestHandler = async ({ request, url, platform }) => {
  const env = platform?.env;
  if (!isAuthorizedSchedulerRequest(request, env)) {
    throw error(401, 'Unauthorized');
  }
  if (!env?.MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID) {
    throw error(500, 'Marketplace Insights snapshot table is not configured');
  }

  const requested = url.searchParams.get('asOf');
  const asOf = requested ? new Date(requested) : latestMondayBoundary();
  if (!Number.isFinite(asOf.getTime())) throw error(400, 'Invalid asOf timestamp');

  try {
    const rest = createAirtableRest({ apiKey: env.AIRTABLE_API_KEY, baseId: env.AIRTABLE_BASE_ID });
    const receipt = await publishMarketplaceInsights(rest, {
      snapshotTable: env.MARKETPLACE_INSIGHTS_SNAPSHOT_TABLE_ID,
      asOf
    });
    // Source-data substitutions go to the Worker logs as counts only; the
    // record-level notes stay in the CLI's local receipts.
    return json({
      success: true,
      snapshotAt: receipt.snapshotAt,
      summary: receipt.summary,
      leaderboardRows: receipt.leaderboardRows,
      categoryRows: receipt.categoryRows,
      recordId: receipt.recordId,
      taxonomyNotes: receipt.taxonomyNotes.length,
      creatorEmailNotes: receipt.creatorEmailNotes.length
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Insights Cron] Publication failed:', message);
    throw error(500, `Marketplace Insights publication failed: ${message}`);
  }
};
