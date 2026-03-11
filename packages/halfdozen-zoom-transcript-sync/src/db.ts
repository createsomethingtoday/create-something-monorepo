import type { LedgerRow, SyncRunRow, TranscriptCandidate } from './types';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    discovered_count INTEGER NOT NULL DEFAULT 0,
    queued_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    synced_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    error TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sync_locks (
    id TEXT PRIMARY KEY,
    acquired_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS transcript_sync_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dedup_key TEXT NOT NULL UNIQUE,
    canonical_meeting_key TEXT NOT NULL,
    zoom_meeting_id TEXT,
    zoom_meeting_uuid TEXT,
    meeting_title TEXT NOT NULL,
    meeting_date TEXT NOT NULL,
    recording_start_time TEXT,
    source_url TEXT,
    original_source_url TEXT,
    transcript_file_id TEXT,
    transcript_download_url TEXT NOT NULL,
    transcript_file_type TEXT,
    transcript_file_extension TEXT,
    transcript_sha256 TEXT,
    notion_page_id TEXT,
    notion_page_url TEXT,
    status TEXT NOT NULL DEFAULT 'discovered',
    last_error TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    enqueued_at TEXT,
    last_synced_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transcript_sync_ledger_status
    ON transcript_sync_ledger(status)`,
  `CREATE INDEX IF NOT EXISTS idx_transcript_sync_ledger_meeting
    ON transcript_sync_ledger(canonical_meeting_key, meeting_date)`,
] as const;

export async function initSchema(db: D1Database): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.prepare(statement).run();
  }
}

export async function acquireLock(db: D1Database, lockId: string, ttlSeconds = 300): Promise<boolean> {
  await db.prepare(`DELETE FROM sync_locks WHERE expires_at < ?`).bind(nowIso()).run();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  try {
    await db
      .prepare(`INSERT INTO sync_locks (id, acquired_at, expires_at) VALUES (?, ?, ?)`)
      .bind(lockId, nowIso(), expiresAt)
      .run();
    return true;
  } catch {
    return false;
  }
}

export async function releaseLock(db: D1Database, lockId: string): Promise<void> {
  await db.prepare(`DELETE FROM sync_locks WHERE id = ?`).bind(lockId).run();
}

export async function createSyncRun(db: D1Database, trigger: string): Promise<number> {
  const result = await db
    .prepare(`INSERT INTO sync_runs (trigger_name, started_at, status) VALUES (?, ?, 'running')`)
    .bind(trigger, nowIso())
    .run();
  return Number(result.meta.last_row_id);
}

export async function completeSyncRun(
  db: D1Database,
  runId: number,
  status: 'success' | 'failed' | 'skipped',
  patch: Partial<Pick<SyncRunRow, 'discovered_count' | 'queued_count' | 'skipped_count' | 'synced_count' | 'failed_count' | 'error'>> = {},
): Promise<void> {
  await db
    .prepare(`
      UPDATE sync_runs
      SET completed_at = ?,
          status = ?,
          discovered_count = COALESCE(?, discovered_count),
          queued_count = COALESCE(?, queued_count),
          skipped_count = COALESCE(?, skipped_count),
          synced_count = COALESCE(?, synced_count),
          failed_count = COALESCE(?, failed_count),
          error = COALESCE(?, error)
      WHERE id = ?
    `)
    .bind(
      nowIso(),
      status,
      patch.discovered_count ?? null,
      patch.queued_count ?? null,
      patch.skipped_count ?? null,
      patch.synced_count ?? null,
      patch.failed_count ?? null,
      patch.error ?? null,
      runId,
    )
    .run();
}

export async function incrementRunCounter(
  db: D1Database,
  runId: number,
  column: 'synced_count' | 'failed_count' | 'skipped_count',
): Promise<void> {
  await db.prepare(`UPDATE sync_runs SET ${column} = ${column} + 1 WHERE id = ?`).bind(runId).run();
}

export async function listRecentRuns(db: D1Database, limit = 10): Promise<SyncRunRow[]> {
  const result = await db
    .prepare(`
      SELECT
        id,
        trigger_name AS trigger,
        started_at,
        completed_at,
        status,
        discovered_count,
        queued_count,
        skipped_count,
        synced_count,
        failed_count,
        error
      FROM sync_runs
      ORDER BY id DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<SyncRunRow>();
  return result.results ?? [];
}

export async function listLedgerEntries(
  db: D1Database,
  limit = 25,
  status?: string,
): Promise<LedgerRow[]> {
  if (status) {
    const result = await db
      .prepare(`SELECT * FROM transcript_sync_ledger WHERE status = ? ORDER BY updated_at DESC LIMIT ?`)
      .bind(status, limit)
      .all<LedgerRow>();
    return result.results ?? [];
  }

  const result = await db
    .prepare(`SELECT * FROM transcript_sync_ledger ORDER BY updated_at DESC LIMIT ?`)
    .bind(limit)
    .all<LedgerRow>();
  return result.results ?? [];
}

export async function getLedgerByDedupKey(db: D1Database, dedupKey: string): Promise<LedgerRow | null> {
  return db
    .prepare(`SELECT * FROM transcript_sync_ledger WHERE dedup_key = ? LIMIT 1`)
    .bind(dedupKey)
    .first<LedgerRow>();
}

export async function discoverTranscript(
  db: D1Database,
  candidate: TranscriptCandidate,
): Promise<{ ledger: LedgerRow; shouldEnqueue: boolean }> {
  const existing = await getLedgerByDedupKey(db, candidate.dedupKey);
  const now = nowIso();

  if (!existing) {
    await db
      .prepare(`
        INSERT INTO transcript_sync_ledger (
          dedup_key,
          canonical_meeting_key,
          zoom_meeting_id,
          zoom_meeting_uuid,
          meeting_title,
          meeting_date,
          recording_start_time,
          source_url,
          original_source_url,
          transcript_file_id,
          transcript_download_url,
          transcript_file_type,
          transcript_file_extension,
          status,
          first_seen_at,
          last_seen_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered', ?, ?, ?)
      `)
      .bind(
        candidate.dedupKey,
        candidate.canonicalMeetingKey,
        candidate.meetingId,
        candidate.meetingUuid,
        candidate.meetingTitle,
        candidate.meetingDate,
        candidate.startTime,
        candidate.sourceUrl,
        candidate.originalSourceUrl,
        candidate.transcriptFileId,
        candidate.transcriptDownloadUrl,
        candidate.transcriptFileType,
        candidate.transcriptFileExtension,
        now,
        now,
        now,
      )
      .run();
    const created = await getLedgerByDedupKey(db, candidate.dedupKey);
    if (!created) throw new Error(`Failed to create ledger row for ${candidate.dedupKey}`);
    return { ledger: created, shouldEnqueue: true };
  }

  const shouldEnqueue =
    existing.status !== 'synced' ||
    existing.transcript_file_id !== candidate.transcriptFileId ||
    existing.transcript_download_url !== candidate.transcriptDownloadUrl;

  await db
    .prepare(`
      UPDATE transcript_sync_ledger
      SET canonical_meeting_key = ?,
          zoom_meeting_id = ?,
          zoom_meeting_uuid = ?,
          meeting_title = ?,
          meeting_date = ?,
          recording_start_time = ?,
          source_url = ?,
          original_source_url = ?,
          transcript_file_id = ?,
          transcript_download_url = ?,
          transcript_file_type = ?,
          transcript_file_extension = ?,
          status = CASE WHEN ? THEN 'discovered' ELSE status END,
          last_error = CASE WHEN ? THEN NULL ELSE last_error END,
          last_seen_at = ?,
          updated_at = ?
      WHERE dedup_key = ?
    `)
    .bind(
      candidate.canonicalMeetingKey,
      candidate.meetingId,
      candidate.meetingUuid,
      candidate.meetingTitle,
      candidate.meetingDate,
      candidate.startTime,
      candidate.sourceUrl,
      candidate.originalSourceUrl,
      candidate.transcriptFileId,
      candidate.transcriptDownloadUrl,
      candidate.transcriptFileType,
      candidate.transcriptFileExtension,
      shouldEnqueue ? 1 : 0,
      shouldEnqueue ? 1 : 0,
      now,
      now,
      candidate.dedupKey,
    )
    .run();

  const ledger = await getLedgerByDedupKey(db, candidate.dedupKey);
  if (!ledger) throw new Error(`Failed to reload ledger row for ${candidate.dedupKey}`);
  return { ledger, shouldEnqueue };
}

export async function markLedgerEnqueued(db: D1Database, dedupKey: string): Promise<void> {
  await db
    .prepare(`
      UPDATE transcript_sync_ledger
      SET status = 'queued',
          enqueued_at = ?,
          updated_at = ?
      WHERE dedup_key = ?
    `)
    .bind(nowIso(), nowIso(), dedupKey)
    .run();
}

export async function markLedgerSkipped(
  db: D1Database,
  dedupKey: string,
  pageId: string | null,
  pageUrl: string | null,
  transcriptSha: string | null,
  reason: string,
): Promise<void> {
  await db
    .prepare(`
      UPDATE transcript_sync_ledger
      SET notion_page_id = COALESCE(?, notion_page_id),
          notion_page_url = COALESCE(?, notion_page_url),
          transcript_sha256 = COALESCE(?, transcript_sha256),
          status = 'skipped',
          last_error = ?,
          updated_at = ?
      WHERE dedup_key = ?
    `)
    .bind(pageId, pageUrl, transcriptSha, reason, nowIso(), dedupKey)
    .run();
}

export async function markLedgerSynced(
  db: D1Database,
  dedupKey: string,
  pageId: string,
  pageUrl: string,
  transcriptSha: string,
): Promise<void> {
  await db
    .prepare(`
      UPDATE transcript_sync_ledger
      SET notion_page_id = ?,
          notion_page_url = ?,
          transcript_sha256 = ?,
          status = 'synced',
          last_error = NULL,
          last_synced_at = ?,
          updated_at = ?
      WHERE dedup_key = ?
    `)
    .bind(pageId, pageUrl, transcriptSha, nowIso(), nowIso(), dedupKey)
    .run();
}

export async function markLedgerFailed(db: D1Database, dedupKey: string, error: string): Promise<void> {
  await db
    .prepare(`
      UPDATE transcript_sync_ledger
      SET status = 'failed',
          last_error = ?,
          updated_at = ?
      WHERE dedup_key = ?
    `)
    .bind(error, nowIso(), dedupKey)
    .run();
}

function nowIso(): string {
  return new Date().toISOString();
}
