// D1 helpers against community_signals + community_queue.
// The agent worker owns thread state and public posting. The MCP reads the
// queue and writes only internal state: drafts and dismissals.

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

export type QueueItem = {
  post_id: string;
  url: string | null;
  title: string | null;
  // new = no current draft; queued = draft ready for review
  status: string;
  waiting_since: string | null;
  hours_waiting: number | null;
  started_by: string | null;
  waiting_on: string | null;
  message_count: number | null;
  excerpt: string;
  draft: { id: string; text: string; reasoning: string | null; created_at: string | null } | null;
  last_error: string | null;
  synced_at: string | null;
};

type QueueMeta = {
  title?: string | null;
  waiting_since?: string | null;
  latest_creator_post_id?: string | null;
  latest_creator_name?: string | null;
  message_count?: number;
  synced_at?: string;
  last_error?: string | null;
};

// Threads where a creator spoke last, longest wait first.
export async function listResponseQueue(db: D1Database, limit: number): Promise<QueueItem[]> {
  const result = await db
    .prepare(
      `SELECT
         s.source_id AS post_id,
         s.source_url AS url,
         s.status AS status,
         s.author_name AS author_name,
         substr(s.content, 1, 400) AS excerpt,
         s.metadata AS metadata,
         s.detected_at AS detected_at,
         q.id AS draft_id,
         q.draft_content AS draft_text,
         q.draft_reasoning AS draft_reasoning,
         q.created_at AS draft_created_at
       FROM community_signals s
       LEFT JOIN community_queue q ON q.id = (
         SELECT id FROM community_queue
         WHERE signal_id = s.id AND status IN ('pending','approved')
         ORDER BY created_at DESC
         LIMIT 1
       )
       WHERE s.platform = ?1 AND s.status IN ('new','queued')
       ORDER BY COALESCE(json_extract(s.metadata, '$.waiting_since'), s.detected_at) ASC
       LIMIT ?2`,
    )
    .bind(PLATFORM, limit)
    .all<{
      post_id: string;
      url: string | null;
      status: string;
      author_name: string | null;
      excerpt: string | null;
      metadata: string | null;
      detected_at: string | null;
      draft_id: string | null;
      draft_text: string | null;
      draft_reasoning: string | null;
      draft_created_at: string | null;
    }>();

  const now = Date.now();
  return (result.results || []).map((row) => {
    const meta = parseMeta(row.metadata);
    const waitingSince = meta.waiting_since ?? row.detected_at ?? null;
    const waitedMs = waitingSince ? now - Date.parse(waitingSince) : NaN;
    return {
      post_id: row.post_id,
      url: row.url,
      title: meta.title ?? null,
      status: row.status,
      waiting_since: waitingSince,
      hours_waiting: Number.isFinite(waitedMs) ? Math.round(waitedMs / 360_000) / 10 : null,
      started_by: row.author_name,
      waiting_on: meta.latest_creator_name ?? null,
      message_count: meta.message_count ?? null,
      excerpt: row.excerpt || '',
      draft:
        row.draft_id && row.draft_text
          ? {
              id: row.draft_id,
              text: row.draft_text,
              reasoning: row.draft_reasoning,
              created_at: row.draft_created_at,
            }
          : null,
      last_error: meta.last_error ?? null,
      synced_at: meta.synced_at ?? null,
    };
  });
}

export type QueueWriteResult = { ok: true; queue_id?: string } | { ok: false; reason: string };

// Stores an agent-written draft for the admin to review and send.
export async function saveAgentDraft(
  db: D1Database,
  postId: string,
  draft: string,
  reasoning: string | null,
): Promise<QueueWriteResult> {
  const signal = await openSignal(db, postId);
  if (!signal) return { ok: false, reason: 'No open queue item for this post ID.' };

  const existing = await db
    .prepare(
      `SELECT id FROM community_queue
       WHERE signal_id = ?1 AND status IN ('pending','approved')
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(signal.id)
    .first<{ id: string }>();

  let queueId = existing?.id;
  if (queueId) {
    await db
      .prepare(
        `UPDATE community_queue
         SET draft_content = ?1, draft_reasoning = ?2, status = 'pending',
             approved_content = NULL, approved_at = NULL
         WHERE id = ?3`,
      )
      .bind(draft, reasoning, queueId)
      .run();
  } else {
    queueId = `q_${crypto.randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO community_queue
          (id, signal_id, draft_content, draft_reasoning, tone, action_type, platform, target_url, priority, status)
         VALUES (?1, ?2, ?3, ?4, 'helpful', 'reply', ?5, NULL, 5, 'pending')`,
      )
      .bind(queueId, signal.id, draft, reasoning, PLATFORM)
      .run();
  }

  // Mark the draft as current for the latest creator message, so the worker
  // keeps it instead of drafting again.
  await db
    .prepare(
      `UPDATE community_signals
       SET status = 'queued',
           metadata = json_set(
             COALESCE(metadata, '{}'),
             '$.drafted_for_post_id', json_extract(metadata, '$.latest_creator_post_id'),
             '$.last_error', NULL
           )
       WHERE id = ?1`,
    )
    .bind(signal.id)
    .run();

  return { ok: true, queue_id: queueId };
}

// Closes an item that needs no reply. A creator message after this time reopens it.
export async function dismissQueueItem(
  db: D1Database,
  postId: string,
  reason: string,
): Promise<QueueWriteResult> {
  const signal = await openSignal(db, postId);
  if (!signal) return { ok: false, reason: 'No open queue item for this post ID.' };

  await db.batch([
    db
      .prepare(
        `UPDATE community_queue
         SET status = 'rejected'
         WHERE signal_id = ?1 AND status IN ('pending','approved')`,
      )
      .bind(signal.id),
    db
      .prepare(
        `UPDATE community_signals
         SET status = 'dismissed',
             reviewed_at = ?1,
             metadata = json_set(
               COALESCE(metadata, '{}'),
               '$.dismissed_at', ?1,
               '$.closed_reason', NULL,
               '$.dismiss_reason', ?2
             )
         WHERE id = ?3`,
      )
      .bind(new Date().toISOString(), reason, signal.id),
  ]);

  return { ok: true };
}

async function openSignal(db: D1Database, postId: string): Promise<{ id: string } | null> {
  return db
    .prepare(
      `SELECT id FROM community_signals
       WHERE platform = ?1 AND source_id = ?2 AND status IN ('new','queued')
       LIMIT 1`,
    )
    .bind(PLATFORM, postId)
    .first<{ id: string }>();
}

function parseMeta(value: string | null): QueueMeta {
  if (!value) return {};
  try {
    return JSON.parse(value) as QueueMeta;
  } catch {
    return {};
  }
}
