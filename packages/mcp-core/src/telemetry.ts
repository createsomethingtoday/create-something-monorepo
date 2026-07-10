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
import { Langfuse } from 'langfuse';
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

export interface LangfuseTelemetryOptions {
  publicKey?: string;
  secretKey?: string;
  host?: string;
  projectName?: string;
  environment?: string;
  enabled?: boolean;
  /**
   * Await the Langfuse trace flush before the tool handler returns.
   *
   * Default false: the flush runs as a floating promise, which is fine for
   * long-lived entry Workers that hold the client connection open. Set true
   * for Workers invoked as short-lived subrequests (e.g. a downstream MCP
   * behind a hub proxy) whose isolate may suspend before a floating flush
   * completes, dropping the trace. Adds one Langfuse round-trip of latency
   * per tool call.
   */
  awaitFlush?: boolean;
}

// =============================================================================
// Langfuse (optional)
// =============================================================================

let langfuseClient: Langfuse | null = null;

function initLangfuseTelemetry(options: LangfuseTelemetryOptions, serverName: string): boolean {
  if (options.enabled === false) return false;
  if (langfuseClient) return true;

  const publicKey = options.publicKey?.trim();
  const secretKey = options.secretKey?.trim();
  if (!publicKey || !secretKey) return false;

  langfuseClient = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: options.host || 'https://us.cloud.langfuse.com',
    flushAt: 1,
    flushInterval: 250,
  });

  return true;
}

async function emitLangfuseInvocation(args: {
  serverName: string;
  toolName: string;
  accountId: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
  projectName?: string;
  environment?: string;
}): Promise<void> {
  if (!langfuseClient) return;

  const trace = langfuseClient.trace({
    name: `mcp:${args.serverName}:${args.toolName}`,
    userId: args.accountId,
    input: args.input,
    output: args.output,
    metadata: {
      server: args.serverName,
      tool: args.toolName,
      accountId: args.accountId,
      durationMs: args.durationMs,
      success: args.success,
      error: args.error,
      projectName: args.projectName,
    },
    tags: ['mcp', args.serverName, args.toolName, args.success ? 'success' : 'error'],
    environment: args.environment,
  });

  trace.span({
    name: `execute:${args.toolName}`,
    input: args.input,
    output: args.output,
    metadata: {
      durationMs: args.durationMs,
      success: args.success,
      error: args.error,
    },
    level: args.success ? 'DEFAULT' : 'ERROR',
    statusMessage: args.error,
  }).end();

  await langfuseClient.flushAsync();
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readHeaderValue(headers: unknown, name: string): string | null {
  const normalizedName = name.toLowerCase();

  if (!headers) return null;

  // Headers-like object
  if (typeof headers === 'object' && headers !== null) {
    const maybeGet = (headers as { get?: unknown }).get;
    if (typeof maybeGet === 'function') {
      try {
        const value = (maybeGet as (key: string) => unknown).call(headers, name);
        const normalized = normalizeString(value);
        if (normalized) return normalized;
      } catch {
        // Ignore malformed headers objects and continue with fallback parsing.
      }
    }
  }

  // Array-like headers (e.g. [["x-header", "value"]])
  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      if (String(entry[0]).toLowerCase() !== normalizedName) continue;
      const normalized = normalizeString(entry[1]);
      if (normalized) return normalized;
    }
    return null;
  }

  // Plain object headers
  const headersRecord = asRecord(headers);
  if (!headersRecord) return null;

  for (const [key, value] of Object.entries(headersRecord)) {
    if (key.toLowerCase() !== normalizedName) continue;

    const direct = normalizeString(value);
    if (direct) return direct;

    if (Array.isArray(value) && value.length > 0) {
      const first = normalizeString(value[0]);
      if (first) return first;
    }
  }

  return null;
}

function parseBearerAccountId(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  if (!authorizationHeader.toLowerCase().startsWith('bearer ')) return null;
  return normalizeString(authorizationHeader.slice(7));
}

function inferAccountIdFromHandlerArgs(handlerArgs: unknown[]): string | null {
  const params = asRecord(handlerArgs[0]);
  if (params) {
    const fromParams =
      normalizeString(params.account_id) ??
      normalizeString(params.entity_id) ??
      normalizeString(params.__dm_entity_id);
    if (fromParams) return fromParams;
  }

  const extra = asRecord(handlerArgs[1]);
  if (!extra) return null;

  const requestInfo = asRecord(extra.requestInfo) ?? extra;
  const requestInfoRequest = asRecord(requestInfo.request);

  const fromHeaders =
    readHeaderValue(requestInfo.headers, 'x-mcp-account-id') ??
    readHeaderValue(requestInfo.headers, 'x-account-id') ??
    readHeaderValue(requestInfoRequest?.headers, 'x-mcp-account-id') ??
    readHeaderValue(requestInfoRequest?.headers, 'x-account-id');
  if (fromHeaders) return fromHeaders;

  const fromAuthorization =
    parseBearerAccountId(readHeaderValue(requestInfo.headers, 'authorization')) ??
    parseBearerAccountId(readHeaderValue(requestInfoRequest?.headers, 'authorization'));
  if (fromAuthorization) return fromAuthorization;

  return null;
}

function extractToolErrorMessage(result: Record<string, unknown>): string | undefined {
  const direct = normalizeString(result.error) ?? normalizeString(result.message);
  if (direct) return direct;

  const structured = asRecord(result.structuredContent);
  const structuredError = normalizeString(structured?.error) ?? normalizeString(structured?.message);
  const structuredNextStep = normalizeString(structured?.next_step);
  if (structuredError) {
    return structuredNextStep ? `${structuredError} (next_step=${structuredNextStep})` : structuredError;
  }

  const content = Array.isArray(result.content) ? result.content : [];
  for (const entry of content) {
    const contentRecord = asRecord(entry);
    const text = normalizeString(contentRecord?.text);
    if (!text) continue;

    if (text.toLowerCase().startsWith('error:')) {
      const trimmed = text.slice(6).trim();
      return trimmed.length > 0 ? trimmed : text;
    }
    return text;
  }

  return undefined;
}

function classifyToolResult(result: unknown): { success: boolean; errorMessage?: string } {
  const record = asRecord(result);
  if (!record || record.isError !== true) {
    return { success: true };
  }

  return {
    success: false,
    errorMessage: extractToolErrorMessage(record),
  };
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
 * @param db            - Optional D1 database with telemetry tables (run migration first)
 * @param serverName    - MCP server name (stored with each record)
 * @param getAccountId  - Optional function to resolve account ID (defaults to 'operator')
 */
export function enableTelemetry(
  server: McpServer,
  db: D1Database | undefined,
  serverName: string,
  getAccountId?: () => string,
  langfuseOptions?: LangfuseTelemetryOptions,
): void {
  const resolveAccount = getAccountId || (() => 'operator');
  const resolvedLangfuseOptions: LangfuseTelemetryOptions = {
    publicKey: langfuseOptions?.publicKey,
    secretKey: langfuseOptions?.secretKey,
    host: langfuseOptions?.host,
    projectName: langfuseOptions?.projectName || serverName,
    environment: langfuseOptions?.environment,
    enabled: langfuseOptions?.enabled,
    awaitFlush: langfuseOptions?.awaitFlush,
  };
  const langfuseEnabled = initLangfuseTelemetry(resolvedLangfuseOptions, serverName);
  const awaitLangfuseFlush = resolvedLangfuseOptions.awaitFlush === true;

  const resolveInvocationAccountId = (handlerArgs: unknown[]): string => {
    let configuredAccountId: string | null = null;
    try {
      configuredAccountId = normalizeString(resolveAccount());
    } catch (error) {
      console.warn('[telemetry] getAccountId threw, using fallback resolution:', error);
    }

    const inferredAccountId = inferAccountIdFromHandlerArgs(handlerArgs);
    if (configuredAccountId && configuredAccountId.toLowerCase() !== 'operator') {
      return configuredAccountId;
    }
    if (inferredAccountId) {
      return inferredAccountId;
    }
    return configuredAccountId ?? 'operator';
  };

  // Proxy server.tool() and server.registerTool() to wrap handlers with metering.
  // Cast through `any` to bypass TypeScript's strict overload checking on .apply().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalToolFn = (server as any).tool;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const originalRegisterToolFn = (server as any).registerTool;

  const wrapRegisteredHandler = (
    toolName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalHandler: any,
  ) => async (...handlerArgs: unknown[]) => {
    const start = Date.now();
    const accountId = resolveInvocationAccountId(handlerArgs);

    try {
      const result = await originalHandler.apply(null, handlerArgs);
      const durationMs = Date.now() - start;
      const classification = classifyToolResult(result);
      const success = classification.success;
      const toolError =
        classification.errorMessage ?? (success ? undefined : `Tool "${toolName}" returned isError=true`);

      if (db) {
        recordInvocation(db, serverName, accountId, toolName, durationMs, success, toolError)
          .catch((e: unknown) => console.warn(`[telemetry] metering failed for ${toolName}:`, e));
      }

      if (langfuseEnabled) {
        const emit = emitLangfuseInvocation({
          serverName,
          toolName,
          accountId,
          input: handlerArgs[0],
          output: result,
          durationMs,
          success,
          error: toolError,
          projectName: resolvedLangfuseOptions.projectName,
          environment: resolvedLangfuseOptions.environment,
        }).catch((e: unknown) => console.warn(`[telemetry] langfuse emit failed for ${toolName}:`, e));
        if (awaitLangfuseFlush) await emit;
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (db) {
        recordInvocation(db, serverName, accountId, toolName, durationMs, false, error)
          .catch((e: unknown) => console.warn(`[telemetry] metering failed for ${toolName}:`, e));
      }

      if (langfuseEnabled) {
        const emit = emitLangfuseInvocation({
          serverName,
          toolName,
          accountId,
          input: handlerArgs[0],
          output: { error: errorMessage },
          durationMs,
          success: false,
          error: errorMessage,
          projectName: resolvedLangfuseOptions.projectName,
          environment: resolvedLangfuseOptions.environment,
        }).catch((e: unknown) => console.warn(`[telemetry] langfuse emit failed for ${toolName}:`, e));
        if (awaitLangfuseFlush) await emit;
      }

      throw error;
    }
  };

  (server as any).tool = function (...args: unknown[]) {
    const lastIdx = args.length - 1;
    const originalHandler = args[lastIdx];

    if (typeof originalHandler !== 'function') {
      return originalToolFn.apply(server, args);
    }

    const toolName = String(args[0] ?? '');

    // Skip metering on the submit_feedback tool (meta-operation)
    if (toolName === 'submit_feedback') {
      return originalToolFn.apply(server, args);
    }

    args[lastIdx] = wrapRegisteredHandler(toolName, originalHandler);
    return originalToolFn.apply(server, args);
  };

  if (typeof originalRegisterToolFn === 'function') {
    (server as any).registerTool = function (...args: unknown[]) {
      const handlerIdx = 2;
      const originalHandler = args[handlerIdx];

      if (typeof originalHandler !== 'function') {
        return originalRegisterToolFn.apply(server, args);
      }

      const toolName = String(args[0] ?? '');
      if (toolName === 'submit_feedback') {
        return originalRegisterToolFn.apply(server, args);
      }

      args[handlerIdx] = wrapRegisteredHandler(toolName, originalHandler);
      return originalRegisterToolFn.apply(server, args);
    };
  }

  // Register telemetry resources when D1 is available.
  if (db) {
    registerTelemetryResources(server, db, serverName, resolveAccount);
  }
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
