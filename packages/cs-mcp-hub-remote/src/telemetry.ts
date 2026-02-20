import type { Env, HubInvocationLog, HubRouteLog } from './types.js';
import { isMissingColumnError, safeJsonStringify } from './utils.js';

const HUB_NAME = 'create-something-hub-remote';

let hubRouteTableReady = false;

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function recordHubInvocation(env: Env, log: HubInvocationLog): Promise<void> {
  const db = env.TELEMETRY_DB;
  if (!db) return;

  const accountId = (log.accountId || 'operator').slice(0, 256);
  const period = getCurrentPeriod();
  const errorMessage = log.errorMessage ? log.errorMessage.slice(0, 500) : null;
  const metadataJson = safeJsonStringify(log.metadata);

  try {
    await db
      .prepare(
        `INSERT INTO mcp_run_counts (server_name, account_id, period_start, runs_this_period, updated_at)
         VALUES (?, ?, ?, 1, datetime('now'))
         ON CONFLICT(server_name, account_id, period_start) DO UPDATE SET
           runs_this_period = mcp_run_counts.runs_this_period + 1,
           updated_at = datetime('now')`
      )
      .bind(HUB_NAME, accountId, period)
      .run();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] telemetry run count write failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    await db
      .prepare(
        `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        HUB_NAME,
        accountId,
        log.toolName,
        log.success ? 1 : 0,
        Math.max(0, Math.floor(log.durationMs)),
        errorMessage,
        log.trace.correlationId,
        log.trace.requestId,
        metadataJson
      )
      .run();
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingMetadata = isMissingColumnError(message, 'metadata_json');
    const missingTrace =
      isMissingColumnError(message, 'correlation_id') ||
      isMissingColumnError(message, 'request_id');

    if (!missingMetadata && !missingTrace) {
      console.warn(`[${HUB_NAME}] telemetry invocation write failed: ${message}`);
      return;
    }

    if (!missingTrace) {
      try {
        await db
          .prepare(
            `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            HUB_NAME,
            accountId,
            log.toolName,
            log.success ? 1 : 0,
            Math.max(0, Math.floor(log.durationMs)),
            errorMessage,
            log.trace.correlationId,
            log.trace.requestId
          )
          .run();
        return;
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        if (
          !isMissingColumnError(fallbackMessage, 'correlation_id') &&
          !isMissingColumnError(fallbackMessage, 'request_id')
        ) {
          console.warn(`[${HUB_NAME}] telemetry fallback write failed: ${fallbackMessage}`);
          return;
        }
      }
    }
  }

  try {
    await db
      .prepare(
        `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        HUB_NAME,
        accountId,
        log.toolName,
        log.success ? 1 : 0,
        Math.max(0, Math.floor(log.durationMs)),
        errorMessage
      )
      .run();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] telemetry basic write failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function ensureHubRouteTable(db: D1Database): Promise<void> {
  if (hubRouteTableReady) return;

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS mcp_hub_routes (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         hub_server_name TEXT NOT NULL,
         account_id TEXT NOT NULL,
         downstream_server_name TEXT NOT NULL,
         downstream_tool_name TEXT NOT NULL,
         success INTEGER NOT NULL DEFAULT 1,
         duration_ms INTEGER,
         error_message TEXT,
         correlation_id TEXT,
         request_id TEXT,
         metadata_json TEXT,
         created_at TEXT NOT NULL DEFAULT (datetime('now'))
       )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_mcp_hub_routes_correlation_time
         ON mcp_hub_routes(correlation_id, created_at)`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS idx_mcp_hub_routes_downstream_time
         ON mcp_hub_routes(downstream_server_name, created_at)`
    )
    .run();

  hubRouteTableReady = true;
}

export async function recordHubRouteInvocation(env: Env, log: HubRouteLog): Promise<void> {
  const db = env.TELEMETRY_DB;
  if (!db) return;

  try {
    await ensureHubRouteTable(db);
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] failed creating mcp_hub_routes table: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  try {
    await db
      .prepare(
        `INSERT INTO mcp_hub_routes (
           hub_server_name,
           account_id,
           downstream_server_name,
           downstream_tool_name,
           success,
           duration_ms,
           error_message,
           correlation_id,
           request_id,
           metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        HUB_NAME,
        (log.accountId || 'operator').slice(0, 256),
        log.downstreamServer,
        log.downstreamTool,
        log.success ? 1 : 0,
        Math.max(0, Math.floor(log.durationMs)),
        log.errorMessage ? log.errorMessage.slice(0, 500) : null,
        log.trace.correlationId,
        log.trace.requestId,
        safeJsonStringify(log.metadata)
      )
      .run();
  } catch (error) {
    console.warn(
      `[${HUB_NAME}] route telemetry write failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function queryTraceByCorrelation(
  env: Env,
  correlationId: string,
  limit: number
): Promise<Record<string, unknown>> {
  const db = env.TELEMETRY_DB;
  if (!db) {
    return {
      correlationId,
      count: 0,
      error: 'TELEMETRY_DB binding is not configured on this hub deployment.'
    };
  }

  const baseBind = [correlationId, limit];
  try {
    const rows = await db
      .prepare(
        `SELECT server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json, created_at
         FROM mcp_tool_invocations
         WHERE correlation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(...baseBind)
      .all<{
        server_name: string;
        account_id: string;
        tool_name: string;
        success: number;
        duration_ms: number | null;
        error_message: string | null;
        correlation_id: string | null;
        request_id: string | null;
        metadata_json: string | null;
        created_at: string;
      }>();

    const routeRows = await queryHubRouteRowsByCorrelation(db, correlationId, limit);
    return formatTraceLookupResult(correlationId, rows.results, routeRows);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingMetadata = isMissingColumnError(message, 'metadata_json');
    if (!missingMetadata) {
      return {
        correlationId,
        count: 0,
        error: message
      };
    }

    const fallbackRows = await db
      .prepare(
        `SELECT server_name, account_id, tool_name, success, duration_ms, error_message, correlation_id, request_id, NULL as metadata_json, created_at
         FROM mcp_tool_invocations
         WHERE correlation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(...baseBind)
      .all<{
        server_name: string;
        account_id: string;
        tool_name: string;
        success: number;
        duration_ms: number | null;
        error_message: string | null;
        correlation_id: string | null;
        request_id: string | null;
        metadata_json: string | null;
        created_at: string;
      }>();

    const routeRows = await queryHubRouteRowsByCorrelation(db, correlationId, limit);
    return formatTraceLookupResult(correlationId, fallbackRows.results, routeRows);
  }
}

async function queryHubRouteRowsByCorrelation(
  db: D1Database,
  correlationId: string,
  limit: number
): Promise<
  Array<{
    hub_server_name: string;
    account_id: string;
    downstream_server_name: string;
    downstream_tool_name: string;
    success: number;
    duration_ms: number | null;
    error_message: string | null;
    correlation_id: string | null;
    request_id: string | null;
    metadata_json: string | null;
    created_at: string;
  }>
> {
  try {
    await ensureHubRouteTable(db);
  } catch {
    return [];
  }

  try {
    const rows = await db
      .prepare(
        `SELECT hub_server_name, account_id, downstream_server_name, downstream_tool_name, success, duration_ms, error_message, correlation_id, request_id, metadata_json, created_at
         FROM mcp_hub_routes
         WHERE correlation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .bind(correlationId, limit)
      .all<{
        hub_server_name: string;
        account_id: string;
        downstream_server_name: string;
        downstream_tool_name: string;
        success: number;
        duration_ms: number | null;
        error_message: string | null;
        correlation_id: string | null;
        request_id: string | null;
        metadata_json: string | null;
        created_at: string;
      }>();

    return rows.results;
  } catch {
    return [];
  }
}

function parseMetadataJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function formatTraceLookupResult(
  correlationId: string,
  rows: Array<{
    server_name: string;
    account_id: string;
    tool_name: string;
    success: number;
    duration_ms: number | null;
    error_message: string | null;
    correlation_id: string | null;
    request_id: string | null;
    metadata_json: string | null;
    created_at: string;
  }>,
  routeRows: Array<{
    hub_server_name: string;
    account_id: string;
    downstream_server_name: string;
    downstream_tool_name: string;
    success: number;
    duration_ms: number | null;
    error_message: string | null;
    correlation_id: string | null;
    request_id: string | null;
    metadata_json: string | null;
    created_at: string;
  }>
): Record<string, unknown> {
  const invocations = rows.map((row) => ({
    server: row.server_name,
    accountId: row.account_id,
    tool: row.tool_name,
    success: row.success === 1,
    durationMs: row.duration_ms,
    error: row.error_message,
    correlationId: row.correlation_id,
    requestId: row.request_id,
    metadata: parseMetadataJson(row.metadata_json),
    timestamp: row.created_at,
    where: row.server_name === HUB_NAME ? 'hub' : 'downstream'
  }));

  const routedDownstreamInvocations = routeRows.map((row) => ({
    hub: row.hub_server_name,
    server: row.downstream_server_name,
    accountId: row.account_id,
    tool: row.downstream_tool_name,
    success: row.success === 1,
    durationMs: row.duration_ms,
    error: row.error_message,
    correlationId: row.correlation_id,
    requestId: row.request_id,
    metadata: parseMetadataJson(row.metadata_json),
    timestamp: row.created_at,
    where: 'hub-route'
  }));

  return {
    correlationId,
    count: invocations.length,
    hubInvocations: invocations.filter((entry) => entry.where === 'hub'),
    downstreamInvocations: invocations.filter((entry) => entry.where !== 'hub'),
    routedDownstreamInvocations,
    invocations
  };
}
