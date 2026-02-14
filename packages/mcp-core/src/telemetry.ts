/**
 * MCP Telemetry — run metering, activity tracking, and health monitoring
 *
 * Three-Tier Framework alignment:
 *   - Database:    mcp_run_counts + mcp_tool_invocations tables (what exists)
 *   - Automation:  enableTelemetry wraps tool handlers (what happens)
 *   - Judgment:    Health thresholds + error rate monitoring (what should happen)
 *   - Insight:     telemetry://usage, telemetry://health, telemetry://activity resources
 *
 * Usage in McpAgent workers:
 * ```typescript
 * import { enableTelemetry } from '@create-something/mcp-core';
 *
 * export class MyMCP extends McpAgent<Env> {
 *   server = new McpServer({ name: 'my-mcp', version: '1.0.0' });
 *   async init() {
 *     enableTelemetry(this.server, this.env.FEEDBACK_DB, 'my-mcp');
 *     // All tool registrations after this are automatically metered
 *     this.server.tool('my_tool', 'desc', schema, handler);
 *   }
 * }
 * ```
 *
 * The migration must be applied to the D1 database first:
 *   wrangler d1 migrations apply halfdozen-feedback
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { D1Database } from './stores/d1.js';

// =============================================================================
// Types
// =============================================================================

export interface RunCountRow {
  server_name: string;
  account_id: string;
  period_start: string;
  runs_this_period: number;
  updated_at: string;
}

export interface ToolInvocationRow {
  id: number;
  server_name: string;
  account_id: string;
  tool_name: string;
  success: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface UsageResult {
  serverName: string;
  accountId: string;
  period: string;
  runsThisPeriod: number;
}

export interface HealthResult {
  serverName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalInvocations24h: number;
  errorRate24h: number;
  toolBreakdown: Array<{
    toolName: string;
    invocations: number;
    errors: number;
    avgDurationMs: number;
  }>;
  lastActivity: string | null;
  checkedAt: string;
}

export interface ActivityResult {
  serverName: string;
  invocations: Array<{
    toolName: string;
    accountId: string;
    success: boolean;
    durationMs: number | null;
    error: string | null;
    createdAt: string;
  }>;
}

// =============================================================================
// Period Helpers
// =============================================================================

function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// =============================================================================
// Core Operations
// =============================================================================

/**
 * Record a tool invocation — updates aggregate run_counts and logs the invocation.
 * Best-effort: failures are swallowed so tool execution is never blocked.
 */
export async function recordInvocation(
  db: D1Database,
  serverName: string,
  accountId: string,
  toolName: string,
  durationMs: number,
  success: boolean,
  error?: unknown,
): Promise<void> {
  const period = getCurrentPeriod();
  const errorMessage = error
    ? (error instanceof Error ? error.message : String(error)).slice(0, 500)
    : null;

  // Upsert aggregate run count
  await db
    .prepare(
      `INSERT INTO mcp_run_counts (server_name, account_id, period_start, runs_this_period, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'))
       ON CONFLICT(server_name, account_id, period_start) DO UPDATE SET
         runs_this_period = mcp_run_counts.runs_this_period + 1,
         updated_at = datetime('now')`,
    )
    .bind(serverName, accountId, period)
    .run();

  // Log individual invocation
  await db
    .prepare(
      `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(serverName, accountId, toolName, success ? 1 : 0, durationMs, errorMessage)
    .run();
}

/**
 * Get usage stats for a server (optionally filtered by account).
 */
export async function getUsage(
  db: D1Database,
  serverName: string,
  accountId?: string,
): Promise<UsageResult> {
  const period = getCurrentPeriod();
  const acct = accountId || 'operator';

  const row = await db
    .prepare(
      `SELECT server_name, account_id, period_start, runs_this_period
       FROM mcp_run_counts WHERE server_name = ? AND account_id = ? AND period_start = ?`,
    )
    .bind(serverName, acct, period)
    .first<RunCountRow>();

  return {
    serverName,
    accountId: acct,
    period,
    runsThisPeriod: row?.runs_this_period ?? 0,
  };
}

/**
 * Get health status for a server based on last 24 hours of activity.
 */
export async function getHealth(
  db: D1Database,
  serverName: string,
): Promise<HealthResult> {
  // Tool breakdown for last 24h
  const breakdown = await db
    .prepare(
      `SELECT
         tool_name,
         COUNT(*) as invocations,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
         AVG(duration_ms) as avg_duration_ms
       FROM mcp_tool_invocations
       WHERE server_name = ? AND created_at > datetime('now', '-24 hours')
       GROUP BY tool_name
       ORDER BY invocations DESC`,
    )
    .bind(serverName)
    .all<{ tool_name: string; invocations: number; errors: number; avg_duration_ms: number }>();

  // Last activity
  const lastRow = await db
    .prepare(
      `SELECT created_at FROM mcp_tool_invocations
       WHERE server_name = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(serverName)
    .first<{ created_at: string }>();

  const totalInvocations = breakdown.results.reduce((sum, r) => sum + r.invocations, 0);
  const totalErrors = breakdown.results.reduce((sum, r) => sum + r.errors, 0);
  const errorRate = totalInvocations > 0 ? totalErrors / totalInvocations : 0;

  // Health status thresholds
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (errorRate > 0.5) status = 'unhealthy';
  else if (errorRate > 0.1) status = 'degraded';

  return {
    serverName,
    status,
    totalInvocations24h: totalInvocations,
    errorRate24h: Math.round(errorRate * 1000) / 1000,
    toolBreakdown: breakdown.results.map((r) => ({
      toolName: r.tool_name,
      invocations: r.invocations,
      errors: r.errors,
      avgDurationMs: Math.round(r.avg_duration_ms ?? 0),
    })),
    lastActivity: lastRow?.created_at ?? null,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Get recent activity log for a server.
 */
export async function getActivity(
  db: D1Database,
  serverName: string,
  limit: number = 50,
): Promise<ActivityResult> {
  const rows = await db
    .prepare(
      `SELECT tool_name, account_id, success, duration_ms, error_message, created_at
       FROM mcp_tool_invocations
       WHERE server_name = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .bind(serverName, limit)
    .all<ToolInvocationRow>();

  return {
    serverName,
    invocations: rows.results.map((r) => ({
      toolName: r.tool_name,
      accountId: r.account_id,
      success: r.success === 1,
      durationMs: r.duration_ms,
      error: r.error_message,
      createdAt: r.created_at,
    })),
  };
}

/**
 * Cleanup old invocations to prevent D1 bloat.
 * Keep last N days. Run periodically (e.g., via cron).
 */
export async function cleanupOldInvocations(
  db: D1Database,
  daysToKeep: number = 30,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM mcp_tool_invocations WHERE created_at < datetime('now', '-' || ? || ' days')`,
    )
    .bind(daysToKeep)
    .run();
}

// =============================================================================
// enableTelemetry — the integration point
// =============================================================================

/**
 * Enable telemetry on an McpServer instance.
 *
 * Call this BEFORE registering tools. It proxies `server.tool()` to wrap
 * every handler with metering, and registers telemetry resources.
 *
 * Best-effort: metering failures never block tool execution.
 *
 * @param server        - McpServer instance
 * @param db            - D1 database with telemetry tables (run migration first)
 * @param serverName    - MCP server name (stored with each record)
 * @param getAccountId  - Optional function to resolve account ID (defaults to 'operator')
 */
export function enableTelemetry(
  server: McpServer,
  db: D1Database,
  serverName: string,
  getAccountId?: () => string,
): void {
  const resolveAccount = getAccountId || (() => 'operator');

  // Proxy server.tool() to wrap handlers with metering.
  // Cast through `any` to bypass TypeScript's strict overload checking on .apply().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalToolFn = (server as any).tool;

  (server as any).tool = function (...args: unknown[]) {
    const lastIdx = args.length - 1;
    const originalHandler = args[lastIdx];

    if (typeof originalHandler !== 'function') {
      return originalToolFn.apply(server, args);
    }

    const toolName = args[0] as string;

    // Skip metering on the submit_feedback tool (meta-operation)
    if (toolName === 'submit_feedback') {
      return originalToolFn.apply(server, args);
    }

    // Wrap the handler with metering
    args[lastIdx] = async (...handlerArgs: unknown[]) => {
      const start = Date.now();
      try {
        const result = await (originalHandler as Function).apply(null, handlerArgs);
        recordInvocation(db, serverName, resolveAccount(), toolName, Date.now() - start, true)
          .catch((e: unknown) => console.warn(`[telemetry] metering failed for ${toolName}:`, e));
        return result;
      } catch (error) {
        recordInvocation(db, serverName, resolveAccount(), toolName, Date.now() - start, false, error)
          .catch((e: unknown) => console.warn(`[telemetry] metering failed for ${toolName}:`, e));
        throw error;
      }
    };

    return originalToolFn.apply(server, args);
  };

  // Register telemetry resources
  registerTelemetryResources(server, db, serverName, resolveAccount);
}

// =============================================================================
// Telemetry Resources
// =============================================================================

function registerTelemetryResources(
  server: McpServer,
  db: D1Database,
  serverName: string,
  getAccountId: () => string,
): void {
  // Usage resource — aggregate run counts
  server.resource(
    'telemetry-usage',
    'telemetry://usage',
    {
      description: `Run usage for ${serverName} this period`,
      mimeType: 'application/json',
    },
    async () => {
      try {
        const usage = await getUsage(db, serverName, getAccountId());
        return {
          contents: [{
            uri: 'telemetry://usage',
            mimeType: 'application/json',
            text: JSON.stringify(usage, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: 'telemetry://usage',
            mimeType: 'application/json',
            text: JSON.stringify({ error: String(error), serverName }),
          }],
        };
      }
    },
  );

  // Health resource — error rates, response times, status
  server.resource(
    'telemetry-health',
    'telemetry://health',
    {
      description: `Health status for ${serverName} (last 24 hours)`,
      mimeType: 'application/json',
    },
    async () => {
      try {
        const health = await getHealth(db, serverName);
        return {
          contents: [{
            uri: 'telemetry://health',
            mimeType: 'application/json',
            text: JSON.stringify(health, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: 'telemetry://health',
            mimeType: 'application/json',
            text: JSON.stringify({
              serverName,
              status: 'unhealthy',
              error: String(error),
              checkedAt: new Date().toISOString(),
            }),
          }],
        };
      }
    },
  );

  // Activity resource — recent tool invocations
  server.resource(
    'telemetry-activity',
    'telemetry://activity',
    {
      description: `Recent activity log for ${serverName}`,
      mimeType: 'application/json',
    },
    async () => {
      try {
        const activity = await getActivity(db, serverName);
        return {
          contents: [{
            uri: 'telemetry://activity',
            mimeType: 'application/json',
            text: JSON.stringify(activity, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: 'telemetry://activity',
            mimeType: 'application/json',
            text: JSON.stringify({ error: String(error), serverName }),
          }],
        };
      }
    },
  );
}

// =============================================================================
// Migration SQL
// =============================================================================

/**
 * SQL migration for telemetry tables. Apply to the shared D1 database.
 *
 * Usage:
 *   wrangler d1 migrations apply halfdozen-feedback
 *
 * Or programmatically:
 *   await db.prepare(TELEMETRY_MIGRATION).run();
 */
export const TELEMETRY_MIGRATION = `
-- MCP Telemetry: Aggregate run counts per server/account/month
CREATE TABLE IF NOT EXISTS mcp_run_counts (
  server_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  runs_this_period INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (server_name, account_id, period_start)
);

-- MCP Telemetry: Individual tool invocation log
CREATE TABLE IF NOT EXISTS mcp_tool_invocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for health queries
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_server_time
  ON mcp_tool_invocations(server_name, created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_tool
  ON mcp_tool_invocations(server_name, tool_name);
`.trim();
