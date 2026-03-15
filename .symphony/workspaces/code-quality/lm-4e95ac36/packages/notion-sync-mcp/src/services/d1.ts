/**
 * Cloudflare D1 service — manages sync state, ID mappings, and client registrations.
 *
 * Three-Tier Framework alignment:
 *   - Database tier: This IS the Database tier — persistence of sync state
 *   - Artifact: D1Executor flows from AccountContext.metadata into every operation
 *
 * Supports two access patterns via D1Executor abstraction:
 *   - REST API (stdio mode): createRestExecutor(config)
 *   - D1 Binding (Worker mode): createBindingExecutor(db)
 */

import type {
  ClientMapping,
  PageIdMapping,
  SyncLogEntry,
  D1QueryResult,
  D1RestResponse,
  D1Config,
  D1Executor,
  D1DatabaseBinding,
} from "../types.js";
import { CF_API_BASE } from "../constants.js";
import { encryptToken, decryptToken } from "./crypto.js";

// ─── D1 Executor Implementations ────────────────────────────────────

/**
 * Create a D1Executor that uses the Cloudflare REST API.
 * Used in stdio mode where there's no D1 binding available.
 */
export function createRestExecutor(config: D1Config, encryptionKey?: string): D1Executor {
  const url = `${CF_API_BASE}/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;

  return {
    encryptionKey,
    async execute(sql: string, params: unknown[] = []): Promise<D1QueryResult> {
      const response = await fetch(url, {
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

      const data = (await response.json()) as D1RestResponse;
      return {
        results: data.result[0].results,
        meta: { changes: data.result[0].meta.changes },
      };
    },
  };
}

/**
 * Create a D1Executor that uses Cloudflare's D1 binding directly.
 * Used in Worker mode where env.DB is available — faster, no REST overhead.
 */
export function createBindingExecutor(db: D1DatabaseBinding, encryptionKey?: string): D1Executor {
  return {
    encryptionKey,
    async execute(sql: string, params: unknown[] = []): Promise<D1QueryResult> {
      const stmt = db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.all();

      return {
        results: (result.results ?? []) as Record<string, unknown>[],
        meta: { changes: result.meta?.changes ?? 0 },
      };
    },
  };
}

// ─── Auto-Initialization ────────────────────────────────────────────

/**
 * Track initialization per executor identity (keyed by a stringified
 * reference). In Workers, module-level state persists per isolate, so
 * we use a Map keyed by the executor reference to handle multi-tenant
 * scenarios and avoid repeated schema checks.
 */
const _initializedExecutors = new WeakSet<D1Executor>();

/**
 * Ensure D1 tables exist, creating them if needed.
 *
 * Uses a WeakSet keyed by executor instance to avoid repeated checks
 * within the same isolate lifetime while correctly handling different
 * executor instances.
 */
export async function ensureInitialized(executor: D1Executor): Promise<void> {
  if (_initializedExecutors.has(executor)) return;

  try {
    // Lightweight probe — if this succeeds, tables exist
    await executor.execute("SELECT 1 FROM client_mappings LIMIT 1");
    _initializedExecutors.add(executor);
  } catch {
    // Table doesn't exist — initialize schema
    await initializeSchema(executor);
    _initializedExecutors.add(executor);
  }
}

// ─── Schema Initialization ──────────────────────────────────────────

export async function initializeSchema(executor: D1Executor): Promise<void> {
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
    await executor.execute(sql);
  }
}

// ─── Token Encryption Helpers ────────────────────────────────────────

/**
 * Decrypt Notion tokens in a ClientMapping row.
 * Handles migration from plaintext gracefully.
 */
async function decryptMappingTokens(
  mapping: ClientMapping,
  encryptionKey: string | undefined
): Promise<ClientMapping> {
  return {
    ...mapping,
    notion_token_master: await decryptToken(mapping.notion_token_master, encryptionKey),
    notion_token_client: await decryptToken(mapping.notion_token_client, encryptionKey),
  };
}

/**
 * Decrypt tokens for an array of client mappings.
 */
async function decryptAllMappingTokens(
  mappings: ClientMapping[],
  encryptionKey: string | undefined
): Promise<ClientMapping[]> {
  return Promise.all(mappings.map((m) => decryptMappingTokens(m, encryptionKey)));
}

// ─── Client Mapping CRUD ────────────────────────────────────────────

export async function createClientMapping(
  executor: D1Executor,
  mapping: Omit<ClientMapping, "created_at" | "updated_at">
): Promise<ClientMapping> {
  // Encrypt tokens before storing
  const encryptedMaster = await encryptToken(mapping.notion_token_master, executor.encryptionKey);
  const encryptedClient = await encryptToken(mapping.notion_token_client, executor.encryptionKey);

  const sql = `INSERT INTO client_mappings
    (id, client_name, master_database_id, client_database_id,
     client_filter_property, client_filter_value,
     notion_token_master, notion_token_client,
     sync_properties, conflict_strategy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *`;

  const result = await executor.execute(sql, [
    mapping.id,
    mapping.client_name,
    mapping.master_database_id,
    mapping.client_database_id,
    mapping.client_filter_property,
    mapping.client_filter_value,
    encryptedMaster,
    encryptedClient,
    JSON.stringify(mapping.sync_properties),
    mapping.conflict_strategy,
  ]);

  // Return with decrypted tokens (caller expects plaintext)
  const row = result.results[0] as unknown as ClientMapping;
  return decryptMappingTokens(row, executor.encryptionKey);
}

export async function getClientMapping(
  executor: D1Executor,
  id: string
): Promise<ClientMapping | null> {
  const result = await executor.execute(
    "SELECT * FROM client_mappings WHERE id = ?",
    [id]
  );
  if (result.results.length === 0) return null;
  return decryptMappingTokens(
    result.results[0] as unknown as ClientMapping,
    executor.encryptionKey
  );
}

export async function getClientMappingByName(
  executor: D1Executor,
  name: string
): Promise<ClientMapping | null> {
  const result = await executor.execute(
    "SELECT * FROM client_mappings WHERE client_name = ?",
    [name]
  );
  if (result.results.length === 0) return null;
  return decryptMappingTokens(
    result.results[0] as unknown as ClientMapping,
    executor.encryptionKey
  );
}

export async function listClientMappings(
  executor: D1Executor
): Promise<ClientMapping[]> {
  const result = await executor.execute(
    "SELECT * FROM client_mappings ORDER BY client_name"
  );
  return decryptAllMappingTokens(
    result.results as unknown as ClientMapping[],
    executor.encryptionKey
  );
}

export async function updateClientMapping(
  executor: D1Executor,
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

  if (setParts.length === 0) return getClientMapping(executor, id);

  setParts.push("updated_at = datetime('now')");
  params.push(id);

  const sql = `UPDATE client_mappings SET ${setParts.join(", ")} WHERE id = ? RETURNING *`;
  const result = await executor.execute(sql, params);
  if (result.results.length === 0) return null;
  return decryptMappingTokens(
    result.results[0] as unknown as ClientMapping,
    executor.encryptionKey
  );
}

export async function deleteClientMapping(
  executor: D1Executor,
  id: string
): Promise<boolean> {
  // Delete page mappings first
  await executor.execute(
    "DELETE FROM page_id_mappings WHERE client_mapping_id = ?",
    [id]
  );
  await executor.execute(
    "DELETE FROM sync_logs WHERE client_mapping_id = ?",
    [id]
  );
  const result = await executor.execute(
    "DELETE FROM client_mappings WHERE id = ?",
    [id]
  );
  return result.meta.changes > 0;
}

// ─── Page ID Mapping CRUD ───────────────────────────────────────────

export async function upsertPageMapping(
  executor: D1Executor,
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

  await executor.execute(sql, [
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
  executor: D1Executor,
  clientMappingId: string,
  masterPageId: string
): Promise<PageIdMapping | null> {
  const result = await executor.execute(
    `SELECT * FROM page_id_mappings
     WHERE client_mapping_id = ? AND master_page_id = ?`,
    [clientMappingId, masterPageId]
  );
  return result.results.length > 0
    ? (result.results[0] as unknown as PageIdMapping)
    : null;
}

export async function getPageMappingByClientId(
  executor: D1Executor,
  clientMappingId: string,
  clientPageId: string
): Promise<PageIdMapping | null> {
  const result = await executor.execute(
    `SELECT * FROM page_id_mappings
     WHERE client_mapping_id = ? AND client_page_id = ?`,
    [clientMappingId, clientPageId]
  );
  return result.results.length > 0
    ? (result.results[0] as unknown as PageIdMapping)
    : null;
}

export async function listPageMappings(
  executor: D1Executor,
  clientMappingId: string,
  statusFilter?: string
): Promise<PageIdMapping[]> {
  let sql = "SELECT * FROM page_id_mappings WHERE client_mapping_id = ?";
  const params: unknown[] = [clientMappingId];

  if (statusFilter) {
    sql += " AND sync_status = ?";
    params.push(statusFilter);
  }

  const result = await executor.execute(sql, params);
  return result.results as unknown as PageIdMapping[];
}

export async function updatePageMappingStatus(
  executor: D1Executor,
  id: string,
  status: string,
  lastSyncedAt?: string
): Promise<void> {
  const sql = lastSyncedAt
    ? "UPDATE page_id_mappings SET sync_status = ?, last_synced_at = ? WHERE id = ?"
    : "UPDATE page_id_mappings SET sync_status = ? WHERE id = ?";

  const params = lastSyncedAt ? [status, lastSyncedAt, id] : [status, id];
  await executor.execute(sql, params);
}

// ─── Sync Logs ──────────────────────────────────────────────────────

export async function createSyncLog(
  executor: D1Executor,
  log: Omit<SyncLogEntry, "completed_at">
): Promise<void> {
  await executor.execute(
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
  executor: D1Executor,
  clientMappingId: string,
  limit = 10
): Promise<SyncLogEntry[]> {
  const result = await executor.execute(
    `SELECT * FROM sync_logs
     WHERE client_mapping_id = ?
     ORDER BY started_at DESC LIMIT ?`,
    [clientMappingId, limit]
  );
  return result.results as unknown as SyncLogEntry[];
}

// ─── Stats ──────────────────────────────────────────────────────────

export async function getSyncStats(executor: D1Executor): Promise<{
  total_clients: number;
  total_page_mappings: number;
  pending_syncs: number;
  conflicts: number;
}> {
  const clientsResult = await executor.execute(
    "SELECT COUNT(*) as count FROM client_mappings"
  );
  const mappingsResult = await executor.execute(
    "SELECT COUNT(*) as count FROM page_id_mappings"
  );
  const pendingResult = await executor.execute(
    "SELECT COUNT(*) as count FROM page_id_mappings WHERE sync_status IN ('pending_push', 'pending_pull')"
  );
  const conflictsResult = await executor.execute(
    "SELECT COUNT(*) as count FROM page_id_mappings WHERE sync_status = 'conflict'"
  );

  return {
    total_clients: (clientsResult.results[0] as { count: number }).count,
    total_page_mappings: (mappingsResult.results[0] as { count: number }).count,
    pending_syncs: (pendingResult.results[0] as { count: number }).count,
    conflicts: (conflictsResult.results[0] as { count: number }).count,
  };
}
