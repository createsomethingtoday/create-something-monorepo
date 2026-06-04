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

export type QueueStatus = {
  signal_id: string | null;
  queue_id: string | null;
  status: DraftRecord['status'] | null;
  created_at: string | null;
  sent_at: string | null;
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

export type CommunityEventInput = {
  eventType: string;
  eventSource: 'content_webhook' | 'notification_webhook' | 'scheduled_sweep';
  dedupeKey?: string | null;
  sourceId?: string | null;
  sourceUrl?: string | null;
  spaceId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  status?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
};

export type WorkItemInput = {
  postId: string;
  sourceUrl?: string | null;
  title?: string | null;
  lane: string;
  status: string;
  priority: number;
  urgency: string;
  nextAction?: string | null;
  dueAt?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  signalId?: string | null;
  queueId?: string | null;
  draftStatus?: string | null;
  lastActivityAt?: string | null;
  lastDraftedAt?: string | null;
  lastSentAt?: string | null;
  escalationReason?: string | null;
  metadata?: Record<string, unknown>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function recordCommunityEvent(
  db: D1Database,
  input: CommunityEventInput,
): Promise<string> {
  const id = newId('cevt');
  const now = nowIso();
  await db
    .prepare(
      `INSERT OR IGNORE INTO community_events
        (id, platform, event_type, event_source, dedupe_key, source_id, source_url,
         space_id, actor_id, actor_name, actor_email, status, received_at,
         processed_at, payload, metadata)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?14, ?15)`,
    )
    .bind(
      id,
      PLATFORM,
      input.eventType,
      input.eventSource,
      input.dedupeKey ?? null,
      input.sourceId ?? null,
      input.sourceUrl ?? null,
      input.spaceId ?? null,
      input.actorId ?? null,
      input.actorName ?? null,
      input.actorEmail ?? null,
      input.status ?? 'observed',
      now,
      input.payload === undefined ? null : JSON.stringify(input.payload),
      input.metadata ? JSON.stringify(input.metadata) : null,
    )
    .run();
  return id;
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

export async function getQueueStatusByPostId(
  db: D1Database,
  postId: string,
): Promise<QueueStatus> {
  const row = await db
    .prepare(
      `SELECT
         s.id AS signal_id,
         q.id AS queue_id,
         q.status AS status,
         q.created_at AS created_at,
         q.sent_at AS sent_at
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
      status: DraftRecord['status'] | null;
      created_at: string | null;
      sent_at: string | null;
    }>();

  return {
    signal_id: row?.signal_id ?? null,
    queue_id: row?.queue_id ?? null,
    status: row?.status ?? null,
    created_at: row?.created_at ?? null,
    sent_at: row?.sent_at ?? null,
  };
}

export async function upsertCommunityWorkItem(
  db: D1Database,
  input: WorkItemInput,
): Promise<string> {
  const existing = await db
    .prepare(
      `SELECT id, status
       FROM community_work_items
       WHERE platform = ?1 AND source_id = ?2
       LIMIT 1`,
    )
    .bind(PLATFORM, input.postId)
    .first<{ id: string; status: string }>();

  const now = nowIso();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  const stableStatus = preserveTerminalStatus(existing?.status, input.status);

  if (existing?.id) {
    await db
      .prepare(
        `UPDATE community_work_items
         SET source_url = COALESCE(?1, source_url),
             title = COALESCE(?2, title),
             lane = ?3,
             status = ?4,
             priority = ?5,
             urgency = ?6,
             next_action = ?7,
             due_at = ?8,
             author_id = COALESCE(?9, author_id),
             author_name = COALESCE(?10, author_name),
             author_email = COALESCE(?11, author_email),
             signal_id = COALESCE(?12, signal_id),
             queue_id = COALESCE(?13, queue_id),
             draft_status = COALESCE(?14, draft_status),
             last_seen_at = ?15,
             last_activity_at = COALESCE(?16, last_activity_at),
             last_drafted_at = COALESCE(?17, last_drafted_at),
             last_sent_at = COALESCE(?18, last_sent_at),
             escalation_reason = COALESCE(?19, escalation_reason),
             metadata = COALESCE(?20, metadata),
             updated_at = ?15
         WHERE id = ?21`,
      )
      .bind(
        input.sourceUrl ?? null,
        input.title ?? null,
        input.lane,
        stableStatus,
        input.priority,
        input.urgency,
        input.nextAction ?? null,
        input.dueAt ?? null,
        input.authorId ?? null,
        input.authorName ?? null,
        input.authorEmail ?? null,
        input.signalId ?? null,
        input.queueId ?? null,
        input.draftStatus ?? null,
        now,
        input.lastActivityAt ?? null,
        input.lastDraftedAt ?? null,
        input.lastSentAt ?? null,
        input.escalationReason ?? null,
        metadataJson,
        existing.id,
      )
      .run();
    return existing.id;
  }

  const id = newId('cwi');
  await db
    .prepare(
      `INSERT INTO community_work_items
        (id, platform, source_id, source_url, title, lane, status, priority,
         urgency, next_action, due_at, author_id, author_name, author_email,
         signal_id, queue_id, draft_status, first_seen_at, last_seen_at,
         last_activity_at, last_drafted_at, last_sent_at, escalation_reason,
         metadata)
       VALUES
        (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
         ?15, ?16, ?17, ?18, ?18, ?19, ?20, ?21, ?22, ?23)`,
    )
    .bind(
      id,
      PLATFORM,
      input.postId,
      input.sourceUrl ?? null,
      input.title ?? null,
      input.lane,
      stableStatus,
      input.priority,
      input.urgency,
      input.nextAction ?? null,
      input.dueAt ?? null,
      input.authorId ?? null,
      input.authorName ?? null,
      input.authorEmail ?? null,
      input.signalId ?? null,
      input.queueId ?? null,
      input.draftStatus ?? null,
      now,
      input.lastActivityAt ?? null,
      input.lastDraftedAt ?? null,
      input.lastSentAt ?? null,
      input.escalationReason ?? null,
      metadataJson,
    )
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

export async function markCommunityWorkItemSent(
  db: D1Database,
  postId: string,
  queueId: string | null,
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE community_work_items
       SET status = 'sent',
           draft_status = 'sent',
           queue_id = COALESCE(?1, queue_id),
           last_sent_at = ?2,
           updated_at = ?2
       WHERE platform = ?3 AND source_id = ?4`,
    )
    .bind(queueId, now, PLATFORM, postId)
    .run();
}

export async function markCommunityWorkItemSkipped(
  db: D1Database,
  postId: string,
  reason: string | null,
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE community_work_items
       SET status = 'skipped',
           draft_status = 'rejected',
           escalation_reason = COALESCE(?1, escalation_reason),
           updated_at = ?2
       WHERE platform = ?3 AND source_id = ?4`,
    )
    .bind(reason, now, PLATFORM, postId)
    .run();
}

function preserveTerminalStatus(current: string | undefined, next: string): string {
  if (!current) return next;
  if (current === 'sent' || current === 'externally_resolved' || current === 'skipped') {
    return current;
  }
  return next;
}

function parseMetadata(value: string | null): BettermodeMeta {
  if (!value) return {};
  try {
    return JSON.parse(value) as BettermodeMeta;
  } catch {
    return {};
  }
}
