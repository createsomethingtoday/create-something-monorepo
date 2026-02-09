/**
 * Substrate MCP Server — Cloudflare Worker (remote deployment)
 *
 * The agent-native data layer, deployed with a public URL.
 * D1 for structured data, R2 for files, McpAgent for dual transport.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport (Claude Code, Codex)
 *   /sse  — SSE fallback transport (OpenAI, ChatGPT, Cursor)
 *   /     — Health/info JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { bindingExecutor, bindingR2Store } from '../src/services/executor.js';
import { ensureInitialized } from '../src/services/d1.js';
import { registerTools } from '../src/tools/index.js';
import { registerResources } from '../src/resources/index.js';
import { registerPrompts } from '../src/prompts/index.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  READER_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  FILES: R2Bucket;
}

// =============================================================================
// MCP Agent — Durable Object with all three primitives
// =============================================================================

export class SubstrateMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'substrate-mcp',
    version: '0.1.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0ibTEyLjgzIDIuMThhMiAyIDAgMCAwLTEuNjYgMEwyLjYgNi4wOGExIDEgMCAwIDAgMCAxLjgzbDguNTggMy45MWEyIDIgMCAwIDAgMS42NiAwbDguNTgtMy45YTEgMSAwIDAgMCAwLTEuODRaIi8+PHBhdGggZD0ibTIyIDE3LjY1LTkuMTcgNC4xNmEyIDIgMCAwIDEtMS42NiAwTDIgMTcuNjUiLz48cGF0aCBkPSJtMjIgMTIuNjUtOS4xNyA0LjE2YTIgMiAwIDAgMS0xLjY2IDBMMiAxMi42NSIvPjwvZz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  async init() {
    // D1 via binding — no REST API overhead
    const d1 = bindingExecutor(this.env.DB);
    // R2 via binding — no S3 signing overhead
    const r2 = bindingR2Store(this.env.FILES);

    // One-time schema init (runs once per DO lifecycle, not per tool call)
    await ensureInitialized(d1);

    // Register all three tiers with binding-backed accessors
    registerTools(this.server, () => d1, () => r2, () => 'agent');
    registerResources(this.server, () => d1);
    registerPrompts(this.server, () => d1);
  }
}

// =============================================================================
// Reader MCP — restricted Durable Object (read + upvote only)
// =============================================================================

export class ReaderMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'substrate-reader',
    version: '0.1.0',
  });

  async init() {
    const d1 = bindingExecutor(this.env.DB);
    await ensureInitialized(d1);
    const { z } = await import('zod');

    // ─── Read-only tools (4 tools) ─────────────────────────────────

    this.server.tool('find_records',
      'Query or search by workspace + table name.',
      {
        workspace_name: z.string().min(1),
        table_name: z.string().min(1),
        filters: z.array(z.object({ column: z.string(), operator: z.string(), value: z.unknown() })).optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
      },
      async (params: Record<string, unknown>) => {
        const { getWorkspaceByName, getTableByName, listTables, searchRecords, queryRecords } = await import('../src/services/d1.js');
        const wsName = params.workspace_name as string;
        const tblName = params.table_name as string;
        const ws = await getWorkspaceByName(d1, wsName);
        if (!ws) return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `Workspace '${wsName}' not found` }) }] };
        const tbl = await getTableByName(d1, ws.id, tblName);
        if (!tbl) {
          const tables = await listTables(d1, ws.id);
          return { content: [{ type: 'text' as const, text: JSON.stringify({ error: `Table '${tblName}' not found. Available: ${tables.map((t: any) => t.name).join(', ')}` }) }] };
        }
        if (params.search) {
          const recs = await searchRecords(d1, tbl.id, params.search as string, (params.limit as number) ?? 25);
          return { content: [{ type: 'text' as const, text: JSON.stringify({ table: tbl.name, records: recs, count: recs.length }) }] };
        }
        const result = await queryRecords(d1, {
          table_id: tbl.id,
          filters: params.filters as any,
          limit: params.limit as number,
          offset: 0,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      },
    );

    this.server.tool('list_workspaces',
      'List all workspaces with tables and schemas.',
      {},
      async () => {
        const { listWorkspaces, listTables } = await import('../src/services/d1.js');
        const workspaces = await listWorkspaces(d1);
        const result = [];
        for (const ws of workspaces) {
          const tables = await listTables(d1, ws.id);
          result.push({ ...ws, tables: tables.map((t: any) => ({ id: t.id, name: t.name, description: t.description, columns: t.columns })) });
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify({ workspaces: result }) }] };
      },
    );

    this.server.tool('get_record',
      'Get record by ID with relations.',
      { record_id: z.string().min(1) },
      async (params: Record<string, unknown>) => {
        const { getRecord, getRelationsForRecord } = await import('../src/services/d1.js');
        const rec = await getRecord(d1, params.record_id as string);
        if (!rec) return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Record not found' }) }] };
        const relations = await getRelationsForRecord(d1, params.record_id as string);
        return { content: [{ type: 'text' as const, text: JSON.stringify({ record: rec, relations }) }] };
      },
    );

    // ─── Upvote tool (the one write action readers get) ────────────

    this.server.tool('upvote_content',
      'Upvote a content piece. Adds your vote to the record.',
      {
        record_id: z.string().min(1),
        voter: z.string().min(1).describe('Your name or identifier'),
      },
      async (params: Record<string, unknown>) => {
        const { getRecord } = await import('../src/services/d1.js');
        const rid = params.record_id as string;
        const voter = params.voter as string;

        const rec = await getRecord(d1, rid);
        if (!rec) return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Record not found' }) }], isError: true as const };

        const data = rec.data as Record<string, unknown>;
        const upvotes = Array.isArray(data.upvotes) ? data.upvotes as string[] : [];

        if (upvotes.includes(voter)) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ already_voted: true, upvotes: upvotes.length, voters: upvotes }) }] };
        }

        upvotes.push(voter);
        data.upvotes = upvotes;

        // Direct D1 update
        await this.env.DB.prepare("UPDATE records SET data=?, updated_at=datetime('now') WHERE id=?")
          .bind(JSON.stringify(data), rid)
          .run();

        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, upvotes: upvotes.length, voters: upvotes, title: data.title }) }] };
      },
    );
  }
}

// =============================================================================
// Dashboard — read-only human view (the trust layer)
// =============================================================================

async function renderDashboard(env: Env): Promise<Response> {
  const db = env.DB;

  // Fetch workspaces
  const workspaces = await db.prepare('SELECT * FROM workspaces ORDER BY name').all();

  // Fetch all tables with columns
  const tables = await db.prepare('SELECT * FROM table_definitions ORDER BY workspace_id, name').all();

  // Fetch all records ordered by most recently updated
  const records = await db.prepare('SELECT r.*, t.name as table_name, t.workspace_id FROM records r JOIN table_definitions t ON r.table_id = t.id ORDER BY r.updated_at DESC LIMIT 100').all();

  // Fetch stats
  const recordCount = await db.prepare('SELECT COUNT(*) as cnt FROM records').first<{ cnt: number }>();
  const fileCount = await db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes),0) as sz FROM file_metadata').first<{ cnt: number; sz: number }>();
  const auditCount = await db.prepare("SELECT COUNT(*) as cnt FROM audit_log WHERE timestamp > datetime('now','-1 day')").first<{ cnt: number }>();

  // Build status color map
  const statusColors: Record<string, string> = {
    draft: '#6b7280', claimed: '#f59e0b', in_progress: '#3b82f6',
    in_review: '#8b5cf6', scheduled: '#10b981', published: '#059669', archived: '#9ca3af',
  };

  // Group records by table
  const byTable: Record<string, Array<{ data: Record<string, unknown>; id: string; updated_at: string }>> = {};
  for (const r of records.results) {
    const rec = r as { table_name: string; data: string; id: string; updated_at: string };
    if (!byTable[rec.table_name]) byTable[rec.table_name] = [];
    byTable[rec.table_name].push({
      data: JSON.parse(rec.data),
      id: rec.id,
      updated_at: rec.updated_at,
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Substrate — Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 2rem; max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.5rem; font-weight: 500; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
  .subtitle { color: #737373; font-size: 0.875rem; margin-bottom: 2rem; }
  .stats { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
  .stat { background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 1rem 1.25rem; min-width: 140px; }
  .stat-value { font-size: 1.5rem; font-weight: 600; color: #fafafa; }
  .stat-label { font-size: 0.75rem; color: #737373; margin-top: 0.25rem; }
  .section { margin-bottom: 2rem; }
  .section-title { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; margin-bottom: 0.75rem; }
  .card { background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 0.5rem; }
  .card-title { font-weight: 500; margin-bottom: 0.5rem; }
  .card-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .tag { display: inline-block; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.6875rem; background: #262626; color: #a3a3a3; margin-right: 0.25rem; }
  .meta-item { font-size: 0.8125rem; color: #a3a3a3; }
  .agent-label { font-size: 0.75rem; color: #f59e0b; }
  .upvote { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #f472b6; background: #f472b620; padding: 0.125rem 0.5rem; border-radius: 9999px; }
  .upvote-voters { font-size: 0.6875rem; color: #a3a3a3; margin-left: 0.25rem; }
  .body-preview { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #262626; font-size: 0.8125rem; color: #a3a3a3; line-height: 1.5; max-height: 4.5em; overflow: hidden; }
  .empty { color: #525252; font-style: italic; padding: 1rem 0; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #262626; color: #525252; font-size: 0.75rem; }
  .endpoints { display: flex; gap: 1rem; margin-top: 0.5rem; }
  .endpoint { background: #171717; border: 1px solid #262626; border-radius: 4px; padding: 0.25rem 0.5rem; font-family: monospace; font-size: 0.75rem; }
</style>
</head>
<body>
<h1>Substrate</h1>
<p class="subtitle">Agent-native data layer — read-only dashboard. Agents manage the data; this view builds trust.</p>

<div class="stats">
  <div class="stat"><div class="stat-value">${workspaces.results.length}</div><div class="stat-label">Workspaces</div></div>
  <div class="stat"><div class="stat-value">${tables.results.length}</div><div class="stat-label">Tables</div></div>
  <div class="stat"><div class="stat-value">${recordCount?.cnt ?? 0}</div><div class="stat-label">Records</div></div>
  <div class="stat"><div class="stat-value">${fileCount?.cnt ?? 0}</div><div class="stat-label">Files</div></div>
  <div class="stat"><div class="stat-value">${auditCount?.cnt ?? 0}</div><div class="stat-label">Changes (24h)</div></div>
</div>

${Object.entries(byTable).map(([tableName, recs]) => `
<div class="section">
  <div class="section-title">${esc(tableName)} (${recs.length})</div>
  ${recs.map(r => {
    const d = r.data as Record<string, unknown>;
    const status = String(d.status || '');
    const color = statusColors[status] || '#6b7280';
    const title = String(d.title || d.name || r.id);
    const property = d.property ? String(d.property) : '';
    const date = d.publish_date ? String(d.publish_date) : '';
    const agent = d.assigned_agent ? String(d.assigned_agent) : '';
    const tags = Array.isArray(d.tags) ? d.tags as string[] : [];
    const body = d.body ? String(d.body).slice(0, 200) : '';
    const upvotes = Array.isArray(d.upvotes) ? d.upvotes as string[] : [];
    return `<div class="card">
      <div class="card-title">${esc(title)}</div>
      <div class="card-meta">
        ${status ? `<span class="badge" style="background:${color}20;color:${color}">${esc(status)}</span>` : ''}
        ${property ? `<span class="meta-item">${esc(property)}</span>` : ''}
        ${date ? `<span class="meta-item">${esc(date)}</span>` : ''}
        ${agent ? `<span class="agent-label">${esc(agent)}</span>` : ''}
        ${upvotes.length ? `<span class="upvote">\u25B2 ${upvotes.length}<span class="upvote-voters">${upvotes.map(v => esc(v)).join(', ')}</span></span>` : ''}
      </div>
      ${tags.length ? `<div style="margin-top:0.5rem">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${body ? `<div class="body-preview">${esc(body)}...</div>` : ''}
    </div>`;
  }).join('')}
</div>
`).join('')}

${Object.keys(byTable).length === 0 ? '<p class="empty">No records yet. Connect an agent and start creating.</p>' : ''}

<div class="footer">
  <div>Substrate v0.1.0 — the UI is optional, the data is real.</div>
  <div class="endpoints">
    <span class="endpoint">/mcp</span> Streamable HTTP
    <span class="endpoint">/sse</span> SSE
    <span class="endpoint">/dashboard</span> This view
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Streamable HTTP transport (Claude Code, Codex)
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return SubstrateMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE fallback transport (OpenAI, ChatGPT, Cursor)
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return SubstrateMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Reader — restricted access (read + upvote only)
    if (url.pathname === '/reader/mcp' || url.pathname.startsWith('/reader/mcp/')) {
      return ReaderMCP.serve('/reader/mcp').fetch(request, env, ctx);
    }
    if (url.pathname === '/reader/sse' || url.pathname.startsWith('/reader/sse/')) {
      return ReaderMCP.serve('/reader/sse').fetch(request, env, ctx);
    }
    if (url.pathname === '/reader') {
      return new Response(JSON.stringify({
        name: 'substrate-reader',
        version: '0.1.0',
        description: 'Read-only access to Substrate with upvote capability. 4 tools: find_records, list_workspaces, get_record, upvote_content.',
        endpoints: {
          mcp: '/reader/mcp',
          sse: '/reader/sse',
        },
      }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Dashboard — read-only human view of workspace data
    if (url.pathname === '/dashboard') {
      return renderDashboard(env);
    }

    // Health / info endpoint
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'substrate-mcp',
        version: '0.1.0',
        description: 'Substrate — the agent-native data layer. D1 for structured data, R2 for files.',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — Claude Code, Codex)',
          sse: '/sse (SSE — OpenAI, ChatGPT, Cursor)',
          dashboard: '/dashboard (Human-readable content calendar)',
        },
        capabilities: {
          tools: '20 tools, 8 resources, 4 prompts',
        },
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
