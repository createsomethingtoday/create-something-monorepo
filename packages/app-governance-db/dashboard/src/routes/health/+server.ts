import { json, type RequestHandler } from '@sveltejs/kit';
import { dashboardAccessKey } from '$lib/server/access';

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

  const [canvases, nodes, edges, receipts] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM atlas_canvases').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM atlas_nodes').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM atlas_edges').first<{ n: number }>(),
    db.prepare('SELECT COUNT(*) AS n FROM workflow_receipts').first<{ n: number }>()
  ]);

  return json({
    ok: true,
    dashboardAccessConfigured: accessConfigured,
    atlas: {
      canvases: canvases?.n ?? 0,
      nodes: nodes?.n ?? 0,
      edges: edges?.n ?? 0,
      receipts: receipts?.n ?? 0
    }
  });
};
