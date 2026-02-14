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

// =============================================================================
// MCP Agent
// =============================================================================

export class CSTelemetryMCP extends McpAgent<Env> {
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

    // ─── Tools ──────────────────────────────────────────────────────────

    this.server.tool(
      'query_health',
      'Get health status for one or all CREATE SOMETHING MCP servers.',
      {
        server: z.string().optional().describe('Server name. Omit for all servers.'),
        hours: z.number().optional().describe('Lookback window in hours (default: 24)'),
      },
      async ({ server, hours = 24 }) => {
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
      'query_activity',
      'Get recent tool invocations. Filter by server, tool, or success/failure.',
      {
        server: z.string().optional(), tool: z.string().optional(),
        success: z.boolean().optional(), limit: z.number().optional().describe('Max results (default: 25)'),
      },
      async ({ server, tool, success, limit = 25 }) => {
        let query = `SELECT server_name, tool_name, success, duration_ms, error_message, created_at FROM mcp_tool_invocations WHERE 1=1`;
        const params: unknown[] = [];
        if (server) { query += ' AND server_name = ?'; params.push(server); }
        if (tool) { query += ' AND tool_name = ?'; params.push(tool); }
        if (success !== undefined) { query += ' AND success = ?'; params.push(success ? 1 : 0); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Math.min(limit, 100));

        let stmt = db.prepare(query);
        for (const p of params) { stmt = stmt.bind(p); }
        const rows = await stmt.all<{ server_name: string; tool_name: string; success: number; duration_ms: number | null; error_message: string | null; created_at: string }>();

        return { content: [{ type: 'text', text: JSON.stringify({
          count: rows.results.length,
          invocations: rows.results.map((r) => ({
            server: r.server_name, tool: r.tool_name, success: r.success === 1,
            duration: r.duration_ms ? formatDuration(r.duration_ms) : null,
            error: r.error_message, when: timeAgo(r.created_at), timestamp: r.created_at,
          })),
        }, null, 2) }] };
      },
    );

    this.server.tool(
      'query_errors',
      'Get recent errors across CS MCPs. Groups by error pattern.',
      { server: z.string().optional(), hours: z.number().optional().describe('Lookback hours (default: 72)') },
      async ({ server, hours = 72 }) => {
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
  }
}

// =============================================================================
// Worker entry point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/'))
      return CSTelemetryMCP.serve('/mcp').fetch(request, env, ctx);
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/'))
      return CSTelemetryMCP.serve('/sse').fetch(request, env, ctx);

    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: SERVER_NAME, version: SERVER_VERSION,
        description: 'Chat with the CREATE SOMETHING MCP fleet. Query health, usage, errors across all CS-account servers.',
        fleet: FLEET_SERVERS,
        tools: ['query_health', 'query_usage', 'query_activity', 'query_errors', 'run_sql', 'describe_tables'],
        resources: ['fleet://status'],
        prompts: ['health_review', 'debug_server'],
        endpoints: { mcp: '/mcp', sse: '/sse' },
      }, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not found', { status: 404 });
  },
};
