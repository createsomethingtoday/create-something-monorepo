/**
 * CREATE SOMETHING Telemetry MCP — Chat with your CS-account MCP fleet
 *
 * A meta-MCP for the CREATE SOMETHING Cloudflare account. Same pattern as
 * halfdozen-telemetry-mcp but pointed at the cs-telemetry D1 database.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport
 *   /sse  — SSE fallback transport
 *   /     — Health/info JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { z } from 'zod';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  CONTROL_DB?: D1Database;
  OPERATOR_API_TOKEN?: string;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface TenantScope {
  tenantId: string;
  tenantSlug: string | null;
  keyPrefix: string;
}

const SERVER_NAME = 'cs-telemetry';
const SERVER_VERSION = '1.0.0';

// Known servers on the CREATE SOMETHING Cloudflare account
const FLEET_SERVERS = [
  'schedule-mcp',
  'substrate-mcp',
  'create-something',
  'three-tier-framework',
  'playbook',
  'outerfields-pcn',
];

// =============================================================================
// Helpers
// =============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function resolveTenantFromRuntimeKey(
  controlDb: D1Database | undefined,
  runtimeKey: string,
): Promise<{ tenantId: string; tenantSlug: string | null; keyPrefix: string } | null> {
  if (!controlDb) return null;
  const keyHash = await sha256Hex(runtimeKey);
  const row = await controlDb
    .prepare(
      `SELECT
         rk.tenant_id,
         rk.key_prefix,
         gt.slug AS tenant_slug
       FROM tenant_runtime_keys rk
       INNER JOIN gateway_tenants gt ON gt.id = rk.tenant_id
       WHERE rk.key_hash = ?
         AND rk.revoked_at IS NULL
         AND (rk.expires_at IS NULL OR rk.expires_at > datetime('now'))
         AND gt.status = 'active'
       LIMIT 1`,
    )
    .bind(keyHash)
    .first<{ tenant_id: string; tenant_slug: string | null; key_prefix: string }>();

  if (!row) return null;
  return {
    tenantId: row.tenant_id,
    tenantSlug: row.tenant_slug,
    keyPrefix: row.key_prefix,
  };
}

function withInjectedHeaders(request: Request, headers: Record<string, string>): Request {
  const merged = new Headers(request.headers);
  for (const [key, value] of Object.entries(headers)) {
    merged.set(key, value);
  }
  return new Request(request, { headers: merged });
}

const TENANT_SQL_ALLOWED_TABLES = new Set([
  'gateway_requests',
  'gateway_alerts',
  'gateway_daily_rollups',
  'gateway_monthly_tenant_spend',
  'vw_gateway_adoption',
  'vw_gateway_cost_efficiency',
  'vw_gateway_reliability',
  'vw_gateway_policy_risk',
]);

const TENANT_SQL_BLOCKED_PATTERN = /\b(insert|update|delete|drop|alter|create|replace|pragma|attach|detach|vacuum|reindex|analyze|begin|commit|rollback)\b/i;

function validateTenantSql(query: string): { rewrittenQuery: string; tenantBindCount: number } {
  const trimmed = query.trim();
  if (!trimmed.toLowerCase().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed.');
  }
  if (trimmed.includes(';')) {
    throw new Error('Semicolons are not allowed.');
  }
  if (trimmed.includes('--') || trimmed.includes('/*') || trimmed.includes('*/')) {
    throw new Error('SQL comments are not allowed.');
  }
  if (TENANT_SQL_BLOCKED_PATTERN.test(trimmed)) {
    throw new Error('Query contains blocked SQL keywords.');
  }

  const tableMatches = [...trimmed.matchAll(/\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi)];
  for (const match of tableMatches) {
    const tableName = match[1];
    if (!TENANT_SQL_ALLOWED_TABLES.has(tableName)) {
      throw new Error(`Table or view '${tableName}' is not in tenant SQL allowlist.`);
    }
  }

  const placeholderMatches = [...trimmed.matchAll(/\{\{\s*tenant_id\s*\}\}/gi)];
  const tenantBindCount = placeholderMatches.length;
  if (tenantBindCount === 0) {
    throw new Error("Query must include '{{tenant_id}}' placeholder for tenant isolation.");
  }

  const rewrittenQuery = trimmed.replace(/\{\{\s*tenant_id\s*\}\}/gi, '?');
  return { rewrittenQuery, tenantBindCount };
}

// =============================================================================
// MCP Agent
// =============================================================================

export class CSTelemetryMCP extends McpAgent<Env> {
  private mode: 'operator' | 'client' = 'operator';
  private tenantScope: TenantScope | null = null;

  async fetch(request: Request): Promise<Response> {
    const modeHeader = request.headers.get('x-cs-mcp-mode');
    this.mode = modeHeader === 'client' ? 'client' : 'operator';

    const scopeHeader = request.headers.get('x-cs-tenant-scope');
    if (scopeHeader) {
      try {
        this.tenantScope = JSON.parse(scopeHeader) as TenantScope;
      } catch {
        this.tenantScope = null;
      }
    } else {
      this.tenantScope = null;
    }
    return super.fetch(request);
  }

  private denyOperatorOnly() {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Operator-only endpoint. Use /mcp with operator token.' }) }],
      isError: true,
    };
  }

  private resolveTenantScope(requestedTenantId?: string): { tenantId: string; tenantSlug: string | null } | null {
    if (this.mode !== 'client') return null;
    if (!this.tenantScope) return null;
    if (
      requestedTenantId
      && requestedTenantId !== this.tenantScope.tenantId
      && requestedTenantId !== this.tenantScope.tenantSlug
    ) {
      throw new Error('tenantId does not match client scope');
    }
    return {
      tenantId: this.tenantScope.tenantId,
      tenantSlug: this.tenantScope.tenantSlug,
    };
  }

  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    const db = this.env.DB;

    // ─── Resources ──────────────────────────────────────────────────────

    this.server.resource(
      'fleet-status',
      'fleet://status',
      {
        description: 'Health status overview of all CREATE SOMETHING MCP servers',
        mimeType: 'application/json',
      },
      async () => {
        if (this.mode !== 'operator') {
          return {
            contents: [{
              uri: 'fleet://status',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Operator-only resource' }),
            }],
          };
        }

        const servers: Array<Record<string, unknown>> = [];

        for (const serverName of FLEET_SERVERS) {
          const stats = await db
            .prepare(
              `SELECT
                 COUNT(*) as total,
                 SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
                 AVG(duration_ms) as avg_duration
               FROM mcp_tool_invocations
               WHERE server_name = ? AND created_at > datetime('now', '-24 hours')`,
            )
            .bind(serverName)
            .first<{ total: number; errors: number; avg_duration: number }>();

          const lastActivity = await db
            .prepare(
              `SELECT created_at FROM mcp_tool_invocations
               WHERE server_name = ? ORDER BY created_at DESC LIMIT 1`,
            )
            .bind(serverName)
            .first<{ created_at: string }>();

          const total = stats?.total ?? 0;
          const errors = stats?.errors ?? 0;
          const errorRate = total > 0 ? errors / total : 0;

          let status = 'healthy';
          if (total === 0 && !lastActivity) status = 'no-data';
          else if (errorRate > 0.5) status = 'unhealthy';
          else if (errorRate > 0.1) status = 'degraded';

          servers.push({
            server: serverName,
            status,
            invocations24h: total,
            errors24h: errors,
            errorRate24h: Math.round(errorRate * 1000) / 10 + '%',
            avgDurationMs: Math.round(stats?.avg_duration ?? 0),
            lastActivity: lastActivity?.created_at ? timeAgo(lastActivity.created_at) : 'never',
          });
        }

        return {
          contents: [{
            uri: 'fleet://status',
            mimeType: 'application/json',
            text: JSON.stringify({ fleet: servers, checkedAt: new Date().toISOString() }, null, 2),
          }],
        };
      },
    );

    this.server.resource(
      'gateway-usage',
      'telemetry://gateway/usage',
      {
        description: 'Gateway usage summary (last 24 hours) grouped by tenant/provider/model.',
        mimeType: 'application/json',
      },
      async () => {
        if (this.mode !== 'operator') {
          return {
            contents: [{
              uri: 'telemetry://gateway/usage',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Operator-only resource' }),
            }],
          };
        }

        const rows = await db
          .prepare(
            `SELECT
               tenant_id,
               COALESCE(tenant_slug, tenant_id) AS tenant_slug,
               provider_slug,
               COALESCE(model_name, 'unknown') AS model_name,
               COUNT(*) AS requests,
               SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
               COALESCE(SUM(total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS total_cost_usd,
               ROUND(COALESCE(AVG(latency_ms), 0), 2) AS avg_latency_ms
             FROM gateway_requests
             WHERE created_at > datetime('now', '-24 hours')
             GROUP BY tenant_id, tenant_slug, provider_slug, model_name
             ORDER BY requests DESC
             LIMIT 200`,
          )
          .all<{
            tenant_id: string;
            tenant_slug: string;
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
          contents: [{
            uri: 'telemetry://gateway/usage',
            mimeType: 'application/json',
            text: JSON.stringify({
              window: '24h',
              rows: rows.results,
              generatedAt: new Date().toISOString(),
            }, null, 2),
          }],
        };
      },
    );

    this.server.resource(
      'client-overview',
      'telemetry://client/overview',
      {
        description: 'Tenant-scoped performance overview for client endpoint sessions.',
        mimeType: 'application/json',
      },
      async () => {
        const scoped = this.resolveTenantScope();
        if (!scoped) {
          return {
            contents: [{
              uri: 'telemetry://client/overview',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Client scope unavailable. Use /client/mcp with runtime key.' }),
            }],
          };
        }

        const summary = await db
          .prepare(
            `SELECT
               COUNT(*) AS requests,
               SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
               COALESCE(SUM(total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS total_cost_usd,
               ROUND(COALESCE(AVG(latency_ms), 0), 2) AS avg_latency_ms
             FROM gateway_requests
             WHERE tenant_id = ?
               AND created_at > datetime('now', '-30 days')`,
          )
          .bind(scoped.tenantId)
          .first<{
            requests: number;
            successful: number;
            failed: number;
            total_tokens: number;
            total_cost_usd: number;
            avg_latency_ms: number;
          }>();

        return {
          contents: [{
            uri: 'telemetry://client/overview',
            mimeType: 'application/json',
            text: JSON.stringify({
              tenantId: scoped.tenantId,
              tenantSlug: scoped.tenantSlug,
              window: '30d',
              summary,
              generatedAt: new Date().toISOString(),
            }, null, 2),
          }],
        };
      },
    );

    this.server.resource(
      'decision-scorecards',
      'telemetry://decision/scorecards',
      {
        description: 'Decision scorecards (adoption/cost/reliability/policy risk) for all tenants over 30 days.',
        mimeType: 'application/json',
      },
      async () => {
        const rows = await db
          .prepare(
            `SELECT
               gr.tenant_id,
               COALESCE(MAX(gr.tenant_slug), gr.tenant_id) AS tenant_slug,
               COUNT(*) AS requests,
               SUM(CASE WHEN gr.success = 1 THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN gr.success = 0 THEN 1 ELSE 0 END) AS failed,
               COUNT(DISTINCT COALESCE(gr.model_name, 'unknown')) AS active_models,
               COUNT(DISTINCT gr.provider_slug) AS active_providers,
               ROUND(COALESCE(SUM(gr.estimated_cost_usd), 0), 6) AS total_cost_usd,
               COALESCE(SUM(gr.total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(AVG(gr.latency_ms), 0), 2) AS avg_latency_ms,
               SUM(CASE WHEN gr.rate_limited = 1 THEN 1 ELSE 0 END) AS rate_limited_events,
               SUM(CASE WHEN gr.failover_activated = 1 THEN 1 ELSE 0 END) AS failover_events,
               SUM(CASE WHEN gr.budget_decision = 'warn' THEN 1 ELSE 0 END) AS budget_warn_events,
               SUM(CASE WHEN gr.budget_decision = 'block' THEN 1 ELSE 0 END) AS budget_block_events
             FROM gateway_requests gr
             WHERE gr.created_at > datetime('now', '-30 days')
             GROUP BY gr.tenant_id
             ORDER BY requests DESC`,
          )
          .all<{
            tenant_id: string;
            tenant_slug: string;
            requests: number;
            successful: number;
            failed: number;
            active_models: number;
            active_providers: number;
            total_cost_usd: number;
            total_tokens: number;
            avg_latency_ms: number;
            rate_limited_events: number;
            failover_events: number;
            budget_warn_events: number;
            budget_block_events: number;
          }>();

        const scorecards = rows.results.map((row) => {
          const successRate = row.requests > 0 ? (row.successful / row.requests) * 100 : 0;
          const errorRate = row.requests > 0 ? (row.failed / row.requests) * 100 : 0;
          const costPer1k = row.total_tokens > 0 ? row.total_cost_usd / (row.total_tokens / 1000) : 0;
          return {
            tenantId: row.tenant_id,
            tenantSlug: row.tenant_slug,
            adoption: {
              requests: row.requests,
              activeModels: row.active_models,
              activeProviders: row.active_providers,
            },
            costEfficiency: {
              totalCostUsd: row.total_cost_usd,
              totalTokens: row.total_tokens,
              costPer1kTokensUsd: Number(costPer1k.toFixed(6)),
            },
            reliability: {
              successRatePercent: Number(successRate.toFixed(2)),
              errorRatePercent: Number(errorRate.toFixed(2)),
              avgLatencyMs: row.avg_latency_ms,
              failoverEvents: row.failover_events,
              rateLimitedEvents: row.rate_limited_events,
            },
            policyRisk: {
              budgetWarnEvents: row.budget_warn_events,
              budgetBlockEvents: row.budget_block_events,
            },
          };
        });

        return {
          contents: [{
            uri: 'telemetry://decision/scorecards',
            mimeType: 'application/json',
            text: JSON.stringify({
              window: '30d',
              scorecards,
              generatedAt: new Date().toISOString(),
            }, null, 2),
          }],
        };
      },
    );

    // ─── Tools ──────────────────────────────────────────────────────────

    this.server.tool(
      'query_health',
      'Get health status for one or all CREATE SOMETHING MCP servers.',
      {
        server: z.string().optional().describe('Server name. Omit for all servers.'),
        hours: z.number().optional().describe('Lookback window in hours (default: 24)'),
      },
      async ({ server, hours = 24 }) => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        const targets = server ? [server] : FLEET_SERVERS;
        const results: Array<Record<string, unknown>> = [];

        for (const srv of targets) {
          const stats = await db
            .prepare(
              `SELECT COUNT(*) as total, SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
                 AVG(duration_ms) as avg_duration, MIN(duration_ms) as min_duration, MAX(duration_ms) as max_duration
               FROM mcp_tool_invocations
               WHERE server_name = ? AND created_at > datetime('now', '-' || ? || ' hours')`,
            )
            .bind(srv, hours)
            .first<{ total: number; errors: number; avg_duration: number; min_duration: number; max_duration: number }>();

          const tools = await db
            .prepare(
              `SELECT tool_name, COUNT(*) as invocations, SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
                 AVG(duration_ms) as avg_ms
               FROM mcp_tool_invocations
               WHERE server_name = ? AND created_at > datetime('now', '-' || ? || ' hours')
               GROUP BY tool_name ORDER BY invocations DESC`,
            )
            .bind(srv, hours)
            .all<{ tool_name: string; invocations: number; errors: number; avg_ms: number }>();

          const total = stats?.total ?? 0;
          const errs = stats?.errors ?? 0;
          const errorRate = total > 0 ? errs / total : 0;

          let status = 'healthy';
          if (total === 0) status = 'no-data';
          else if (errorRate > 0.5) status = 'unhealthy';
          else if (errorRate > 0.1) status = 'degraded';

          results.push({
            server: srv,
            status,
            window: `${hours}h`,
            invocations: total,
            errors: errs,
            errorRate: Math.round(errorRate * 1000) / 10 + '%',
            avgDuration: formatDuration(Math.round(stats?.avg_duration ?? 0)),
            tools: tools.results.map((t) => ({
              name: t.tool_name, calls: t.invocations, errors: t.errors, avgMs: Math.round(t.avg_ms ?? 0),
            })),
          });
        }

        return { content: [{ type: 'text', text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] };
      },
    );

    this.server.tool(
      'query_usage',
      'Get aggregate run counts by server and period.',
      {
        server: z.string().optional().describe('Filter by server name.'),
        period: z.string().optional().describe('Period in YYYY-MM format (default: current month)'),
      },
      async ({ server, period }) => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        const currentPeriod = period || (() => {
          const now = new Date();
          return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        })();

        let query = `SELECT server_name, account_id, period_start, runs_this_period FROM mcp_run_counts WHERE period_start = ?`;
        const params: unknown[] = [currentPeriod];
        if (server) { query += ' AND server_name = ?'; params.push(server); }
        query += ' ORDER BY runs_this_period DESC';

        const stmt = db.prepare(query);
        const bound = params.length === 1 ? stmt.bind(params[0]) : stmt.bind(params[0], params[1]);
        const rows = await bound.all<{ server_name: string; account_id: string; period_start: string; runs_this_period: number }>();

        const byServer: Record<string, number> = {};
        for (const row of rows.results) {
          byServer[row.server_name] = (byServer[row.server_name] || 0) + row.runs_this_period;
        }

        return { content: [{ type: 'text', text: JSON.stringify({ period: currentPeriod, totalRuns: Object.values(byServer).reduce((a, b) => a + b, 0), servers: byServer }, null, 2) }] };
      },
    );

    this.server.tool(
      'query_gateway_usage',
      'Query gateway request usage grouped by tenant/provider/model.',
      {
        tenantId: z.string().optional().describe('Filter by tenant id.'),
        provider: z.string().optional().describe('Filter by provider slug.'),
        model: z.string().optional().describe('Filter by model name.'),
        from: z.string().optional().describe('Inclusive lower timestamp bound (ISO).'),
        to: z.string().optional().describe('Inclusive upper timestamp bound (ISO).'),
        limit: z.number().optional().describe('Max grouped rows (default: 100, max: 500).'),
      },
      async ({ tenantId, provider, model, from, to, limit = 100 }) => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        const where: string[] = ['1 = 1'];
        const params: unknown[] = [];
        if (tenantId) { where.push('tenant_id = ?'); params.push(tenantId); }
        if (provider) { where.push('provider_slug = ?'); params.push(provider); }
        if (model) { where.push('model_name = ?'); params.push(model); }
        if (from) { where.push('created_at >= ?'); params.push(from); }
        if (to) { where.push('created_at <= ?'); params.push(to); }

        const rows = await db
          .prepare(
            `SELECT
               tenant_id,
               COALESCE(tenant_slug, tenant_id) AS tenant_slug,
               provider_slug,
               COALESCE(model_name, 'unknown') AS model_name,
               COUNT(*) AS requests,
               SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
               COALESCE(SUM(total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS total_cost_usd,
               ROUND(COALESCE(AVG(latency_ms), 0), 2) AS avg_latency_ms
             FROM gateway_requests
             WHERE ${where.join(' AND ')}
             GROUP BY tenant_id, tenant_slug, provider_slug, model_name
             ORDER BY requests DESC
             LIMIT ?`,
          )
          .bind(...params, Math.max(1, Math.min(limit, 500)))
          .all<{
            tenant_id: string;
            tenant_slug: string;
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
          content: [{
            type: 'text',
            text: JSON.stringify({
              filters: { tenantId, provider, model, from, to, limit: Math.max(1, Math.min(limit, 500)) },
              rows: rows.results,
            }, null, 2),
          }],
        };
      },
    );

    this.server.tool(
      'query_tenant_cost',
      'Get cost and token totals for a tenant over a time window.',
      {
        tenantId: z.string().optional().describe('Tenant id (optional on client endpoint).'),
        from: z.string().optional().describe('Inclusive lower timestamp bound (ISO).'),
        to: z.string().optional().describe('Inclusive upper timestamp bound (ISO).'),
      },
      async ({ tenantId, from, to }) => {
        let scoped: { tenantId: string; tenantSlug: string | null } | null = null;
        try {
          scoped = this.resolveTenantScope(tenantId);
        } catch (error) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }],
            isError: true,
          };
        }
        const effectiveTenantId = scoped?.tenantId ?? tenantId;
        if (!effectiveTenantId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'tenantId is required.' }) }],
            isError: true,
          };
        }

        const where: string[] = ['tenant_id = ?'];
        const params: unknown[] = [effectiveTenantId];
        if (from) { where.push('created_at >= ?'); params.push(from); }
        if (to) { where.push('created_at <= ?'); params.push(to); }

        const summary = await db
          .prepare(
            `SELECT
               COUNT(*) AS requests,
               SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
               COALESCE(SUM(total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS total_cost_usd
             FROM gateway_requests
             WHERE ${where.join(' AND ')}`,
          )
          .bind(...params)
          .first<{
            requests: number;
            successful: number;
            failed: number;
            total_tokens: number;
            total_cost_usd: number;
          }>();

        const byDay = await db
          .prepare(
            `SELECT
               date(created_at) AS day,
               COUNT(*) AS requests,
               COALESCE(SUM(total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS total_cost_usd
             FROM gateway_requests
             WHERE ${where.join(' AND ')}
             GROUP BY day
             ORDER BY day DESC
             LIMIT 90`,
          )
          .bind(...params)
          .all<{ day: string; requests: number; total_tokens: number; total_cost_usd: number }>();

        return {
          content: [{
            type: 'text',
              text: JSON.stringify({
              tenantId: effectiveTenantId,
              tenantSlug: scoped?.tenantSlug ?? null,
              from: from ?? null,
              to: to ?? null,
              summary,
              byDay: byDay.results,
            }, null, 2),
          }],
        };
      },
    );

    this.server.tool(
      'query_budget_burn',
      'Calculate budget burn for a tenant this month.',
      {
        tenantId: z.string().optional().describe('Tenant id (optional on client endpoint).'),
        monthlyBudgetUsd: z.number().describe('Configured monthly budget in USD.'),
      },
      async ({ tenantId, monthlyBudgetUsd }) => {
        let scoped: { tenantId: string; tenantSlug: string | null } | null = null;
        try {
          scoped = this.resolveTenantScope(tenantId);
        } catch (error) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }],
            isError: true,
          };
        }
        const effectiveTenantId = scoped?.tenantId ?? tenantId;
        if (!effectiveTenantId) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'tenantId is required.' }) }],
            isError: true,
          };
        }

        const spendRow = await db
          .prepare(
            `SELECT COALESCE(SUM(estimated_cost_usd), 0) AS spend
             FROM gateway_requests
             WHERE tenant_id = ?
               AND created_at >= datetime('now', 'start of month')`,
          )
          .bind(effectiveTenantId)
          .first<{ spend: number }>();

        const spend = Number(spendRow?.spend ?? 0);
        const burnPercent = monthlyBudgetUsd > 0 ? Number(((spend / monthlyBudgetUsd) * 100).toFixed(2)) : 0;
        const decision = burnPercent >= 100 ? 'block' : burnPercent >= 80 ? 'warn' : 'allow';

        return {
          content: [{
            type: 'text',
              text: JSON.stringify({
              tenantId: effectiveTenantId,
              tenantSlug: scoped?.tenantSlug ?? null,
              period: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`,
              monthlyBudgetUsd,
              currentSpendUsd: spend,
              burnPercent,
              decision,
            }, null, 2),
          }],
        };
      },
    );

    this.server.tool(
      'query_decision_scorecard',
      'Summarize adoption, cost efficiency, reliability, and policy risk for one tenant.',
      {
        tenantId: z.string().optional().describe('Tenant id (optional on client endpoint).'),
        runtimeKey: z.string().optional().describe('Operator mode only: tenant runtime key to auto-scope tenant.'),
        days: z.number().optional().describe('Lookback window in days (default: 30, max: 365).'),
      },
      async ({ tenantId, runtimeKey, days = 30 }) => {
        let resolvedTenantId: string | null = null;
        let resolvedTenantSlug: string | null = null;

        let scoped: { tenantId: string; tenantSlug: string | null } | null = null;
        try {
          scoped = this.resolveTenantScope(tenantId);
        } catch (error) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }],
            isError: true,
          };
        }
        if (scoped) {
          resolvedTenantId = scoped.tenantId;
          resolvedTenantSlug = scoped.tenantSlug;
          if (runtimeKey) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ error: 'runtimeKey is not allowed on client endpoint.' }),
              }],
              isError: true,
            };
          }
        } else {
          resolvedTenantId = tenantId ?? null;
          if (runtimeKey) {
            const resolved = await resolveTenantFromRuntimeKey(this.env.CONTROL_DB, runtimeKey);
            if (!resolved) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ error: 'Invalid runtime key or CONTROL_DB not configured.' }),
                }],
                isError: true,
              };
            }
            resolvedTenantId = resolved.tenantId;
            resolvedTenantSlug = resolved.tenantSlug;
            if (tenantId && tenantId !== resolvedTenantId) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ error: 'tenantId does not match runtimeKey scope.' }),
                }],
                isError: true,
              };
            }
          }
        }

        if (!resolvedTenantId) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: 'Provide tenantId or runtimeKey.' }),
            }],
            isError: true,
          };
        }

        const lookback = Math.max(1, Math.min(days, 365));

        const row = await db
          .prepare(
            `SELECT
               COUNT(*) AS requests,
               SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successful,
               SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed,
               COUNT(DISTINCT provider_slug) AS active_providers,
               COUNT(DISTINCT COALESCE(model_name, 'unknown')) AS active_models,
               COALESCE(SUM(total_tokens), 0) AS total_tokens,
               ROUND(COALESCE(SUM(estimated_cost_usd), 0), 6) AS total_cost_usd,
               ROUND(COALESCE(AVG(latency_ms), 0), 2) AS avg_latency_ms,
               SUM(CASE WHEN rate_limited = 1 THEN 1 ELSE 0 END) AS rate_limited_events,
               SUM(CASE WHEN failover_activated = 1 THEN 1 ELSE 0 END) AS failover_events,
               SUM(CASE WHEN budget_decision = 'warn' THEN 1 ELSE 0 END) AS budget_warn_events,
               SUM(CASE WHEN budget_decision = 'block' THEN 1 ELSE 0 END) AS budget_block_events
             FROM gateway_requests
             WHERE tenant_id = ?
               AND created_at > datetime('now', '-' || ? || ' days')`,
          )
          .bind(resolvedTenantId, lookback)
          .first<{
            requests: number;
            successful: number;
            failed: number;
            active_providers: number;
            active_models: number;
            total_tokens: number;
            total_cost_usd: number;
            avg_latency_ms: number;
            rate_limited_events: number;
            failover_events: number;
            budget_warn_events: number;
            budget_block_events: number;
          }>();

        const alertRow = await db
          .prepare(
            `SELECT
               SUM(CASE WHEN alert_type = 'budget_threshold_crossed' THEN 1 ELSE 0 END) AS budget_alerts,
               SUM(CASE WHEN alert_type = 'error_rate_spike' THEN 1 ELSE 0 END) AS error_spike_alerts,
               SUM(CASE WHEN alert_type = 'provider_failover_activated' THEN 1 ELSE 0 END) AS failover_alerts
             FROM gateway_alerts
             WHERE tenant_id = ?
               AND created_at > datetime('now', '-' || ? || ' days')`,
          )
          .bind(resolvedTenantId, lookback)
          .first<{
            budget_alerts: number;
            error_spike_alerts: number;
            failover_alerts: number;
          }>();

        const requests = Number(row?.requests ?? 0);
        const successful = Number(row?.successful ?? 0);
        const failed = Number(row?.failed ?? 0);
        const totalTokens = Number(row?.total_tokens ?? 0);
        const totalCost = Number(row?.total_cost_usd ?? 0);
        const successRate = requests > 0 ? (successful / requests) * 100 : 0;
        const errorRate = requests > 0 ? (failed / requests) * 100 : 0;
        const costPer1k = totalTokens > 0 ? totalCost / (totalTokens / 1000) : 0;

        const scorecard = {
          tenantId: resolvedTenantId,
          tenantSlug: resolvedTenantSlug,
          window: `${lookback}d`,
          adoption: {
            requests,
            activeProviders: Number(row?.active_providers ?? 0),
            activeModels: Number(row?.active_models ?? 0),
          },
          costEfficiency: {
            totalCostUsd: totalCost,
            totalTokens,
            costPer1kTokensUsd: Number(costPer1k.toFixed(6)),
          },
          reliability: {
            successRatePercent: Number(successRate.toFixed(2)),
            errorRatePercent: Number(errorRate.toFixed(2)),
            avgLatencyMs: Number(row?.avg_latency_ms ?? 0),
            failoverEvents: Number(row?.failover_events ?? 0),
            rateLimitedEvents: Number(row?.rate_limited_events ?? 0),
            errorSpikeAlerts: Number(alertRow?.error_spike_alerts ?? 0),
          },
          policyRisk: {
            budgetWarnEvents: Number(row?.budget_warn_events ?? 0),
            budgetBlockEvents: Number(row?.budget_block_events ?? 0),
            budgetAlerts: Number(alertRow?.budget_alerts ?? 0),
            failoverAlerts: Number(alertRow?.failover_alerts ?? 0),
          },
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(scorecard, null, 2),
          }],
        };
      },
    );

    this.server.tool(
      'query_tenant_sql',
      'Run a tenant-scoped read-only SQL query (runtime-key scoped). Query must include {{tenant_id}} placeholder.',
      {
        runtimeKey: z.string().optional().describe('Operator mode only: runtime key used to resolve hard tenant scope.'),
        query: z.string().describe("Read-only SQL with {{tenant_id}} placeholder."),
        limit: z.number().optional().describe('Max rows returned (default: 200, max: 1000).'),
      },
      async ({ runtimeKey, query, limit = 200 }) => {
        try {
          let resolved: { tenantId: string; tenantSlug: string | null; keyPrefix: string } | null = null;

          const scoped = this.resolveTenantScope();
          if (scoped) {
            resolved = {
              tenantId: scoped.tenantId,
              tenantSlug: scoped.tenantSlug,
              keyPrefix: this.tenantScope?.keyPrefix ?? 'scoped',
            };
            if (runtimeKey) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ error: 'runtimeKey is not allowed on client endpoint.' }),
                }],
                isError: true,
              };
            }
          } else {
            if (!runtimeKey) {
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ error: 'runtimeKey is required on operator endpoint.' }),
                }],
                isError: true,
              };
            }
            resolved = await resolveTenantFromRuntimeKey(this.env.CONTROL_DB, runtimeKey);
          }

          if (!resolved) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({ error: 'Invalid runtime key or CONTROL_DB not configured.' }),
              }],
              isError: true,
            };
          }

          const rowLimit = Math.max(1, Math.min(limit, 1000));
          const { rewrittenQuery, tenantBindCount } = validateTenantSql(query);
          const scopedQuery = `SELECT * FROM (${rewrittenQuery}) AS tenant_scoped_result LIMIT ?`;
          const bindParams = [...Array(tenantBindCount).fill(resolved.tenantId), rowLimit];
          const rows = await db.prepare(scopedQuery).bind(...bindParams).all();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                tenantId: resolved.tenantId,
                tenantSlug: resolved.tenantSlug,
                keyPrefix: resolved.keyPrefix,
                rowCount: rows.results.length,
                limit: rowLimit,
                results: rows.results,
              }, null, 2),
            }],
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            }],
            isError: true,
          };
        }
      },
    );

    this.server.tool(
      'query_activity',
      'Get recent tool invocations. Filter by server, tool, or success/failure.',
      {
        server: z.string().optional(), tool: z.string().optional(),
        correlationId: z.string().optional(),
        success: z.boolean().optional(), limit: z.number().optional().describe('Max results (default: 25)'),
      },
      async ({ server, tool, correlationId, success, limit = 25 }) => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        let query = `SELECT server_name, tool_name, success, duration_ms, error_message, correlation_id, request_id, created_at FROM mcp_tool_invocations WHERE 1=1`;
        const params: unknown[] = [];
        if (server) { query += ' AND server_name = ?'; params.push(server); }
        if (tool) { query += ' AND tool_name = ?'; params.push(tool); }
        if (correlationId) { query += ' AND correlation_id = ?'; params.push(correlationId); }
        if (success !== undefined) { query += ' AND success = ?'; params.push(success ? 1 : 0); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Math.min(limit, 100));

        let stmt = db.prepare(query);
        for (const p of params) { stmt = stmt.bind(p); }
        const rows = await stmt.all<{
          server_name: string;
          tool_name: string;
          success: number;
          duration_ms: number | null;
          error_message: string | null;
          correlation_id: string | null;
          request_id: string | null;
          created_at: string;
        }>();

        return { content: [{ type: 'text', text: JSON.stringify({
          count: rows.results.length,
          invocations: rows.results.map((r) => ({
            server: r.server_name, tool: r.tool_name, success: r.success === 1,
            duration: r.duration_ms ? formatDuration(r.duration_ms) : null,
            error: r.error_message, correlationId: r.correlation_id, requestId: r.request_id,
            when: timeAgo(r.created_at), timestamp: r.created_at,
          })),
        }, null, 2) }] };
      },
    );

    this.server.tool(
      'query_errors',
      'Get recent errors across CS MCPs. Groups by error pattern.',
      { server: z.string().optional(), hours: z.number().optional().describe('Lookback hours (default: 72)') },
      async ({ server, hours = 72 }) => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        let query = `SELECT server_name, tool_name, error_message, created_at FROM mcp_tool_invocations WHERE success = 0 AND created_at > datetime('now', '-' || ? || ' hours')`;
        const params: unknown[] = [hours];
        if (server) { query += ' AND server_name = ?'; params.push(server); }
        query += ' ORDER BY created_at DESC LIMIT 100';

        let stmt = db.prepare(query);
        for (const p of params) { stmt = stmt.bind(p); }
        const rows = await stmt.all<{ server_name: string; tool_name: string; error_message: string | null; created_at: string }>();

        const patterns: Record<string, { count: number; servers: Set<string>; tools: Set<string>; sample: string }> = {};
        for (const r of rows.results) {
          const key = (r.error_message || 'unknown').slice(0, 100);
          if (!patterns[key]) { patterns[key] = { count: 0, servers: new Set(), tools: new Set(), sample: r.error_message || 'unknown' }; }
          patterns[key].count++;
          patterns[key].servers.add(r.server_name);
          patterns[key].tools.add(r.tool_name);
        }

        return { content: [{ type: 'text', text: JSON.stringify({
          window: `${hours}h`, totalErrors: rows.results.length,
          errors: Object.values(patterns).sort((a, b) => b.count - a.count).map((p) => ({
            error: p.sample, occurrences: p.count, servers: [...p.servers], tools: [...p.tools],
          })),
        }, null, 2) }] };
      },
    );

    this.server.tool(
      'run_sql',
      'Run a read-only SQL query against the CS telemetry database.',
      { query: z.string().describe('SQL SELECT query') },
      async ({ query: sqlQuery }) => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        if (!sqlQuery.trim().toLowerCase().startsWith('select')) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Only SELECT queries allowed.' }) }] };
        }
        try {
          const rows = await db.prepare(sqlQuery).all();
          return { content: [{ type: 'text', text: JSON.stringify({ rowCount: rows.results.length, results: rows.results }, null, 2) }] };
        } catch (error) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: String(error) }) }] };
        }
      },
    );

    this.server.tool(
      'describe_tables',
      'Show schema of telemetry tables.',
      {},
      async () => {
        if (this.mode !== 'operator') return this.denyOperatorOnly();
        const tables = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all<{ name: string }>();
        const schemas: Record<string, unknown[]> = {};
        for (const t of tables.results) {
          const info = await db.prepare(`PRAGMA table_info(${t.name})`).all<{ name: string; type: string; pk: number; notnull: number; dflt_value: string | null }>();
          schemas[t.name] = info.results.map((c) => ({ column: c.name, type: c.type, pk: c.pk === 1, nullable: c.notnull === 0, default: c.dflt_value }));
        }
        return { content: [{ type: 'text', text: JSON.stringify(schemas, null, 2) }] };
      },
    );

    // ─── Prompts ────────────────────────────────────────────────────────

    this.server.prompt(
      'health_review',
      'Review health of all CREATE SOMETHING MCPs',
      () => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Review the health of all CREATE SOMETHING MCP servers. Use query_health to get all servers, then:
1. Flag any servers with errors or degraded status
2. Note which tools are most/least used
3. Check for servers with no recent activity
4. Highlight unusually slow tools (avg > 5s)
5. Brief overall assessment`,
          },
        }],
      }),
    );

    this.server.prompt(
      'debug_server',
      'Investigate issues with a specific MCP server',
      { server: z.string().describe('Server name to investigate') },
      ({ server: srv }) => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Investigate ${srv}. Use query_health, query_errors, and query_activity for ${srv}. Is it healthy? What's failing? What should I fix?`,
          },
        }],
      }),
    );

    this.server.prompt(
      'client_performance_review',
      'Review my tenant performance and suggest optimization actions.',
      () => ({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Review my tenant performance. Use telemetry://client/overview, query_decision_scorecard, and query_budget_burn. Provide:
1. current operating status
2. cost and reliability risks
3. top 3 optimization actions for this week`,
          },
        }],
      }),
    );
  }
}

// =============================================================================
// Worker entry point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!env.OPERATOR_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'OPERATOR_API_TOKEN is not configured.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const token = parseBearerToken(request);
      if (!token || token !== env.OPERATOR_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized operator access.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
        });
      }
      const scoped = withInjectedHeaders(request, { 'x-cs-mcp-mode': 'operator' });
      return CSTelemetryMCP.serve('/mcp').fetch(scoped, env, ctx);
    }
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!env.OPERATOR_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'OPERATOR_API_TOKEN is not configured.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const token = parseBearerToken(request);
      if (!token || token !== env.OPERATOR_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized operator access.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
        });
      }
      const scoped = withInjectedHeaders(request, { 'x-cs-mcp-mode': 'operator' });
      return CSTelemetryMCP.serve('/sse').fetch(scoped, env, ctx);
    }
    if (url.pathname === '/client/mcp' || url.pathname.startsWith('/client/mcp/')) {
      const token = parseBearerToken(request);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing Bearer runtime key.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
        });
      }
      const tenant = await resolveTenantFromRuntimeKey(env.CONTROL_DB, token);
      if (!tenant) {
        return new Response(JSON.stringify({ error: 'Invalid runtime key or CONTROL_DB unavailable.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const scoped = withInjectedHeaders(request, {
        'x-cs-mcp-mode': 'client',
        'x-cs-tenant-scope': JSON.stringify(tenant),
      });
      return CSTelemetryMCP.serve('/client/mcp').fetch(scoped, env, ctx);
    }
    if (url.pathname === '/client/sse' || url.pathname.startsWith('/client/sse/')) {
      const token = parseBearerToken(request);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Missing Bearer runtime key.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' },
        });
      }
      const tenant = await resolveTenantFromRuntimeKey(env.CONTROL_DB, token);
      if (!tenant) {
        return new Response(JSON.stringify({ error: 'Invalid runtime key or CONTROL_DB unavailable.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const scoped = withInjectedHeaders(request, {
        'x-cs-mcp-mode': 'client',
        'x-cs-tenant-scope': JSON.stringify(tenant),
      });
      return CSTelemetryMCP.serve('/client/sse').fetch(scoped, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: SERVER_NAME, version: SERVER_VERSION,
        description: 'Chat with the CREATE SOMETHING MCP fleet. Query health, usage, errors across all CS-account servers.',
        fleet: FLEET_SERVERS,
        tools: [
          'query_health',
          'query_usage',
          'query_gateway_usage',
          'query_tenant_cost',
          'query_budget_burn',
          'query_decision_scorecard',
          'query_tenant_sql',
          'query_activity',
          'query_errors',
          'run_sql',
          'describe_tables',
        ],
        resources: ['fleet://status', 'telemetry://gateway/usage', 'telemetry://decision/scorecards', 'telemetry://client/overview'],
        prompts: ['health_review', 'debug_server', 'client_performance_review'],
        endpoints: {
          operator: { mcp: '/mcp', sse: '/sse', auth: 'Bearer OPERATOR_API_TOKEN' },
          client: { mcp: '/client/mcp', sse: '/client/sse', auth: 'Bearer <tenant_runtime_key>' },
        },
      }, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not found', { status: 404 });
  },
};
