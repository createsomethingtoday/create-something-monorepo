import { captureMarketplaceSnapshots } from '@create-something/webflow-dashboard-core/marketplace-history';
import { isAuthorizedCronRequest } from '@create-something/webflow-dashboard-core/security';
import { getServerAirtable } from '../../../../lib/server/airtable';
import { getEnvOrThrow } from '../../../../lib/server/env';
import { jsonNoStore } from '../../../../lib/server/responses';

async function captureSnapshot(request: Request) {
  const env = await getEnvOrThrow();
  if (!isAuthorizedCronRequest(request, env.CRON_SECRET, env.ENVIRONMENT)) {
    return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!env.DB) {
    return jsonNoStore({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const airtable = await getServerAirtable();
    const [leaderboard, categories] = await Promise.all([
      airtable.getLeaderboard({ maxRecords: null }),
      airtable.getCategoryPerformance()
    ]);

    const marketplace = await captureMarketplaceSnapshots(env.DB, {
      leaderboard,
      categories
    });

    return jsonNoStore({
      success: true,
      marketplace,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cron Snapshot] Marketplace snapshot failed:', error);
    return jsonNoStore(
      {
        error: error instanceof Error ? error.message : 'Failed to capture marketplace snapshot'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return captureSnapshot(request);
}

export async function POST(request: Request) {
  return captureSnapshot(request);
}
