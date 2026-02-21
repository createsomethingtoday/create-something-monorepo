/**
 * Drive sync checkpoint/index helpers for DM MCP.
 *
 * These tables live in DRIVE_SYNC_DB and are used to:
 * - resume incremental sync windows (sync_checkpoints)
 * - upsert deterministic Notion pages per (entity_id, file_id) pair (file_sync_index)
 */

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta: Record<string, unknown> }>;
}

export interface SyncCheckpointRow {
  entity_id: string;
  last_synced_at: string;
  updated_at: string;
}

export interface FileSyncIndexRow {
  entity_id: string;
  file_id: string;
  notion_page_id: string;
  last_seen_modified_time: string | null;
  last_sync_status: string;
  updated_at: string;
}

export async function getSyncCheckpoint(db: D1Database, entityId: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT last_synced_at FROM sync_checkpoints WHERE entity_id = ?')
    .bind(entityId)
    .first<{ last_synced_at: string }>();
  return row?.last_synced_at ?? null;
}

export async function setSyncCheckpoint(
  db: D1Database,
  entityId: string,
  lastSyncedAt: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO sync_checkpoints (entity_id, last_synced_at, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(entity_id)
       DO UPDATE SET last_synced_at = excluded.last_synced_at, updated_at = excluded.updated_at`
    )
    .bind(entityId, lastSyncedAt, now)
    .run();
}

export async function getIndexedSyncRecord(
  db: D1Database,
  entityId: string,
  fileId: string
): Promise<FileSyncIndexRow | null> {
  return db
    .prepare(
      `SELECT entity_id, file_id, notion_page_id, last_seen_modified_time, last_sync_status, updated_at
       FROM file_sync_index
       WHERE entity_id = ? AND file_id = ?`
    )
    .bind(entityId, fileId)
    .first<FileSyncIndexRow>();
}

export async function upsertIndexedSyncRecord(
  db: D1Database,
  input: {
    entityId: string;
    fileId: string;
    notionPageId: string;
    lastSeenModifiedTime: string | null;
    lastSyncStatus: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO file_sync_index (
         entity_id,
         file_id,
         notion_page_id,
         last_seen_modified_time,
         last_sync_status,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(entity_id, file_id)
       DO UPDATE SET
         notion_page_id = excluded.notion_page_id,
         last_seen_modified_time = excluded.last_seen_modified_time,
         last_sync_status = excluded.last_sync_status,
         updated_at = excluded.updated_at`
    )
    .bind(
      input.entityId,
      input.fileId,
      input.notionPageId,
      input.lastSeenModifiedTime,
      input.lastSyncStatus,
      now
    )
    .run();
}
