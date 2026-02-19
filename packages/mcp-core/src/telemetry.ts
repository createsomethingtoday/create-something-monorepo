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
  correlation_id?: string | null;
  request_id?: string | null;
  metadata_json?: string | null;
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
    correlationId?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface InvocationMetadata {
  correlationId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayRequestEvent {
  correlationId: string;
  requestId: string;
  tenantId: string;
  tenantSlug?: string;
  runtimeKeyPrefix?: string;
  providerSlug: string;
  modelName?: string | null;
  endpoint: string;
  success: boolean;
  statusCode?: number | null;
  latencyMs?: number | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  budgetDecision?: 'allow' | 'warn' | 'block';
  rateLimited?: boolean;
  failoverActivated?: boolean;
  errorMessage?: string | null;
  upstreamRequestId?: string | null;
}

export interface GatewayUsageQuery {
  tenantId?: string;
  providerSlug?: string;
  modelName?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface GatewayUsageRow {
  tenantId: string;
  providerSlug: string;
  modelName: string;
  requests: number;
  successful: number;
  failed: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
}

export interface GatewayUsageResult {
  filters: GatewayUsageQuery;
  rows: GatewayUsageRow[];
}

export interface TenantCostResult {
  tenantId: string;
  from: string | null;
  to: string | null;
  requests: number;
  tokens: number;
  totalCostUsd: number;
}

export interface BudgetBurnResult {
  tenantId: string;
  month: string;
  monthlyBudgetUsd: number;
  currentSpendUsd: number;
  burnPercent: number;
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

function parseOptionalMetadata(input: string | null | undefined): Record<string, unknown> | undefined {
  if (!input) return undefined;
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
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
  invocation?: InvocationMetadata,
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

  const metadataJson = invocation?.metadata ? JSON.stringify(invocation.metadata) : null;

  // Log individual invocation with graceful fallback for pre-correlation schemas.
  try {
    await db
      .prepare(
        `INSERT INTO mcp_tool_invocations (
          server_name,
          account_id,
          tool_name,
          success,
          duration_ms,
          error_message,
          correlation_id,
          request_id,
          metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        serverName,
        accountId,
        toolName,
        success ? 1 : 0,
        durationMs,
        errorMessage,
        invocation?.correlationId ?? null,
        invocation?.requestId ?? null,
        metadataJson,
      )
      .run();
  } catch {
    await db
      .prepare(
        `INSERT INTO mcp_tool_invocations (server_name, account_id, tool_name, success, duration_ms, error_message)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(serverName, accountId, toolName, success ? 1 : 0, durationMs, errorMessage)
      .run();
  }
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
      `SELECT tool_name, account_id, success, duration_ms, error_message, correlation_id, request_id, metadata_json, created_at
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
      correlationId: r.correlation_id ?? null,
      requestId: r.request_id ?? null,
      metadata: parseOptionalMetadata(r.metadata_json),
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
// Gateway telemetry operations
// =============================================================================

function buildGatewayWhereClause(filters: GatewayUsageQuery): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (filters.tenantId) {
    clauses.push('tenant_id = ?');
    params.push(filters.tenantId);
  }
  if (filters.providerSlug) {
    clauses.push('provider_slug = ?');
    params.push(filters.providerSlug);
  }
  if (filters.modelName) {
    clauses.push('model_name = ?');
    params.push(filters.modelName);
  }
  if (filters.from) {
    clauses.push('created_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push('created_at <= ?');
    params.push(filters.to);
  }

  return {
    where: clauses.join(' AND '),
    params,
  };
}

export async function recordGatewayRequest(
  db: D1Database,
  event: GatewayRequestEvent,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO gateway_requests (
         correlation_id,
         request_id,
         tenant_id,
         tenant_slug,
         runtime_key_prefix,
         provider_slug,
         model_name,
         endpoint,
         success,
         status_code,
         latency_ms,
         prompt_tokens,
         completion_tokens,
         total_tokens,
         estimated_cost_usd,
         budget_decision,
         rate_limited,
         failover_activated,
         error_message,
         upstream_request_id,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      event.correlationId,
      event.requestId,
      event.tenantId,
      event.tenantSlug ?? null,
      event.runtimeKeyPrefix ?? null,
      event.providerSlug,
      event.modelName ?? null,
      event.endpoint,
      event.success ? 1 : 0,
      event.statusCode ?? null,
      event.latencyMs ?? null,
      event.promptTokens ?? 0,
      event.completionTokens ?? 0,
      event.totalTokens ?? 0,
      event.estimatedCostUsd ?? 0,
      event.budgetDecision ?? 'allow',
      event.rateLimited ? 1 : 0,
      event.failoverActivated ? 1 : 0,
      event.errorMessage ?? null,
      event.upstreamRequestId ?? null,
    )
    .run();
}

export async function getGatewayUsage(
  db: D1Database,
  filters: GatewayUsageQuery = {},
): Promise<GatewayUsageResult> {
  const { where, params } = buildGatewayWhereClause(filters);
  const limit = Math.max(1, Math.min(filters.limit ?? 100, 500));

  const rows = await db
    .prepare(
      `SELECT
         tenant_id,
         provider_slug,
         COALESCE(model_name, 'unknown') as model_name,
         COUNT(*) as requests,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
         COALESCE(SUM(total_tokens), 0) as total_tokens,
         COALESCE(SUM(estimated_cost_usd), 0) as total_cost_usd,
         COALESCE(AVG(latency_ms), 0) as avg_latency_ms
       FROM gateway_requests
       WHERE ${where}
       GROUP BY tenant_id, provider_slug, model_name
       ORDER BY requests DESC
       LIMIT ?`,
    )
    .bind(...params, limit)
    .all<{
      tenant_id: string;
      provider_slug: string;
      model_name: string;
      requests: number;
      successful: number;
      failed: number;
      total_tokens: number;
      total_cost_usd: number;
      avg_latency_ms: number;
    }>();

  return {
    filters,
    rows: rows.results.map((row) => ({
      tenantId: row.tenant_id,
      providerSlug: row.provider_slug,
      modelName: row.model_name,
      requests: row.requests,
      successful: row.successful,
      failed: row.failed,
      totalTokens: row.total_tokens,
      totalCostUsd: Number(row.total_cost_usd ?? 0),
      avgLatencyMs: Math.round(Number(row.avg_latency_ms ?? 0)),
    })),
  };
}

export async function getTenantCost(
  db: D1Database,
  tenantId: string,
  from?: string,
  to?: string,
): Promise<TenantCostResult> {
  const filters = buildGatewayWhereClause({ tenantId, from, to });

  const row = await db
    .prepare(
      `SELECT
         COUNT(*) as requests,
         COALESCE(SUM(total_tokens), 0) as tokens,
         COALESCE(SUM(estimated_cost_usd), 0) as total_cost_usd
       FROM gateway_requests
       WHERE ${filters.where}`,
    )
    .bind(...filters.params)
    .first<{ requests: number; tokens: number; total_cost_usd: number }>();

  return {
    tenantId,
    from: from ?? null,
    to: to ?? null,
    requests: row?.requests ?? 0,
    tokens: row?.tokens ?? 0,
    totalCostUsd: Number(row?.total_cost_usd ?? 0),
  };
}

export async function getBudgetBurn(
  db: D1Database,
  tenantId: string,
  monthlyBudgetUsd: number,
): Promise<BudgetBurnResult> {
  const month = getCurrentPeriod();

  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(estimated_cost_usd), 0) as spend
       FROM gateway_requests
       WHERE tenant_id = ?
         AND created_at >= date('now', 'start of month')`,
    )
    .bind(tenantId)
    .first<{ spend: number }>();

  const currentSpend = Number(row?.spend ?? 0);
  const burnPercent = monthlyBudgetUsd > 0
    ? Number(((currentSpend / monthlyBudgetUsd) * 100).toFixed(2))
    : 0;

  return {
    tenantId,
    month,
    monthlyBudgetUsd,
    currentSpendUsd: currentSpend,
    burnPercent,
  };
}

// =============================================================================
// enableTelemetry — the integration point
// =============================================================================

function extractInvocationMetadata(handlerArgs: unknown[]): InvocationMetadata | undefined {
  const args = handlerArgs[0];
  if (!args || typeof args !== 'object' || Array.isArray(args)) return undefined;

  const record = args as Record<string, unknown>;
  const correlationId = typeof record.correlation_id === 'string'
    ? record.correlation_id
    : typeof record.correlationId === 'string'
      ? record.correlationId
      : undefined;
  const requestId = typeof record.request_id === 'string'
    ? record.request_id
    : typeof record.requestId === 'string'
      ? record.requestId
      : undefined;

  if (!correlationId && !requestId) return undefined;
  return {
    correlationId,
    requestId,
  };
}

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
      const invocation = extractInvocationMetadata(handlerArgs);
      try {
        const result = await (originalHandler as Function).apply(null, handlerArgs);
        recordInvocation(db, serverName, resolveAccount(), toolName, Date.now() - start, true, undefined, invocation)
          .catch((e: unknown) => console.warn(`[telemetry] metering failed for ${toolName}:`, e));
        return result;
      } catch (error) {
        recordInvocation(db, serverName, resolveAccount(), toolName, Date.now() - start, false, error, invocation)
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
  correlation_id TEXT,
  request_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for health queries
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_server_time
  ON mcp_tool_invocations(server_name, created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_invocations_tool
  ON mcp_tool_invocations(server_name, tool_name);

CREATE INDEX IF NOT EXISTS idx_mcp_invocations_correlation
  ON mcp_tool_invocations(correlation_id, created_at);

-- Gateway telemetry: OpenAI-compatible request tracking
CREATE TABLE IF NOT EXISTS gateway_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  correlation_id TEXT,
  request_id TEXT,
  tenant_id TEXT NOT NULL,
  tenant_slug TEXT,
  runtime_key_prefix TEXT,
  provider_slug TEXT NOT NULL,
  model_name TEXT,
  endpoint TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  status_code INTEGER,
  latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  budget_decision TEXT NOT NULL DEFAULT 'allow',
  rate_limited INTEGER NOT NULL DEFAULT 0,
  failover_activated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  upstream_request_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gateway_requests_tenant_time
  ON gateway_requests(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gateway_requests_correlation
  ON gateway_requests(correlation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gateway_requests_model
  ON gateway_requests(provider_slug, model_name, created_at);
`.trim();
