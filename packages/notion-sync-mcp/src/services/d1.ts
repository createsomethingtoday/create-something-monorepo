/**
 * Cloudflare D1 service — manages sync state, ID mappings, and client registrations.
 *
 * Three-Tier Framework alignment:
 *   - Database tier: This IS the Database tier — persistence of sync state
 *   - Artifact: D1Config flows from AccountContext.metadata into every operation
 *
 * Refactored from the reference to accept D1Config explicitly instead of
 * reading from process.env globals. This makes the service context-scoped.
 */

import type {
  ClientMapping,
  PageIdMapping,
  SyncLogEntry,
  D1Response,
  D1Config,
} from "../types.js";
import { CF_API_BASE } from "../constants.js";

// ─── D1 Query Helper ────────────────────────────────────────────────

function getD1Url(config: D1Config): string {
  return `${CF_API_BASE}/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
}

async function executeQuery(
  config: D1Config,
  sql: string,
  params: unknown[] = []
): Promise<D1Response> {
  const response = await fetch(getD1Url(config), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`D1 query failed (${response.status}): ${text}`);
  }

  return (await response.json()) as D1Response;
}

// ─── Auto-Initialization ────────────────────────────────────────────

let _initialized = false;

/**
 * Ensure D1 tables exist, creating them if needed.
 *
 * Uses a module-level flag to avoid repeated checks within the same
 * process lifetime. On first call, attempts a lightweight query; if
 * the table doesn't exist, runs full schema initialization.
 */
export async function ensureInitialized(config: D1Config): Promise<void> {
  if (_initialized) return;

  try {
    // Lightweight probe — if this succeeds, tables exist
    await executeQuery(config, "SELECT 1 FROM client_mappings LIMIT 1");
    _initialized = true;
  } catch {
    // Table doesn't exist — initialize schema
    await initializeSchema(config);
    _initialized = true;
  }
}

// ─── Schema Initialization ──────────────────────────────────────────

export async function initializeSchema(config: D1Config): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS client_mappings (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      master_database_id TEXT NOT NULL,
      client_database_id TEXT NOT NULL,
      client_filter_property TEXT NOT NULL,
      client_filter_value TEXT NOT NULL,
      notion_token_master TEXT NOT NULL,
      notion_token_client TEXT NOT NULL,
      sync_properties TEXT NOT NULL DEFAULT '[]',
      conflict_strategy TEXT NOT NULL DEFAULT 'master_wins',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS page_id_mappings (
      id TEXT PRIMARY KEY,
      client_mapping_id TEXT NOT NULL,
      master_page_id TEXT NOT NULL,
      client_page_id TEXT NOT NULL,
      master_last_edited TEXT,
      client_last_edited TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_mapping_id) REFERENCES client_mappings(id)
    )`,
    `CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      client_mapping_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      pages_pushed INTEGER DEFAULT 0,
      pages_pulled INTEGER DEFAULT 0,
      pages_created INTEGER DEFAULT 0,
      conflicts_count INTEGER DEFAULT 0,
      errors_count INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (client_mapping_id) REFERENCES client_mappings(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_page_mappings_master
     ON page_id_mappings(client_mapping_id, master_page_id)`,
    `CREATE INDEX IF NOT EXISTS idx_page_mappings_client
     ON page_id_mappings(client_mapping_id, client_page_id)`,
    `CREATE INDEX IF NOT EXISTS idx_page_mappings_status
     ON page_id_mappings(sync_status)`,
  ];

  for (const sql of statements) {
    await executeQuery(config, sql);
  }
}

// ─── Client Mapping CRUD ────────────────────────────────────────────

export async function createClientMapping(
  config: D1Config,
  mapping: Omit<ClientMapping, "created_at" | "updated_at">
): Promise<ClientMapping> {
  const sql = `INSERT INTO client_mappings
    (id, client_name, master_database_id, client_database_id,
     client_filter_property, client_filter_value,
     notion_token_master, notion_token_client,
     sync_properties, conflict_strategy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *`;

  const result = await executeQuery(config, sql, [
    mapping.id,
    mapping.client_name,
    mapping.master_database_id,
    mapping.client_database_id,
    mapping.client_filter_property,
    mapping.client_filter_value,
    mapping.notion_token_master,
    mapping.notion_token_client,
    JSON.stringify(mapping.sync_properties),
    mapping.conflict_strategy,
  ]);

  return result.result[0].results[0] as unknown as ClientMapping;
}

export async function getClientMapping(
  config: D1Config,
  id: string
): Promise<ClientMapping | null> {
  const result = await executeQuery(
    config,
    "SELECT * FROM client_mappings WHERE id = ?",
    [id]
  );
  const rows = result.result[0].results;
  return rows.length > 0 ? (rows[0] as unknown as ClientMapping) : null;
}

export async function getClientMappingByName(
  config: D1Config,
  name: string
): Promise<ClientMapping | null> {
  const result = await executeQuery(
    config,
    "SELECT * FROM client_mappings WHERE client_name = ?",
    [name]
  );
  const rows = result.result[0].results;
  return rows.length > 0 ? (rows[0] as unknown as ClientMapping) : null;
}

export async function listClientMappings(
  config: D1Config
): Promise<ClientMapping[]> {
  const result = await executeQuery(
    config,
    "SELECT * FROM client_mappings ORDER BY client_name"
  );
  return result.result[0].results as unknown as ClientMapping[];
}

export async function updateClientMapping(
  config: D1Config,
  id: string,
  updates: { sync_properties?: string[]; conflict_strategy?: string }
): Promise<ClientMapping | null> {
  const setParts: string[] = [];
  const params: unknown[] = [];

  if (updates.sync_properties !== undefined) {
    setParts.push("sync_properties = ?");
    params.push(JSON.stringify(updates.sync_properties));
  }

  if (updates.conflict_strategy !== undefined) {
    setParts.push("conflict_strategy = ?");
    params.push(updates.conflict_strategy);
  }

  if (setParts.length === 0) return getClientMapping(config, id);

  setParts.push("updated_at = datetime('now')");
  params.push(id);

  const sql = `UPDATE client_mappings SET ${setParts.join(", ")} WHERE id = ? RETURNING *`;
  const result = await executeQuery(config, sql, params);
  const rows = result.result[0].results;
  return rows.length > 0 ? (rows[0] as unknown as ClientMapping) : null;
}

export async function deleteClientMapping(
  config: D1Config,
  id: string
): Promise<boolean> {
  // Delete page mappings first
  await executeQuery(
    config,
    "DELETE FROM page_id_mappings WHERE client_mapping_id = ?",
    [id]
  );
  await executeQuery(
    config,
    "DELETE FROM sync_logs WHERE client_mapping_id = ?",
    [id]
  );
  const result = await executeQuery(
    config,
    "DELETE FROM client_mappings WHERE id = ?",
    [id]
  );
  return result.result[0].meta.changes > 0;
}

// ─── Page ID Mapping CRUD ───────────────────────────────────────────

export async function upsertPageMapping(
  config: D1Config,
  mapping: Omit<PageIdMapping, "created_at">
): Promise<void> {
  const sql = `INSERT INTO page_id_mappings
    (id, client_mapping_id, master_page_id, client_page_id,
     master_last_edited, client_last_edited, sync_status, last_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      master_last_edited = excluded.master_last_edited,
      client_last_edited = excluded.client_last_edited,
      sync_status = excluded.sync_status,
      last_synced_at = excluded.last_synced_at`;

  await executeQuery(config, sql, [
    mapping.id,
    mapping.client_mapping_id,
    mapping.master_page_id,
    mapping.client_page_id,
    mapping.master_last_edited,
    mapping.client_last_edited,
    mapping.sync_status,
    mapping.last_synced_at,
  ]);
}

export async function getPageMappingByMasterId(
  config: D1Config,
  clientMappingId: string,
  masterPageId: string
): Promise<PageIdMapping | null> {
  const result = await executeQuery(
    config,
    `SELECT * FROM page_id_mappings
     WHERE client_mapping_id = ? AND master_page_id = ?`,
    [clientMappingId, masterPageId]
  );
  const rows = result.result[0].results;
  return rows.length > 0 ? (rows[0] as unknown as PageIdMapping) : null;
}

export async function getPageMappingByClientId(
  config: D1Config,
  clientMappingId: string,
  clientPageId: string
): Promise<PageIdMapping | null> {
  const result = await executeQuery(
    config,
    `SELECT * FROM page_id_mappings
     WHERE client_mapping_id = ? AND client_page_id = ?`,
    [clientMappingId, clientPageId]
  );
  const rows = result.result[0].results;
  return rows.length > 0 ? (rows[0] as unknown as PageIdMapping) : null;
}

export async function listPageMappings(
  config: D1Config,
  clientMappingId: string,
  statusFilter?: string
): Promise<PageIdMapping[]> {
  let sql = "SELECT * FROM page_id_mappings WHERE client_mapping_id = ?";
  const params: unknown[] = [clientMappingId];

  if (statusFilter) {
    sql += " AND sync_status = ?";
    params.push(statusFilter);
  }

  const result = await executeQuery(config, sql, params);
  return result.result[0].results as unknown as PageIdMapping[];
}

export async function updatePageMappingStatus(
  config: D1Config,
  id: string,
  status: string,
  lastSyncedAt?: string
): Promise<void> {
  const sql = lastSyncedAt
    ? "UPDATE page_id_mappings SET sync_status = ?, last_synced_at = ? WHERE id = ?"
    : "UPDATE page_id_mappings SET sync_status = ? WHERE id = ?";

  const params = lastSyncedAt ? [status, lastSyncedAt, id] : [status, id];
  await executeQuery(config, sql, params);
}

// ─── Sync Logs ──────────────────────────────────────────────────────

export async function createSyncLog(
  config: D1Config,
  log: Omit<SyncLogEntry, "completed_at">
): Promise<void> {
  await executeQuery(
    config,
    `INSERT INTO sync_logs
     (id, client_mapping_id, direction, pages_pushed, pages_pulled,
      pages_created, conflicts_count, errors_count, duration_ms, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      log.id,
      log.client_mapping_id,
      log.direction,
      log.pages_pushed,
      log.pages_pulled,
      log.pages_created,
      log.conflicts_count,
      log.errors_count,
      log.duration_ms,
      log.started_at,
    ]
  );
}

export async function getRecentSyncLogs(
  config: D1Config,
  clientMappingId: string,
  limit = 10
): Promise<SyncLogEntry[]> {
  const result = await executeQuery(
    config,
    `SELECT * FROM sync_logs
     WHERE client_mapping_id = ?
     ORDER BY started_at DESC LIMIT ?`,
    [clientMappingId, limit]
  );
  return result.result[0].results as unknown as SyncLogEntry[];
}

// ─── Stats ──────────────────────────────────────────────────────────

export async function getSyncStats(config: D1Config): Promise<{
  total_clients: number;
  total_page_mappings: number;
  pending_syncs: number;
  conflicts: number;
}> {
  const clientsResult = await executeQuery(
    config,
    "SELECT COUNT(*) as count FROM client_mappings"
  );
  const mappingsResult = await executeQuery(
    config,
    "SELECT COUNT(*) as count FROM page_id_mappings"
  );
  const pendingResult = await executeQuery(
    config,
    "SELECT COUNT(*) as count FROM page_id_mappings WHERE sync_status IN ('pending_push', 'pending_pull')"
  );
  const conflictsResult = await executeQuery(
    config,
    "SELECT COUNT(*) as count FROM page_id_mappings WHERE sync_status = 'conflict'"
  );

  return {
    total_clients: (clientsResult.result[0].results[0] as { count: number })
      .count,
    total_page_mappings: (
      mappingsResult.result[0].results[0] as { count: number }
    ).count,
    pending_syncs: (pendingResult.result[0].results[0] as { count: number })
      .count,
    conflicts: (conflictsResult.result[0].results[0] as { count: number })
      .count,
  };
}
