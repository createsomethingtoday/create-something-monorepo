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

// Keep equal to SEND_CLAIM_MS in the agent Worker's store.ts.
const SEND_CLAIM_MS = 2 * 60_000;
const SEND_IN_PROGRESS =
  'The reply for this post is being sent or the item is closed. List the queue again.';

// True when the thread (?4) is open and no send is in flight for it (claimed
// after ?5). One statement, so a draft write cannot interleave with a send.
const DRAFT_WRITE_ALLOWED = `
  EXISTS (SELECT 1 FROM community_signals s WHERE s.id = ?4 AND s.status IN ('new','queued'))
  AND NOT EXISTS (
    SELECT 1 FROM community_queue f
    WHERE f.signal_id = ?4 AND f.status = 'sending' AND f.approved_at > ?5
  )`;

// Stores an agent-written draft for the admin to review and send.
export async function saveAgentDraft(
  db: D1Database,
  postId: string,
  draft: string,
  reasoning: string | null,
): Promise<QueueWriteResult> {
  const signal = await openSignal(db, postId);
  if (!signal) return { ok: false, reason: 'No open queue item for this post ID.' };
  const cutoff = new Date(Date.now() - SEND_CLAIM_MS).toISOString();

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
    // Conditional: an admin may have pressed Send since the read above. A row
    // that is sending or sent must not return to pending.
    const updated = await db
      .prepare(
        `UPDATE community_queue
         SET draft_content = ?1, draft_reasoning = ?2, status = 'pending',
             approved_content = NULL, approved_at = NULL
         WHERE id = ?3 AND status IN ('pending','approved') AND ${DRAFT_WRITE_ALLOWED}`,
      )
      .bind(draft, reasoning, queueId, signal.id, cutoff)
      .run();
    if ((updated.meta.changes ?? 0) === 0) return { ok: false, reason: SEND_IN_PROGRESS };
  } else {
    queueId = `q_${crypto.randomUUID()}`;
    const inserted = await db
      .prepare(
        `INSERT INTO community_queue
          (id, signal_id, draft_content, draft_reasoning, tone, action_type, platform, target_url, priority, status)
         SELECT ?1, ?4, ?2, ?3, 'helpful', 'reply', ?6, NULL, 5, 'pending'
         WHERE ${DRAFT_WRITE_ALLOWED}`,
      )
      .bind(queueId, draft, reasoning, signal.id, cutoff, PLATFORM)
      .run();
    if ((inserted.meta.changes ?? 0) === 0) return { ok: false, reason: SEND_IN_PROGRESS };
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
             '$.drafted_for_text_hash', json_extract(metadata, '$.latest_creator_text_hash'),
             '$.last_error', NULL
           )
       WHERE id = ?1 AND status IN ('new','queued')`,
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

// ---------------------------------------------------------------------------
// Health and history, for the dashboard.

export type QueueHealth = {
  generated_at: string;
  sweep: {
    last_run_at: string | null;
    status: string | null;
    error: string | null;
    checked: number | null;
    missed: number | null;
    stale: number | null;
    reverified: number | null;
    minutes_since: number | null;
    // The sweep runs every 30 minutes. Late or failed means not healthy.
    healthy: boolean;
  };
  webhook: {
    last_event_at: string | null;
    last_event: string | null;
    events_recorded: number;
    hours_since: number | null;
  };
  counts: { open: number; new: number; queued: number; responded: number; dismissed: number };
  drafts: { pending: number; sending: number };
  oldest_wait_hours: number | null;
  sends: { last_7_days: number; not_published: number };
  errors: Array<{ post_id: string; title: string | null; url: string | null; error: string }>;
};

const SWEEP_LATE_MINUTES = 45;

function countOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  return null;
}

function parseJsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function hoursSince(iso: string | null, now: number): number | null {
  const then = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(then) ? Math.round((now - then) / 360_000) / 10 : null;
}

export async function getQueueHealth(db: D1Database): Promise<QueueHealth> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 3_600_000).toISOString();

  const [runs, signals, drafts, oldest, sends, errors] = await db.batch([
    db.prepare(
      `SELECT id, started_at, status, error, signals_found, metadata
       FROM community_monitor_runs
       WHERE id IN ('bettermode-reconcile', 'bettermode-webhook')`,
    ),
    db
      .prepare(`SELECT status, COUNT(*) AS n FROM community_signals WHERE platform = ?1 GROUP BY status`)
      .bind(PLATFORM),
    db
      .prepare(
        `SELECT q.status AS status, COUNT(*) AS n
         FROM community_queue q
         JOIN community_signals s ON s.id = q.signal_id
         WHERE q.platform = ?1 AND s.status IN ('new','queued') AND q.status IN ('pending','approved','sending')
         GROUP BY q.status`,
      )
      .bind(PLATFORM),
    db
      .prepare(
        `SELECT MIN(COALESCE(json_extract(metadata, '$.waiting_since'), detected_at)) AS oldest
         FROM community_signals
         WHERE platform = ?1 AND status IN ('new','queued')`,
      )
      .bind(PLATFORM),
    db
      .prepare(
        `SELECT COUNT(*) AS n,
                SUM(CASE WHEN COALESCE(json_extract(result, '$.reply_status'), '') != 'PUBLISHED' THEN 1 ELSE 0 END) AS held
         FROM community_queue
         WHERE platform = ?1 AND status = 'sent' AND sent_at >= ?2
           AND json_extract(result, '$.bettermode_reply_id') IS NOT NULL`,
      )
      .bind(PLATFORM, weekAgo),
    db
      .prepare(
        `SELECT source_id AS post_id, source_url AS url,
                json_extract(metadata, '$.title') AS title,
                json_extract(metadata, '$.last_error') AS error
         FROM community_signals
         WHERE platform = ?1 AND status IN ('new','queued')
           AND json_extract(metadata, '$.last_error') IS NOT NULL
         LIMIT 20`,
      )
      .bind(PLATFORM),
  ]);

  type RunRow = { id: string; started_at: string | null; status: string | null; error: string | null; signals_found: number | null; metadata: string | null };
  const runRows = (runs.results || []) as RunRow[];
  const sweepRow = runRows.find((row) => row.id === 'bettermode-reconcile') || null;
  const hookRow = runRows.find((row) => row.id === 'bettermode-webhook') || null;
  const sweepMeta = parseJsonObject(sweepRow?.metadata ?? null);
  const hookMeta = parseJsonObject(hookRow?.metadata ?? null);
  const sweepAgeHours = hoursSince(sweepRow?.started_at ?? null, now);
  const minutesSince = sweepAgeHours === null ? null : Math.round(sweepAgeHours * 60);

  const byStatus: Record<string, number> = {};
  for (const row of (signals.results || []) as Array<{ status: string; n: number }>) byStatus[row.status] = row.n;
  const draftCounts: Record<string, number> = {};
  for (const row of (drafts.results || []) as Array<{ status: string; n: number }>) draftCounts[row.status] = row.n;
  const sendRow = ((sends.results || []) as Array<{ n: number | null; held: number | null }>)[0];
  const oldestRow = ((oldest.results || []) as Array<{ oldest: string | null }>)[0];

  return {
    generated_at: new Date(now).toISOString(),
    sweep: {
      last_run_at: sweepRow?.started_at ?? null,
      status: sweepRow?.status ?? null,
      error: sweepRow?.error ?? null,
      checked: countOf(sweepMeta.checked),
      missed: countOf(sweepMeta.missed) ?? sweepRow?.signals_found ?? null,
      stale: countOf(sweepMeta.stale),
      reverified: countOf(sweepMeta.reverified),
      minutes_since: minutesSince,
      healthy: sweepRow?.status === 'completed' && minutesSince !== null && minutesSince <= SWEEP_LATE_MINUTES,
    },
    webhook: {
      last_event_at: hookRow?.started_at ?? null,
      last_event: typeof hookMeta.last_event === 'string' ? hookMeta.last_event : null,
      events_recorded: hookRow?.signals_found ?? 0,
      hours_since: hoursSince(hookRow?.started_at ?? null, now),
    },
    counts: {
      open: (byStatus.new ?? 0) + (byStatus.queued ?? 0),
      new: byStatus.new ?? 0,
      queued: byStatus.queued ?? 0,
      responded: byStatus.responded ?? 0,
      dismissed: byStatus.dismissed ?? 0,
    },
    drafts: {
      pending: (draftCounts.pending ?? 0) + (draftCounts.approved ?? 0),
      sending: draftCounts.sending ?? 0,
    },
    oldest_wait_hours: hoursSince(oldestRow?.oldest ?? null, now),
    sends: { last_7_days: sendRow?.n ?? 0, not_published: sendRow?.held ?? 0 },
    errors: ((errors.results || []) as Array<{ post_id: string; title: string | null; url: string | null; error: string }>).map(
      (row) => ({ post_id: row.post_id, title: row.title, url: row.url, error: String(row.error) }),
    ),
  };
}

export type QueueHistoryItem = {
  post_id: string;
  url: string | null;
  title: string | null;
  // sent = a reply went out through the queue; answered = staff replied in
  // Bettermode; dismissed = closed with a reason; removed = post unavailable.
  outcome: 'sent' | 'answered' | 'dismissed' | 'removed';
  closed_at: string | null;
  detail: string | null;
  reply_id: string | null;
  reply_status: string | null;
  requested_by: string | null;
};

// SQL for the time an item reached its current closed outcome. It must not
// move when a later sweep reads the thread again, and it must not come from
// an earlier answer of a thread that opened again.
//   removed   -> the sync that found the post gone
//   dismissed -> this dismissal
//   answered  -> the last staff message, or the reply the queue sent if later
const CLOSED_AT_SQL = `CASE
  WHEN s.status = 'dismissed' AND json_extract(s.metadata, '$.closed_reason') = 'post_unavailable'
    THEN COALESCE(json_extract(s.metadata, '$.synced_at'), s.reviewed_at, s.detected_at)
  WHEN s.status = 'dismissed'
    THEN COALESCE(json_extract(s.metadata, '$.dismissed_at'), s.reviewed_at, json_extract(s.metadata, '$.synced_at'), s.detected_at)
  ELSE COALESCE(
    NULLIF(MAX(COALESCE(json_extract(s.metadata, '$.last_staff_reply_at'), ''), COALESCE(q.sent_at, '')), ''),
    s.reviewed_at,
    json_extract(s.metadata, '$.synced_at'),
    s.detected_at
  )
END`;

// A reply the queue sent counts as the answer when no later staff message
// exists. The stored staff time can trail the send by a moment.
const SENT_MATCH_MS = 5 * 60_000;

function toMs(value: string | null): number {
  if (!value) return NaN;
  // Older rows hold "YYYY-MM-DD HH:MM:SS" in UTC.
  return Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? value.replace(' ', 'T') + 'Z' : value);
}

export function historyOutcome(row: {
  status: string;
  closed_reason: string | null;
  sent_at: string | null;
  last_staff_reply_at: string | null;
}): QueueHistoryItem['outcome'] {
  if (row.status === 'dismissed') return row.closed_reason === 'post_unavailable' ? 'removed' : 'dismissed';
  const sentMs = toMs(row.sent_at);
  if (!Number.isFinite(sentMs)) return 'answered';
  const staffMs = toMs(row.last_staff_reply_at);
  return !Number.isFinite(staffMs) || sentMs >= staffMs - SENT_MATCH_MS ? 'sent' : 'answered';
}

// Closed items, newest first.
export async function listQueueHistory(db: D1Database, limit: number): Promise<QueueHistoryItem[]> {
  const result = await db
    .prepare(
      `SELECT
         s.source_id AS post_id,
         s.source_url AS url,
         s.status AS status,
         substr(s.content, 1, 80) AS excerpt,
         json_extract(s.metadata, '$.title') AS title,
         json_extract(s.metadata, '$.dismiss_reason') AS dismiss_reason,
         json_extract(s.metadata, '$.closed_reason') AS closed_reason,
         json_extract(s.metadata, '$.last_staff_reply_at') AS last_staff_reply_at,
         q.sent_at AS sent_at,
         json_extract(q.result, '$.bettermode_reply_id') AS reply_id,
         json_extract(q.result, '$.reply_status') AS reply_status,
         json_extract(q.result, '$.requested_by') AS requested_by,
         ${CLOSED_AT_SQL} AS closed_at
       FROM community_signals s
       LEFT JOIN community_queue q ON q.id = (
         SELECT id FROM community_queue
         WHERE signal_id = s.id AND status = 'sent'
         ORDER BY sent_at DESC
         LIMIT 1
       )
       WHERE s.platform = ?1 AND s.status IN ('responded','dismissed')
       ORDER BY closed_at DESC
       LIMIT ?2`,
    )
    .bind(PLATFORM, limit)
    .all<{
      post_id: string;
      url: string | null;
      status: string;
      excerpt: string | null;
      title: string | null;
      dismiss_reason: string | null;
      closed_reason: string | null;
      last_staff_reply_at: string | null;
      sent_at: string | null;
      reply_id: string | null;
      reply_status: string | null;
      requested_by: string | null;
      closed_at: string | null;
    }>();

  return (result.results || []).map((row) => {
    const outcome = historyOutcome(row);
    const sent = outcome === 'sent';
    const closedMs = toMs(row.closed_at);
    return {
      post_id: row.post_id,
      url: row.url,
      title: row.title || row.excerpt || null,
      outcome,
      closed_at: Number.isFinite(closedMs) ? new Date(closedMs).toISOString() : null,
      detail: outcome === 'dismissed' ? row.dismiss_reason : outcome === 'removed' ? 'Post removed or unpublished' : null,
      reply_id: sent ? row.reply_id : null,
      reply_status: sent ? row.reply_status : null,
      requested_by: sent ? row.requested_by : null,
    };
  });
}
