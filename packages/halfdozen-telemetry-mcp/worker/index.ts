/**
 * Half Dozen Telemetry MCP — Chat with your MCP fleet
 *
 * A meta-MCP: an MCP server about MCP servers. Connects to the shared
 * halfdozen-feedback D1 database where all Half Dozen MCPs write their
 * telemetry (run counts, tool invocations, errors).
 *
 * Instead of a dashboard you stare at, this is a tool you talk to.
 * "How are my MCPs doing?" → it queries the database and tells you.
 *
 * Three-Tier Framework alignment:
 *   Database  (Resources) — fleet://status, fleet://servers
 *   Automation (Tools)    — query_health, query_usage, query_activity, query_errors, run_sql, cleanup
 *   Judgment   (Prompts)  — health_review, activity_report
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport
 *   /sse  — SSE fallback transport
 *   /     — Health/info JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import { z } from 'zod';
import { WORKWAY_FLEET_SERVERS } from '../../../config/mcp-hub/telemetry-fleet.ts';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
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

const SERVER_NAME = 'halfdozen-telemetry';
const SERVER_VERSION = '1.0.0';
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';

function resolveLangfuseProjectName(env: { LANGFUSE_PROJECT_NAME?: string }): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

// Known servers in the fleet
const FLEET_SERVERS = WORKWAY_FLEET_SERVERS;

// =============================================================================
// Helper: format duration
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

function bindStatement(stmt: D1PreparedStatement, params: unknown[]): D1PreparedStatement {
  if (params.length === 0) return stmt;
  return stmt.bind(...params);
}

// =============================================================================
// MCP Agent
// =============================================================================

export class TelemetryMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  async init() {
    const db = this.env.DB;
    enableTelemetry(this.server, db, SERVER_NAME, undefined, {
      publicKey: (this.env as any).LANGFUSE_PUBLIC_KEY,
        secretKey: (this.env as any).LANGFUSE_SECRET_KEY,
      projectName: resolveLangfuseProjectName(this.env),
    });

    // ─── Resources (Database tier) ──────────────────────────────────────

    // Fleet status — overview of all MCPs
    this.server.resource(
      'fleet-status',
      'fleet://status',
      {
        description: 'Health status overview of all Half Dozen MCP servers',
        mimeType: 'application/json'
      },
      async () => {
        const servers: Array<Record<string, unknown>> = [];

        for (const serverName of FLEET_SERVERS) {
          // 24h stats
          const stats = await db
            .prepare(
              `SELECT
                 COUNT(*) as total,
                 SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
                 AVG(duration_ms) as avg_duration
               FROM mcp_tool_invocations
               WHERE server_name = ? AND created_at > datetime('now', '-24 hours')`
            )
            .bind(serverName)
            .first<{ total: number; errors: number; avg_duration: number }>();

          const lastActivity = await db
            .prepare(
              `SELECT created_at FROM mcp_tool_invocations
               WHERE server_name = ? ORDER BY created_at DESC LIMIT 1`
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
            lastActivity: lastActivity?.created_at ? timeAgo(lastActivity.created_at) : 'never'
          });
        }

        return {
          contents: [
            {
              uri: 'fleet://status',
              mimeType: 'application/json',
              text: JSON.stringify({ fleet: servers, checkedAt: new Date().toISOString() }, null, 2)
            }
          ]
        };
      }
    );

    // ─── Tools (Automation tier) ────────────────────────────────────────

    // Tool: Query health for a specific server or all servers
    this.server.tool(
      'query_health',
      'Get health status for one or all MCP servers. Shows 24h stats: invocations, errors, error rate, tool breakdown, avg response time.',
      {
        server: z
          .string()
          .optional()
          .describe('Server name (e.g., "halfdozen-gmail-sync"). Omit for all servers.'),
        hours: z.number().optional().describe('Lookback window in hours (default: 24)')
      },
      async ({ server, hours = 24 }) => {
        const targets = server ? [server] : FLEET_SERVERS;
        const results: Array<Record<string, unknown>> = [];

        for (const srv of targets) {
          // Aggregate stats
          const stats = await db
            .prepare(
              `SELECT
                 COUNT(*) as total,
                 SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
                 AVG(duration_ms) as avg_duration,
                 MIN(duration_ms) as min_duration,
                 MAX(duration_ms) as max_duration
               FROM mcp_tool_invocations
               WHERE server_name = ? AND created_at > datetime('now', '-' || ? || ' hours')`
            )
            .bind(srv, hours)
            .first<{
              total: number;
              errors: number;
              avg_duration: number;
              min_duration: number;
              max_duration: number;
            }>();

          // Per-tool breakdown
          const tools = await db
            .prepare(
              `SELECT
                 tool_name,
                 COUNT(*) as invocations,
                 SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
                 AVG(duration_ms) as avg_ms
               FROM mcp_tool_invocations
               WHERE server_name = ? AND created_at > datetime('now', '-' || ? || ' hours')
               GROUP BY tool_name
               ORDER BY invocations DESC`
            )
            .bind(srv, hours)
            .all<{ tool_name: string; invocations: number; errors: number; avg_ms: number }>();

          const lastActivity = await db
            .prepare(
              `SELECT created_at FROM mcp_tool_invocations
               WHERE server_name = ? ORDER BY created_at DESC LIMIT 1`
            )
            .bind(srv)
            .first<{ created_at: string }>();

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
            minDuration: formatDuration(stats?.min_duration ?? 0),
            maxDuration: formatDuration(stats?.max_duration ?? 0),
            lastActivity: lastActivity?.created_at ?? 'never',
            tools: tools.results.map((t) => ({
              name: t.tool_name,
              calls: t.invocations,
              errors: t.errors,
              avgMs: Math.round(t.avg_ms ?? 0)
            }))
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2)
            }
          ]
        };
      }
    );

    // Tool: Query usage / run counts
    this.server.tool(
      'query_usage',
      'Get aggregate run counts by server and period. Shows how many tool calls each MCP has handled.',
      {
        server: z.string().optional().describe('Filter by server name. Omit for all.'),
        period: z.string().optional().describe('Period in YYYY-MM format (default: current month)')
      },
      async ({ server, period }) => {
        const currentPeriod =
          period ||
          (() => {
            const now = new Date();
            return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
          })();

        let query = `SELECT server_name, account_id, period_start, runs_this_period, updated_at
                      FROM mcp_run_counts WHERE period_start = ?`;
        const params: unknown[] = [currentPeriod];

        if (server) {
          query += ' AND server_name = ?';
          params.push(server);
        }

        query += ' ORDER BY runs_this_period DESC';

        const stmt = db.prepare(query);
        const bound = params.length === 1 ? stmt.bind(params[0]) : stmt.bind(params[0], params[1]);
        const rows = await bound.all<{
          server_name: string;
          account_id: string;
          period_start: string;
          runs_this_period: number;
          updated_at: string;
        }>();

        // Aggregate by server
        const byServer: Record<
          string,
          { total: number; accounts: Array<{ id: string; runs: number }> }
        > = {};
        for (const row of rows.results) {
          if (!byServer[row.server_name]) {
            byServer[row.server_name] = { total: 0, accounts: [] };
          }
          byServer[row.server_name].total += row.runs_this_period;
          byServer[row.server_name].accounts.push({
            id: row.account_id,
            runs: row.runs_this_period
          });
        }

        const totalRuns = Object.values(byServer).reduce((sum, s) => sum + s.total, 0);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  period: currentPeriod,
                  totalRuns,
                  servers: byServer
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    // Tool: Query recent activity
    this.server.tool(
      'query_activity',
      'Get recent tool invocations across MCPs. Filter by server, tool, or success/failure.',
      {
        server: z.string().optional().describe('Filter by server name'),
        tool: z.string().optional().describe('Filter by tool name'),
        success: z.boolean().optional().describe('Filter by success (true) or failure (false)'),
        limit: z.number().optional().describe('Number of results (default: 25, max: 100)')
      },
      async ({ server, tool, success, limit = 25 }) => {
        const maxLimit = Math.min(limit, 100);
        let query = `SELECT server_name, account_id, tool_name, success, duration_ms, error_message, created_at
                      FROM mcp_tool_invocations WHERE 1=1`;
        const params: unknown[] = [];

        if (server) {
          query += ' AND server_name = ?';
          params.push(server);
        }
        if (tool) {
          query += ' AND tool_name = ?';
          params.push(tool);
        }
        if (success !== undefined) {
          query += ' AND success = ?';
          params.push(success ? 1 : 0);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(maxLimit);

        const stmt = bindStatement(db.prepare(query), params);

        const rows = await stmt.all<{
          server_name: string;
          account_id: string;
          tool_name: string;
          success: number;
          duration_ms: number | null;
          error_message: string | null;
          created_at: string;
        }>();

        const invocations = rows.results.map((r) => ({
          server: r.server_name,
          tool: r.tool_name,
          success: r.success === 1,
          duration: r.duration_ms ? formatDuration(r.duration_ms) : null,
          error: r.error_message,
          when: timeAgo(r.created_at),
          timestamp: r.created_at
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: invocations.length,
                  invocations
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    // Tool: Query errors specifically
    this.server.tool(
      'query_errors',
      'Get recent errors across all MCPs. Shows which tools are failing, error messages, and timing.',
      {
        server: z.string().optional().describe('Filter by server name'),
        hours: z.number().optional().describe('Lookback window in hours (default: 72)'),
        limit: z.number().optional().describe('Max results (default: 50)')
      },
      async ({ server, hours = 72, limit = 50 }) => {
        let query = `SELECT server_name, tool_name, error_message, duration_ms, created_at
                      FROM mcp_tool_invocations
                      WHERE success = 0 AND created_at > datetime('now', '-' || ? || ' hours')`;
        const params: unknown[] = [hours];

        if (server) {
          query += ' AND server_name = ?';
          params.push(server);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const stmt = bindStatement(db.prepare(query), params);

        const rows = await stmt.all<{
          server_name: string;
          tool_name: string;
          error_message: string | null;
          duration_ms: number | null;
          created_at: string;
        }>();

        // Group by error pattern
        const patterns: Record<
          string,
          {
            count: number;
            servers: Set<string>;
            tools: Set<string>;
            latest: string;
            sample: string;
          }
        > = {};
        for (const r of rows.results) {
          const key = (r.error_message || 'unknown').slice(0, 100);
          if (!patterns[key]) {
            patterns[key] = {
              count: 0,
              servers: new Set(),
              tools: new Set(),
              latest: r.created_at,
              sample: r.error_message || 'unknown'
            };
          }
          patterns[key].count++;
          patterns[key].servers.add(r.server_name);
          patterns[key].tools.add(r.tool_name);
        }

        const grouped = Object.values(patterns)
          .sort((a, b) => b.count - a.count)
          .map((p) => ({
            error: p.sample,
            occurrences: p.count,
            servers: [...p.servers],
            tools: [...p.tools],
            latest: timeAgo(p.latest)
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  window: `${hours}h`,
                  totalErrors: rows.results.length,
                  uniquePatterns: grouped.length,
                  errors: grouped
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    // Tool: Query trends — compare periods
    this.server.tool(
      'query_trends',
      'Compare usage trends across time periods. Shows whether MCPs are being used more or less.',
      {
        server: z.string().optional().describe('Filter by server name'),
        periods: z.number().optional().describe('Number of months to compare (default: 3)')
      },
      async ({ server, periods = 3 }) => {
        let query = `SELECT server_name, period_start, SUM(runs_this_period) as total_runs
                      FROM mcp_run_counts`;
        const params: unknown[] = [];

        if (server) {
          query += ' WHERE server_name = ?';
          params.push(server);
        }

        query += ' GROUP BY server_name, period_start ORDER BY period_start DESC';

        const stmt = bindStatement(db.prepare(query), params);

        const rows = await stmt.all<{
          server_name: string;
          period_start: string;
          total_runs: number;
        }>();

        // Organize by server, then by period
        const byServer: Record<string, Array<{ period: string; runs: number }>> = {};
        for (const r of rows.results) {
          if (!byServer[r.server_name]) byServer[r.server_name] = [];
          byServer[r.server_name].push({ period: r.period_start, runs: r.total_runs });
        }

        // Limit to requested periods
        for (const srv of Object.keys(byServer)) {
          byServer[srv] = byServer[srv].slice(0, periods);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  periodsCompared: periods,
                  trends: byServer
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    // Tool: Run arbitrary SQL (read-only)
    this.server.tool(
      'run_sql',
      'Run a read-only SQL query against the telemetry database. Tables: mcp_run_counts, mcp_tool_invocations, feedback. Use for custom analysis.',
      {
        query: z.string().describe('SQL SELECT query to execute')
      },
      async ({ query: sqlQuery }) => {
        // Safety: only allow SELECT
        const trimmed = sqlQuery.trim().toLowerCase();
        if (!trimmed.startsWith('select')) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Only SELECT queries are allowed. This is a read-only interface.'
                })
              }
            ]
          };
        }

        try {
          const rows = await db.prepare(sqlQuery).all();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    rowCount: rows.results.length,
                    results: rows.results
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: String(error) })
              }
            ]
          };
        }
      }
    );

    // Tool: Cleanup old invocations
    this.server.tool(
      'cleanup',
      'Delete old tool invocation records to keep the database lean. Run counts are preserved.',
      {
        days: z.number().optional().describe('Keep invocations from the last N days (default: 30)'),
        dry_run: z.boolean().optional().describe('Preview what would be deleted without deleting')
      },
      async ({ days = 30, dry_run = true }) => {
        const countResult = await db
          .prepare(
            `SELECT COUNT(*) as count FROM mcp_tool_invocations
             WHERE created_at < datetime('now', '-' || ? || ' days')`
          )
          .bind(days)
          .first<{ count: number }>();

        const toDelete = countResult?.count ?? 0;

        if (dry_run) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    dryRun: true,
                    wouldDelete: toDelete,
                    keepingDays: days,
                    message:
                      toDelete > 0
                        ? `Would delete ${toDelete} invocation records older than ${days} days. Run with dry_run=false to execute.`
                        : `No records older than ${days} days found.`
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        await db
          .prepare(
            `DELETE FROM mcp_tool_invocations
             WHERE created_at < datetime('now', '-' || ? || ' days')`
          )
          .bind(days)
          .run();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  deleted: toDelete,
                  keepingDays: days,
                  message: `Deleted ${toDelete} invocation records older than ${days} days. Run counts preserved.`
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    // Tool: List database schema
    this.server.tool(
      'describe_tables',
      'Show the schema of telemetry tables. Useful when you want to write custom SQL queries.',
      {},
      async () => {
        const tables = await db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
          .all<{ name: string }>();

        const schemas: Record<string, unknown[]> = {};
        for (const t of tables.results) {
          const info = await db.prepare(`PRAGMA table_info(${t.name})`).all<{
            cid: number;
            name: string;
            type: string;
            notnull: number;
            dflt_value: string | null;
            pk: number;
          }>();
          schemas[t.name] = info.results.map((c) => ({
            column: c.name,
            type: c.type,
            primaryKey: c.pk === 1,
            nullable: c.notnull === 0,
            default: c.dflt_value
          }));
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schemas, null, 2)
            }
          ]
        };
      }
    );

    // ─── Prompts (Judgment tier) ────────────────────────────────────────

    this.server.prompt(
      'health_review',
      'Review the health of all Half Dozen MCPs and flag any issues',
      () => ({
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Review the health of all Half Dozen MCP servers. Use query_health with no server filter to get all servers, then:

1. Flag any servers with errors or degraded status
2. Note which tools are being used most and least
3. Check for any servers with no recent activity (might be down)
4. Highlight any unusually slow tools (avg > 5s)
5. Give a brief overall assessment

Be concise — this is a health check, not a novel.`
            }
          }
        ]
      })
    );

    this.server.prompt(
      'activity_report',
      'Generate a summary report of MCP activity for this period',
      () => ({
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Generate an activity report for the Half Dozen MCP fleet. Use query_usage to get this month's numbers, then query_health for the last 24h detail. Include:

1. Total tool calls this month across all MCPs
2. Which MCPs are getting the most use
3. Which specific tools are most popular
4. Any errors or reliability issues
5. Month-over-month trend if data is available (use query_trends)

Format it as a clean summary I could share with the team.`
            }
          }
        ]
      })
    );

    this.server.prompt(
      'debug_server',
      'Investigate issues with a specific MCP server',
      {
        server: z.string().describe('Name of the MCP server to investigate')
      },
      ({ server: srv }) => ({
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Investigate the ${srv} MCP server. Something might be wrong. Use these tools in order:

1. query_health for ${srv} — get the overview
2. query_errors filtered to ${srv} — what's failing?
3. query_activity filtered to ${srv} — recent calls, any patterns?

Then tell me:
- Is this server healthy?
- If not, what's the likely cause?
- What should I check or fix?`
            }
          }
        ]
      })
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
      return TelemetryMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return TelemetryMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            version: SERVER_VERSION,
            description:
              'Chat with your MCP fleet. Query health, usage, errors, and trends across all Half Dozen MCP servers.',
            fleet: FLEET_SERVERS,
            tools: [
              'query_health',
              'query_usage',
              'query_activity',
              'query_errors',
              'query_trends',
              'run_sql',
              'cleanup',
              'describe_tables'
            ],
            resources: ['fleet://status'],
            prompts: ['health_review', 'activity_report', 'debug_server'],
            endpoints: { mcp: '/mcp', sse: '/sse' }
          },
          null,
          2
        ),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }
};
