// D1 access against the existing community_signals + community_queue tables
// in the create-something-agency database. We treat the post as the signal
// (source_id=postId, platform='bettermode') and the draft as the queue row.

const PLATFORM = 'bettermode';

export type SignalRecord = {
  id: string;
  source_id: string;
  source_url: string | null;
  content: string;
  metadata: BettermodeMeta;
  detected_at: string;
};

export type DraftRecord = {
  id: string;
  signal_id: string;
  draft_content: string;
  status: 'pending' | 'approved' | 'sent' | 'rejected' | 'expired';
  approved_content: string | null;
  created_at: string;
  sent_at: string | null;
};

export type BettermodeMeta = {
  network_id?: string;
  space_id?: string | null;
  parent_post_id?: string | null;
  is_top_level?: boolean;
  author_member_id?: string | null;
  author_email?: string | null;
  author_name?: string | null;
};

export type SignalUpsert = {
  postId: string;
  postUrl?: string | null;
  postContent: string;
  metadata: BettermodeMeta;
};

export type DraftUpsert = {
  signalId: string;
  draftContent: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function upsertSignal(db: D1Database, input: SignalUpsert): Promise<string> {
  const existing = await db
    .prepare(
      `SELECT id FROM community_signals
       WHERE platform = ?1 AND source_id = ?2
       LIMIT 1`,
    )
    .bind(PLATFORM, input.postId)
    .first<{ id: string }>();

  const now = nowIso();
  const metadataJson = JSON.stringify(input.metadata || {});

  if (existing?.id) {
    await db
      .prepare(
        `UPDATE community_signals
         SET content = ?1, source_url = ?2, metadata = ?3
         WHERE id = ?4`,
      )
      .bind(input.postContent, input.postUrl ?? null, metadataJson, existing.id)
      .run();
    return existing.id;
  }

  const id = newId('sig');
  await db
    .prepare(
      `INSERT INTO community_signals
        (id, platform, signal_type, source_url, source_id, content, relevance_score, urgency, status, detected_at, metadata)
       VALUES (?1, ?2, 'reply', ?3, ?4, ?5, 0.5, 'medium', 'new', ?6, ?7)`,
    )
    .bind(id, PLATFORM, input.postUrl ?? null, input.postId, input.postContent, now, metadataJson)
    .run();
  return id;
}

export async function upsertPendingDraft(
  db: D1Database,
  input: DraftUpsert,
): Promise<string> {
  const existing = await db
    .prepare(
      `SELECT id FROM community_queue
       WHERE signal_id = ?1 AND status IN ('pending','approved')
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(input.signalId)
    .first<{ id: string }>();

  if (existing?.id) {
    await db
      .prepare(
        `UPDATE community_queue
         SET draft_content = ?1, status = 'pending', approved_content = NULL, approved_at = NULL
         WHERE id = ?2`,
      )
      .bind(input.draftContent, existing.id)
      .run();
    return existing.id;
  }

  const id = newId('q');
  await db
    .prepare(
      `INSERT INTO community_queue
        (id, signal_id, draft_content, draft_reasoning, tone, action_type, platform, target_url, priority, status)
       VALUES (?1, ?2, ?3, NULL, 'helpful', 'reply', ?4, NULL, 5, 'pending')`,
    )
    .bind(id, input.signalId, input.draftContent, PLATFORM)
    .run();
  return id;
}

export async function getLatestDraftByPostId(
  db: D1Database,
  postId: string,
): Promise<{ signal: SignalRecord; draft: DraftRecord } | null> {
  const row = await db
    .prepare(
      `SELECT
         s.id            AS signal_id,
         s.source_id     AS source_id,
         s.source_url    AS source_url,
         s.content       AS content,
         s.metadata      AS metadata,
         s.detected_at   AS detected_at,
         q.id            AS queue_id,
         q.draft_content AS draft_content,
         q.status        AS status,
         q.approved_content AS approved_content,
         q.created_at    AS created_at,
         q.sent_at       AS sent_at
       FROM community_signals s
       LEFT JOIN community_queue q ON q.signal_id = s.id
       WHERE s.platform = ?1 AND s.source_id = ?2
       ORDER BY q.created_at DESC
       LIMIT 1`,
    )
    .bind(PLATFORM, postId)
    .first<{
      signal_id: string;
      source_id: string;
      source_url: string | null;
      content: string;
      metadata: string | null;
      detected_at: string;
      queue_id: string | null;
      draft_content: string | null;
      status: string | null;
      approved_content: string | null;
      created_at: string | null;
      sent_at: string | null;
    }>();

  if (!row || !row.queue_id || !row.draft_content || !row.status || !row.created_at) {
    return null;
  }

  return {
    signal: {
      id: row.signal_id,
      source_id: row.source_id,
      source_url: row.source_url,
      content: row.content,
      metadata: parseMetadata(row.metadata),
      detected_at: row.detected_at,
    },
    draft: {
      id: row.queue_id,
      signal_id: row.signal_id,
      draft_content: row.draft_content,
      status: row.status as DraftRecord['status'],
      approved_content: row.approved_content,
      created_at: row.created_at,
      sent_at: row.sent_at,
    },
  };
}

export async function listRecentApprovedDrafts(
  db: D1Database,
  limit = 5,
): Promise<Array<{ post_excerpt: string; approved_reply: string }>> {
  const result = await db
    .prepare(
      `SELECT s.content AS post_excerpt, COALESCE(q.approved_content, q.draft_content) AS approved_reply
       FROM community_queue q
       JOIN community_signals s ON s.id = q.signal_id
       WHERE q.platform = ?1 AND q.status = 'sent'
       ORDER BY q.sent_at DESC
       LIMIT ?2`,
    )
    .bind(PLATFORM, limit)
    .all<{ post_excerpt: string; approved_reply: string }>();
  return (result.results || []).filter((row) => row.post_excerpt && row.approved_reply);
}

export async function markSent(
  db: D1Database,
  draftId: string,
  approvedContent: string,
  bettermodeReplyId: string | null,
): Promise<void> {
  const now = nowIso();
  const result = bettermodeReplyId
    ? JSON.stringify({ ok: true, bettermode_reply_id: bettermodeReplyId })
    : JSON.stringify({ ok: true });
  await db
    .prepare(
      `UPDATE community_queue
       SET status = 'sent',
           approved_content = ?1,
           approved_at = ?2,
           sent_at = ?2,
           result = ?3
       WHERE id = ?4`,
    )
    .bind(approvedContent, now, result, draftId)
    .run();
}

export async function markRejected(db: D1Database, draftId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE community_queue
       SET status = 'rejected'
       WHERE id = ?1`,
    )
    .bind(draftId)
    .run();
}

function parseMetadata(value: string | null): BettermodeMeta {
  if (!value) return {};
  try {
    return JSON.parse(value) as BettermodeMeta;
  } catch {
    return {};
  }
}
