// D1 read helpers against community_signals + community_queue.
// MCP tools only read; the agent worker owns writes.

const PLATFORM = 'bettermode';

export type ApprovedDraftSample = {
  post_excerpt: string;
  approved_reply: string;
  approved_at: string | null;
};

export async function listRecentApprovedDrafts(
  db: D1Database,
  limit: number,
): Promise<ApprovedDraftSample[]> {
  const result = await db
    .prepare(
      `SELECT
         s.content AS post_excerpt,
         COALESCE(q.approved_content, q.draft_content) AS approved_reply,
         q.approved_at
       FROM community_queue q
       JOIN community_signals s ON s.id = q.signal_id
       WHERE q.platform = ?1 AND q.status = 'sent'
       ORDER BY q.sent_at DESC
       LIMIT ?2`,
    )
    .bind(PLATFORM, limit)
    .all<ApprovedDraftSample>();
  return (result.results || []).filter((row: ApprovedDraftSample) => row.post_excerpt && row.approved_reply);
}

export type DraftStatus = {
  exists: boolean;
  status: string | null;
  draft_excerpt: string | null;
  created_at: string | null;
  signal_id: string | null;
  queue_id: string | null;
};

export async function getDraftStatusByPostId(
  db: D1Database,
  postId: string,
): Promise<DraftStatus> {
  const row = await db
    .prepare(
      `SELECT
         s.id AS signal_id,
         q.id AS queue_id,
         q.status AS status,
         substr(q.draft_content, 1, 240) AS draft_excerpt,
         q.created_at AS created_at
       FROM community_signals s
       LEFT JOIN community_queue q ON q.signal_id = s.id
       WHERE s.platform = ?1 AND s.source_id = ?2
       ORDER BY q.created_at DESC
       LIMIT 1`,
    )
    .bind(PLATFORM, postId)
    .first<{
      signal_id: string | null;
      queue_id: string | null;
      status: string | null;
      draft_excerpt: string | null;
      created_at: string | null;
    }>();

  if (!row) return { exists: false, status: null, draft_excerpt: null, created_at: null, signal_id: null, queue_id: null };

  return {
    exists: !!row.queue_id,
    status: row.status,
    draft_excerpt: row.draft_excerpt,
    created_at: row.created_at,
    signal_id: row.signal_id,
    queue_id: row.queue_id,
  };
}
