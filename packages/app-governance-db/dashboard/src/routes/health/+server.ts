import { json, type RequestHandler } from '@sveltejs/kit';
import { ageHours } from '$lib/format';
import { dashboardAccessKey } from '$lib/server/access';
import { APP_GOVERNANCE_SOURCE_TYPES, sourceTypePlaceholders } from '$lib/server/source-scope';

export const GET: RequestHandler = async ({ platform }) => {
  const db = platform?.env?.DB;
  const accessConfigured = Boolean(dashboardAccessKey(platform?.env));

  if (!db) {
    return json(
      {
        ok: false,
        dashboardAccessConfigured: accessConfigured,
        error: 'D1 binding DB is not available'
      },
      { status: 503 }
    );
  }

  const [canvases, nodes, edges, receipts, syncAge] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM atlas_canvases').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM atlas_nodes').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM atlas_edges').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM workflow_receipts').first<{ n: number }>(),
    db
      .prepare(
        `SELECT MIN(last_synced_at) AS oldest_synced_at,
                COALESCE(SUM(CASE WHEN last_synced_at IS NULL THEN 1 ELSE 0 END), 0) AS never_synced
         FROM sync_cursors
         WHERE source_type IN (${sourceTypePlaceholders()})`
      )
      .bind(...APP_GOVERNANCE_SOURCE_TYPES)
      .first<{ oldest_synced_at: string | null; never_synced: number }>()
  ]);

  const oldestSyncedAt = syncAge?.oldest_synced_at ?? null;
  const oldestAgeHours = oldestSyncedAt ? Math.round(ageHours(oldestSyncedAt) * 10) / 10 : null;
  const neverSynced = Number(syncAge?.never_synced ?? 0);

  return json({
    ok: true,
    dashboardAccessConfigured: accessConfigured,
    atlas: {
      canvases: canvases?.n ?? 0,
      nodes: nodes?.n ?? 0,
      edges: edges?.n ?? 0,
      receipts: receipts?.n ?? 0
    },
    sync: {
      oldest_synced_at: oldestSyncedAt,
      oldest_age_hours: oldestAgeHours,
      stale: neverSynced > 0 || (oldestAgeHours !== null && oldestAgeHours > 24)
    }
  });
};
