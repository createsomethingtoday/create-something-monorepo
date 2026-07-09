import { requireDb } from '$lib/server/db';
import type { AtlasCanvasRow, AtlasReceiptRow, CountRow } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
  const db = requireDb(platform);

  const [canvases, statusCounts, receipts] = await Promise.all([
    db
      .prepare(
        `SELECT c.canvas_id, c.title, c.client, c.workflow, c.owner, c.status,
                c.source_kind, c.source_id, c.updated_at,
                COUNT(DISTINCT n.node_id) AS node_count,
                COUNT(DISTINCT e.edge_id) AS edge_count,
                COUNT(DISTINCT CASE WHEN wr.status = 'started' THEN wr.run_id END) AS open_runs,
                COUNT(DISTINCT r.id) AS receipt_count
         FROM atlas_canvases c
         LEFT JOIN atlas_nodes n ON n.canvas_id = c.canvas_id
         LEFT JOIN atlas_edges e ON e.canvas_id = c.canvas_id
         LEFT JOIN workflow_runs wr ON wr.canvas_id = c.canvas_id
         LEFT JOIN workflow_receipts r ON r.canvas_id = c.canvas_id
         GROUP BY c.canvas_id
         ORDER BY c.updated_at DESC
         LIMIT 100`
      )
      .all<AtlasCanvasRow>(),
    db
      .prepare(`SELECT status AS key, COUNT(*) AS n FROM atlas_nodes GROUP BY status ORDER BY status`)
      .all<CountRow>(),
    db
      .prepare(
        `SELECT id, canvas_id, node_id, receipt_type, summary, artifact_url, created_by, created_at
         FROM workflow_receipts
         ORDER BY id DESC
         LIMIT 25`
      )
      .all<AtlasReceiptRow>()
  ]);

  return {
    canvases: canvases.results,
    statusCounts: statusCounts.results,
    receipts: receipts.results
  };
};
