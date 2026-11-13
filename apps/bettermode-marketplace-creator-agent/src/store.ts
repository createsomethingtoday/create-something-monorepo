// D1 access against the existing community_signals + community_queue tables
// in the create-something-agency database. The thread is the signal
// (source_id = root post ID, platform = 'bettermode') and each draft is a
// queue row. Signal status is the response-queue state:
//   new        a creator is waiting and no current draft exists
//   queued     a creator is waiting and a draft is ready for review
//   responded  staff spoke last
//   dismissed  an admin decided the latest creator message needs no reply

const PLATFORM = 'bettermode';

export type SignalStatus = 'new' | 'reviewed' | 'queued' | 'dismissed' | 'responded';

export type SignalRecord = {
  id: string;
  source_id: string;
  source_url: string | null;
  content: string;
  metadata: BettermodeMeta;
  detected_at: string;
};

export type ThreadSignal = {
  id: string;
  status: SignalStatus;
  reviewedAt: string | null;
  metadata: BettermodeMeta;
};

export type DraftRecord = {
  id: string;
  signal_id: string;
  draft_content: string;
  // 'sending' is a short claim held while the reply is posted.
  status: 'pending' | 'approved' | 'sending' | 'sent' | 'rejected' | 'expired';
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
  // Thread queue state, refreshed on every sync.
  title?: string | null;
  waiting_since?: string | null;
  last_staff_reply_at?: string | null;
  latest_creator_post_id?: string | null;
  latest_creator_name?: string | null;
  last_activity_at?: string | null;
  message_count?: number;
  synced_at?: string;
  // The creator message the open draft answers.
  drafted_for_post_id?: string | null;
  // When an admin dismissed the item. A later creator message reopens it.
  dismissed_at?: string | null;
  // Set when the thread was removed or unpublished, not dismissed by an admin.
  closed_reason?: 'post_unavailable' | null;
  // When Send last posted a reply. Covers the seconds a reply sits in moderation.
  sent_reply_at?: string | null;
  last_error?: string | null;
};

export type SignalUpsert = {
  postId: string;
  postUrl?: string | null;
  postContent: string;
  // Omit to keep the current status (or 'new' on insert).
  status?: SignalStatus;
  authorId?: string | null;
  authorName?: string | null;
  // Merged over the stored metadata.
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

export async function getSignalByPostId(
  db: D1Database,
  postId: string,
): Promise<ThreadSignal | null> {
  const row = await db
    .prepare(
      `SELECT id, status, reviewed_at, metadata FROM community_signals
       WHERE platform = ?1 AND source_id = ?2
       LIMIT 1`,
    )
    .bind(PLATFORM, postId)
    .first<{
      id: string;
      status: string | null;
      reviewed_at: string | null;
      metadata: string | null;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    status: (row.status || 'new') as SignalStatus,
    reviewedAt: row.reviewed_at,
    metadata: parseMetadata(row.metadata),
  };
}

export async function upsertSignal(db: D1Database, input: SignalUpsert): Promise<string> {
  const existing = await getSignalByPostId(db, input.postId);
  const now = nowIso();

  if (existing) {
    const status = input.status ?? existing.status;
    const closed = status === 'responded' || status === 'dismissed';
    await db
      .prepare(
        `UPDATE community_signals
         SET content = ?1, source_url = ?2, metadata = ?3, status = ?4,
             author_id = COALESCE(?5, author_id), author_name = COALESCE(?6, author_name),
             reviewed_at = CASE WHEN ?7 = 1 AND status != ?4 THEN ?8 ELSE reviewed_at END
         WHERE id = ?9`,
      )
      .bind(
        input.postContent,
        input.postUrl ?? null,
        JSON.stringify({ ...existing.metadata, ...input.metadata }),
        status,
        input.authorId ?? null,
        input.authorName ?? null,
        closed ? 1 : 0,
        now,
        existing.id,
      )
      .run();
    return existing.id;
  }

  const id = newId('sig');
  await db
    .prepare(
      `INSERT INTO community_signals
        (id, platform, signal_type, source_url, source_id, author_id, author_name, content, relevance_score, urgency, status, detected_at, metadata)
       VALUES (?1, ?2, 'reply', ?3, ?4, ?5, ?6, ?7, 0.5, 'medium', ?8, ?9, ?10)`,
    )
    .bind(
      id,
      PLATFORM,
      input.postUrl ?? null,
      input.postId,
      input.authorId ?? null,
      input.authorName ?? null,
      input.postContent,
      input.status ?? 'new',
      now,
      JSON.stringify(input.metadata || {}),
    )
    .run();
  return id;
}

// Sets status and merges a metadata patch on one signal.
export async function patchSignal(
  db: D1Database,
  signalId: string,
  status: SignalStatus | null,
  patch: BettermodeMeta,
): Promise<void> {
  const row = await db
    .prepare(`SELECT status, metadata FROM community_signals WHERE id = ?1`)
    .bind(signalId)
    .first<{ status: string | null; metadata: string | null }>();
  if (!row) return;
  const next = status ?? ((row.status || 'new') as SignalStatus);
  const closed = next === 'responded' || next === 'dismissed';
  await db
    .prepare(
      `UPDATE community_signals
       SET metadata = ?1, status = ?2,
           reviewed_at = CASE WHEN ?3 = 1 AND status != ?2 THEN ?4 ELSE reviewed_at END
       WHERE id = ?5`,
    )
    .bind(
      JSON.stringify({ ...parseMetadata(row.metadata), ...patch }),
      next,
      closed ? 1 : 0,
      nowIso(),
      signalId,
    )
    .run();
}

export async function hasOpenDraft(db: D1Database, signalId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM community_queue
       WHERE signal_id = ?1 AND status IN ('pending','approved')
       LIMIT 1`,
    )
    .bind(signalId)
    .first<{ id: string }>();
  return !!row?.id;
}

// Staff answered outside this app, so any open draft no longer applies.
export async function expireOpenDrafts(db: D1Database, signalId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE community_queue
       SET status = 'expired'
       WHERE signal_id = ?1 AND status IN ('pending','approved')`,
    )
    .bind(signalId)
    .run();
}

export async function getSignalsByPostIds(
  db: D1Database,
  postIds: string[],
): Promise<Map<string, ThreadSignal>> {
  const found = new Map<string, ThreadSignal>();
  if (postIds.length === 0) return found;
  const placeholders = postIds.map((_, index) => `?${index + 2}`).join(', ');
  const result = await db
    .prepare(
      `SELECT id, source_id, status, reviewed_at, metadata FROM community_signals
       WHERE platform = ?1 AND source_id IN (${placeholders})`,
    )
    .bind(PLATFORM, ...postIds)
    .all<{
      id: string;
      source_id: string;
      status: string | null;
      reviewed_at: string | null;
      metadata: string | null;
    }>();
  for (const row of result.results || []) {
    found.set(row.source_id, {
      id: row.id,
      status: (row.status || 'new') as SignalStatus,
      reviewedAt: row.reviewed_at,
      metadata: parseMetadata(row.metadata),
    });
  }
  return found;
}

// Open items that no event or sweep has refreshed since `before`.
export async function listStaleOpenPostIds(
  db: D1Database,
  before: string,
  limit: number,
): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT source_id FROM community_signals
       WHERE platform = ?1 AND status IN ('new','queued') AND source_id IS NOT NULL
         AND COALESCE(json_extract(metadata, '$.synced_at'), '') < ?2
       ORDER BY detected_at ASC
       LIMIT ?3`,
    )
    .bind(PLATFORM, before, limit)
    .all<{ source_id: string }>();
  return (result.results || []).map((row) => row.source_id);
}

// One row holds the latest reconcile sweep, so a stalled sweep is visible.
export async function recordReconcileRun(
  db: D1Database,
  run: {
    startedAt: string;
    status: 'completed' | 'failed';
    missed: number;
    error?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO community_monitor_runs
        (id, monitor_type, started_at, completed_at, signals_found, status, error, metadata)
       VALUES ('bettermode-reconcile', ?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      PLATFORM,
      run.startedAt,
      nowIso(),
      run.missed,
      run.status,
      run.error ?? null,
      JSON.stringify(run.metadata || {}),
    )
    .run();
}

// A send holds its claim for a few seconds. An older claim is a dead row (the
// Worker stopped mid-send) and must not block the thread forever.
const SEND_CLAIM_MS = 2 * 60_000;

function sendClaimCutoff(): string {
  return new Date(Date.now() - SEND_CLAIM_MS).toISOString();
}

// True when the thread (?3) is open and no send is in flight for it (claimed
// after ?4). One statement, so a draft write cannot interleave with a send.
const DRAFT_WRITE_ALLOWED = `
  EXISTS (SELECT 1 FROM community_signals s WHERE s.id = ?3 AND s.status IN ('new','queued'))
  AND NOT EXISTS (
    SELECT 1 FROM community_queue f
    WHERE f.signal_id = ?3 AND f.status = 'sending' AND f.approved_at > ?4
  )`;

// Returns null when the thread closed or an admin started a send since the
// caller's read, so no second sendable draft appears for the thread.
export async function upsertPendingDraft(
  db: D1Database,
  input: DraftUpsert,
): Promise<string | null> {
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
    const updated = await db
      .prepare(
        `UPDATE community_queue
         SET draft_content = ?1, status = 'pending', approved_content = NULL, approved_at = NULL
         WHERE id = ?2 AND status IN ('pending','approved') AND ${DRAFT_WRITE_ALLOWED}`,
      )
      .bind(input.draftContent, existing.id, input.signalId, sendClaimCutoff())
      .run();
    return (updated.meta.changes ?? 0) > 0 ? existing.id : null;
  }

  const id = newId('q');
  const inserted = await db
    .prepare(
      `INSERT INTO community_queue
        (id, signal_id, draft_content, draft_reasoning, tone, action_type, platform, target_url, priority, status)
       SELECT ?1, ?3, ?2, NULL, 'helpful', 'reply', ?5, NULL, 5, 'pending'
       WHERE ${DRAFT_WRITE_ALLOWED}`,
    )
    .bind(id, input.draftContent, input.signalId, sendClaimCutoff(), PLATFORM)
    .run();
  return (inserted.meta.changes ?? 0) > 0 ? id : null;
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
  sentBy: string | null = null,
): Promise<void> {
  const now = nowIso();
  // The reply ID and sender let the sweep re-run a lost verify step.
  const result = JSON.stringify({
    ok: true,
    ...(bettermodeReplyId ? { bettermode_reply_id: bettermodeReplyId } : {}),
    ...(sentBy ? { sent_by: sentBy } : {}),
  });
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

export type UnverifiedReply = {
  draftId: string;
  replyId: string;
  threadId: string;
  sentBy: string | null;
  spaceId: string | null;
};

// Sent replies with no recorded moderation outcome in the window. The verify
// message for these was lost or never published.
export async function listUnverifiedSentDrafts(
  db: D1Database,
  sentAfter: string,
  sentBefore: string,
  limit: number,
): Promise<UnverifiedReply[]> {
  const result = await db
    .prepare(
      `SELECT q.id AS draft_id,
              json_extract(q.result, '$.bettermode_reply_id') AS reply_id,
              json_extract(q.result, '$.sent_by') AS sent_by,
              s.source_id AS thread_id,
              json_extract(s.metadata, '$.space_id') AS space_id
       FROM community_queue q
       JOIN community_signals s ON s.id = q.signal_id
       WHERE q.platform = ?1 AND q.status = 'sent'
         AND q.sent_at >= ?2 AND q.sent_at <= ?3
         AND json_extract(q.result, '$.bettermode_reply_id') IS NOT NULL
         AND json_extract(q.result, '$.moderation') IS NULL
         AND s.source_id IS NOT NULL
       ORDER BY q.sent_at ASC
       LIMIT ?4`,
    )
    .bind(PLATFORM, sentAfter, sentBefore, limit)
    .all<{
      draft_id: string;
      reply_id: string;
      sent_by: string | null;
      thread_id: string;
      space_id: string | null;
    }>();
  return (result.results || []).map((row) => ({
    draftId: row.draft_id,
    replyId: row.reply_id,
    threadId: row.thread_id,
    sentBy: row.sent_by,
    spaceId: row.space_id,
  }));
}

// Merges fields into the JSON result of a queue row (send and moderation outcome).
export async function annotateDraftResult(
  db: D1Database,
  draftId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const row = await db
    .prepare(`SELECT result FROM community_queue WHERE id = ?1`)
    .bind(draftId)
    .first<{ result: string | null }>();
  if (!row) return;
  let current: Record<string, unknown> = {};
  try {
    current = row.result ? (JSON.parse(row.result) as Record<string, unknown>) : {};
  } catch {
    current = {};
  }
  await db
    .prepare(`UPDATE community_queue SET result = ?1 WHERE id = ?2`)
    .bind(JSON.stringify({ ...current, ...patch }), draftId)
    .run();
}

// Rejects an open draft. Returns false when the draft was not open, so a
// stale Dismiss cannot rewrite a sent row.
export async function markRejected(db: D1Database, draftId: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE community_queue
       SET status = 'rejected'
       WHERE id = ?1 AND status IN ('pending','approved')`,
    )
    .bind(draftId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

// Claims an open draft for sending. Only one caller wins, so two submits
// cannot both post a public reply.
// The claim also fails while another draft of the same thread is being sent.
// `approved_at` holds the claim time.
export async function claimDraftForSend(db: D1Database, draftId: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE community_queue
       SET status = 'sending', approved_at = ?2
       WHERE id = ?1 AND status IN ('pending','approved')
         AND NOT EXISTS (
           SELECT 1 FROM community_queue f
           WHERE f.signal_id = community_queue.signal_id
             AND f.status = 'sending' AND f.approved_at > ?3
         )`,
    )
    .bind(draftId, nowIso(), sendClaimCutoff())
    .run();
  return (result.meta.changes ?? 0) > 0;
}

// Returns a claimed draft to the queue after a failed send.
export async function releaseSendClaim(db: D1Database, draftId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE community_queue SET status = 'pending', approved_at = NULL
       WHERE id = ?1 AND status = 'sending'`,
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
