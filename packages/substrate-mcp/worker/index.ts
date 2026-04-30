/**
 * Substrate MCP Server — Cloudflare Worker (remote deployment)
 *
 * The agent-native data layer, deployed with a public URL.
 * D1 for structured data, R2 for files, McpAgent for dual transport.
 *
 * Authentication: Bearer token auth validated at the Worker boundary.
 * Tokens are SHA-256 hashed and stored in D1 access_tokens table.
 * Bootstrap mode: if no tokens exist, unauthenticated admin access is granted
 * so the first token can be created via MCP.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport (Claude Code, Codex) [auth required]
 *   /sse  — SSE fallback transport (OpenAI, ChatGPT, Cursor) [auth required]
 *   /reader/mcp — Read-only MCP (reader role forced) [auth required]
 *   /reader/sse — Read-only SSE (reader role forced) [auth required]
 *   /dashboard  — Human-readable dashboard [public]
 *   /, /health — Health/info JSON [public]
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { bindingExecutor, bindingR2Store, QueryTracker } from '../src/services/executor.js';
import { ensureInitialized, hashToken } from '../src/services/d1.js';
import { registerTools } from '../src/tools/index.js';
import { registerResources } from '../src/resources/index.js';
import { registerPrompts } from '../src/prompts/index.js';
import type { AccessToken } from '../src/types.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  READER_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  FILES: R2Bucket;
}

/** Auth context serialized into X-Substrate-Auth header for DO consumption. */
interface AuthContext {
  actor: string;        // token label (for audit trail)
  role: string;         // admin | editor | reader
  workspaceIds: string[]; // ['*'] or specific workspace IDs
  tokenId: string;      // token ID (for audit / revocation checks)
}

// =============================================================================
// Authentication — Bearer token validation at Worker boundary
// =============================================================================

/**
 * Validate Bearer token from Authorization header against D1.
 *
 * Bootstrap mode: if no access_tokens exist in D1 at all, returns a virtual
 * admin token so the first real token can be created via MCP tools.
 * Once any token exists, all requests require valid Bearer auth.
 */
async function authenticateRequest(request: Request, db: D1Database): Promise<AccessToken | Response> {
  const authHeader = request.headers.get('Authorization');

  // Check bootstrap mode — no tokens in system yet
  try {
    const count = await db.prepare('SELECT COUNT(*) as cnt FROM access_tokens').first<{ cnt: number }>();
    if (!count || count.cnt === 0) {
      // Bootstrap: allow unauthenticated admin access for initial token creation
      return {
        id: '__bootstrap__',
        token_hash: '',
        label: 'bootstrap-admin',
        role: 'admin',
        workspace_ids: ['*'],
        created_at: new Date().toISOString(),
        expires_at: null,
      } as unknown as AccessToken;
    }
  } catch {
    // access_tokens table may not exist yet — treat as bootstrap
    return {
      id: '__bootstrap__',
      token_hash: '',
      label: 'bootstrap-admin',
      role: 'admin',
      workspace_ids: ['*'],
      created_at: new Date().toISOString(),
      expires_at: null,
    } as unknown as AccessToken;
  }

  // Tokens exist — require Bearer auth
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      hint: 'Provide Authorization: Bearer <token>. Create tokens via create_token tool.',
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="substrate-mcp"',
      },
    });
  }

  const rawToken = authHeader.substring(7);
  const hash = await hashToken(rawToken);

  try {
    const row = await db
      .prepare('SELECT * FROM access_tokens WHERE token_hash = ?')
      .bind(hash)
      .first();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (row.expires_at && new Date(row.expires_at as string) < new Date()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse workspace_ids
    const workspaceIds = typeof row.workspace_ids === 'string'
      ? JSON.parse(row.workspace_ids) : row.workspace_ids;

    return {
      id: row.id,
      token_hash: row.token_hash,
      label: row.label,
      role: row.role,
      workspace_ids: workspaceIds,
      created_at: row.created_at,
      expires_at: row.expires_at,
    } as unknown as AccessToken;
  } catch {
    return new Response(JSON.stringify({
      error: 'Auth system error. Ensure database is initialized.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** Create a new Request with the auth context in a trusted internal header. */
function injectAuthContext(request: Request, token: AccessToken): Request {
  const ctx: AuthContext = {
    actor: token.label,
    role: token.role as string,
    workspaceIds: token.workspace_ids as string[],
    tokenId: token.id as string,
  };
  const headers = new Headers(request.headers);
  headers.set('X-Substrate-Auth', JSON.stringify(ctx));
  return new Request(request, { headers });
}

// =============================================================================
// Rate Limiter — token bucket per session (DO is single-threaded, no mutex needed)
// =============================================================================

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  constructor(private maxTokens: number, private refillPerSecond: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  consume(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) { this.tokens -= cost; return true; }
    return false;
  }
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillPerSecond);
    this.lastRefill = now;
  }
}

// =============================================================================
// MCP Agent — Durable Object with all three primitives
// =============================================================================

export class SubstrateMCP extends McpAgent<Env> {
  // Auth context — populated from X-Substrate-Auth header (set by Worker after token validation)
  private _auth: AuthContext = { actor: 'agent', role: 'admin', workspaceIds: ['*'], tokenId: '' };

  // Intercept fetch to capture auth context before MCP processing
  async fetch(request: Request): Promise<Response> {
    const authJson = request.headers.get('X-Substrate-Auth');
    if (authJson) {
      try { this._auth = JSON.parse(authJson); } catch { /* keep default */ }
    }
    return super.fetch(request);
  }

  server = new McpServer({
    name: 'substrate-mcp',
    version: '0.1.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0ibTEyLjgzIDIuMThhMiAyIDAgMCAwLTEuNjYgMEwyLjYgNi4wOGExIDEgMCAwIDAgMCAxLjgzbDguNTggMy45MWEyIDIgMCAwIDAgMS42NiAwbDguNTgtMy45YTEgMSAwIDAgMCAwLTEuODRaIi8+PHBhdGggZD0ibTIyIDE3LjY1LTkuMTcgNC4xNmEyIDIgMCAwIDEtMS42NiAwTDIgMTcuNjUiLz48cGF0aCBkPSJtMjIgMTIuNjUtOS4xNyA0LjE2YTIgMiAwIDAgMS0xLjY2IDBMMiAxMi42NSIvPjwvZz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  // Rate limit: 120 queries/min burst, 10/sec refill.
  // Each tool call uses 3-6 queries, so this allows ~20-40 tool calls/min sustained.
  private limiter = new RateLimiter(120, 10);
  private tracker = new QueryTracker();

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as any,
        'substrate-mcp',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
        {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: 'substrate-mcp',
        projectId: (this.env as any).BRAINTRUST_PROJECT_ID,
        },
      );
    }

    // D1 via binding — with observability tracking
    const d1 = bindingExecutor(this.env.DB, this.tracker);
    // R2 via binding — no S3 signing overhead
    const r2 = bindingR2Store(this.env.FILES);

    // One-time schema init (runs once per DO lifecycle, not per tool call)
    await ensureInitialized(d1);

    // Rate-limited D1 — checks token bucket per query, budget allows multi-query tools
    const limiter = this.limiter;
    const rateLimitedD1 = (): typeof d1 => {
      return ((sql: string, params?: unknown[]) => {
        if (!limiter.consume()) {
          return Promise.reject(new Error('Rate limited: too many requests. Wait a moment and retry.'));
        }
        return d1(sql, params);
      }) as typeof d1;
    };

    // Register all three tiers with auth-aware accessors
    // Closures read from this._auth which is updated on every fetch() before MCP processing
    // Pass inner Server for sampling/createMessage support on destructive tools
    const samplingServer = (this.server as any).server as import('../src/tools/index.js').SamplingCapable | undefined;
    registerTools(
      this.server, rateLimitedD1, () => r2,
      () => this._auth.actor,
      { getRole: () => this._auth.role, getWorkspaceIds: () => this._auth.workspaceIds },
      samplingServer,
    );
    registerResources(this.server, () => d1); // Resources are read-only, no rate limit
    registerPrompts(this.server, () => d1);
  }
}

// =============================================================================
// Reader MCP — restricted Durable Object (read + upvote only)
// =============================================================================

export class ReaderMCP extends McpAgent<Env> {
  // Auth context for reader sessions
  private _auth: AuthContext = { actor: 'reader', role: 'reader', workspaceIds: ['*'], tokenId: '' };

  async fetch(request: Request): Promise<Response> {
    const authJson = request.headers.get('X-Substrate-Auth');
    if (authJson) {
      try { this._auth = JSON.parse(authJson); } catch { /* keep default */ }
    }
    return super.fetch(request);
  }

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
        const { getRecord, updateRecord } = await import('../src/services/d1.js');
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

        // Use shared executor with optimistic lock — not raw this.env.DB
        await updateRecord(d1, rid, { upvotes }, rec.updated_at);

        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, upvotes: upvotes.length, voters: upvotes, title: data.title }) }] };
      },
    );
  }
}

// =============================================================================
// Dashboard — read-only human view (the trust layer)
// =============================================================================

/** Strip YAML frontmatter (---...---) from markdown body and return prose */
function stripFrontmatter(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.startsWith('---')) return trimmed;
  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return trimmed;
  return trimmed.slice(endIdx + 3).trim();
}

/** Get a clean preview: strip frontmatter from body, or fall back to summary */
function getPreview(data: Record<string, unknown>, maxLen = 200): string {
  const body = data.body ? String(data.body) : '';
  const stripped = body ? stripFrontmatter(body) : '';
  // Use first meaningful line of prose (skip headings)
  if (stripped) {
    const lines = stripped.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const prose = lines.join(' ').replace(/\*+/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return prose.slice(0, maxLen);
  }
  // Fallback to summary field
  const summary = data.summary ? String(data.summary) : '';
  return summary.slice(0, maxLen);
}

async function renderDashboard(env: Env, workspaceId?: string): Promise<Response> {
  const db = env.DB;

  // If workspace-scoped, verify it exists
  let wsName = '';
  let wsDescription = '';
  if (workspaceId) {
    const ws = await db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspaceId).first<{ id: string; name: string; description: string }>();
    if (!ws) {
      return new Response(JSON.stringify({ error: 'Workspace not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    wsName = ws.name;
    wsDescription = ws.description;
  }

  // Parallel queries — scoped to workspace when provided
  const [workspaces, tables, records, recordCount, fileCount, auditCount, recentAudit] = workspaceId
    ? await Promise.all([
        db.prepare('SELECT * FROM workspaces WHERE id = ?').bind(workspaceId).all(),
        db.prepare('SELECT * FROM table_definitions WHERE workspace_id = ? ORDER BY name').bind(workspaceId).all(),
        db.prepare('SELECT r.*, t.name as table_name, t.workspace_id FROM records r JOIN table_definitions t ON r.table_id = t.id WHERE t.workspace_id = ? ORDER BY r.updated_at DESC LIMIT 100').bind(workspaceId).all(),
        db.prepare('SELECT COUNT(*) as cnt FROM records r JOIN table_definitions t ON r.table_id = t.id WHERE t.workspace_id = ?').bind(workspaceId).first<{ cnt: number }>(),
        db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes),0) as sz FROM file_metadata WHERE workspace_id = ?').bind(workspaceId).first<{ cnt: number; sz: number }>(),
        db.prepare("SELECT COUNT(*) as cnt FROM audit_log WHERE workspace_id = ? AND timestamp > datetime('now','-1 day')").bind(workspaceId).first<{ cnt: number }>(),
        db.prepare("SELECT action, record_id, actor, timestamp, changes FROM audit_log WHERE workspace_id = ? ORDER BY timestamp DESC LIMIT 10").bind(workspaceId).all(),
      ])
    : await Promise.all([
        db.prepare('SELECT * FROM workspaces ORDER BY name').all(),
        db.prepare('SELECT * FROM table_definitions ORDER BY workspace_id, name').all(),
        db.prepare('SELECT r.*, t.name as table_name, t.workspace_id FROM records r JOIN table_definitions t ON r.table_id = t.id ORDER BY r.updated_at DESC LIMIT 100').all(),
        db.prepare('SELECT COUNT(*) as cnt FROM records').first<{ cnt: number }>(),
        db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(size_bytes),0) as sz FROM file_metadata').first<{ cnt: number; sz: number }>(),
        db.prepare("SELECT COUNT(*) as cnt FROM audit_log WHERE timestamp > datetime('now','-1 day')").first<{ cnt: number }>(),
        db.prepare("SELECT action, record_id, actor, timestamp, changes FROM audit_log ORDER BY timestamp DESC LIMIT 5").all(),
      ]);

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

  // Sort Content records by publish_date (ascending) for calendar view
  if (byTable['Content']) {
    byTable['Content'].sort((a, b) => {
      const da = String((a.data as Record<string, unknown>).publish_date || '9999');
      const db2 = String((b.data as Record<string, unknown>).publish_date || '9999');
      return da.localeCompare(db2);
    });
  }

  // Compute pipeline stats for Content table
  const contentRecs = byTable['Content'] || [];
  const pipeline: Record<string, number> = {};
  const propertyCount: Record<string, number> = {};
  const timelineDates: Record<string, { title: string; status: string; property: string }> = {};
  for (const r of contentRecs) {
    const d = r.data as Record<string, unknown>;
    const st = String(d.status || 'unknown');
    const prop = String(d.property || '');
    const pubDate = String(d.publish_date || '');
    pipeline[st] = (pipeline[st] || 0) + 1;
    if (prop) propertyCount[prop] = (propertyCount[prop] || 0) + 1;
    if (pubDate) timelineDates[pubDate] = { title: String(d.title || ''), status: st, property: prop };
  }

  // Build timeline: next 8 days from earliest publish_date
  const dates = Object.keys(timelineDates).sort();
  let timelineStart = dates.length ? dates[0] : new Date().toISOString().slice(0, 10);
  const timelineDays: Array<{ date: string; day: string; content: { title: string; status: string; property: string } | null }> = [];
  const startDate = new Date(timelineStart + 'T00:00:00Z');
  for (let i = 0; i < 8; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
    timelineDays.push({ date: iso, day: dayName, content: timelineDates[iso] || null });
  }

  // Format recent audit entries
  const auditEntries = recentAudit.results.map((a: any) => {
    const changes = a.changes ? JSON.parse(a.changes) : {};
    const title = changes?.after?.title || changes?.before?.title || (a.record_id ? a.record_id.slice(0, 8) : 'record');
    const ts = String(a.timestamp || '').slice(11, 16); // HH:MM
    return { action: a.action, actor: a.actor || 'agent', title, time: ts };
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="60">
<title>${workspaceId ? `${esc(wsName)} — Substrate` : 'Substrate — Dashboard'}</title>
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
  .section-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
  .pipeline-item { font-size: 0.6875rem; padding: 0.125rem 0.5rem; border-radius: 9999px; }
  .property-item { font-size: 0.6875rem; padding: 0.125rem 0.375rem; border-radius: 4px; background: #1a1a2e; color: #818cf8; }
  .timeline { display: flex; gap: 0.25rem; margin-bottom: 1.25rem; overflow-x: auto; }
  .tl-day { flex: 1; min-width: 90px; background: #171717; border: 1px solid #262626; border-radius: 6px; padding: 0.5rem; text-align: center; }
  .tl-day.has-content { border-color: #10b981; }
  .tl-day.is-gap { border-style: dashed; border-color: #dc2626; }
  .tl-date { font-size: 0.6875rem; color: #525252; }
  .tl-dayname { font-size: 0.75rem; font-weight: 500; color: #a3a3a3; margin-bottom: 0.25rem; }
  .tl-title { font-size: 0.625rem; color: #d4d4d4; line-height: 1.3; }
  .tl-empty { font-size: 0.625rem; color: #dc2626; font-style: italic; }
  .tl-prop { font-size: 0.5625rem; margin-top: 0.125rem; }
  .card { background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 0.5rem; }
  .card.needs-writer { border-style: dashed; border-color: #f59e0b; }
  .card-title { font-weight: 500; margin-bottom: 0.5rem; }
  .card-meta { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
  .needs-writer-badge { font-size: 0.6875rem; color: #f59e0b; background: #f59e0b20; padding: 0.125rem 0.5rem; border-radius: 9999px; }
  .tag { display: inline-block; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.6875rem; background: #262626; color: #a3a3a3; margin-right: 0.25rem; }
  .meta-item { font-size: 0.8125rem; color: #a3a3a3; }
  .agent-label { font-size: 0.75rem; color: #f59e0b; }
  .upvote { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: #f472b6; background: #f472b620; padding: 0.125rem 0.5rem; border-radius: 9999px; }
  .upvote-voters { font-size: 0.6875rem; color: #a3a3a3; margin-left: 0.25rem; }
  .body-preview { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #262626; font-size: 0.8125rem; color: #a3a3a3; line-height: 1.5; max-height: 4.5em; overflow: hidden; }
  .summary-preview { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #262626; font-size: 0.8125rem; color: #737373; font-style: italic; line-height: 1.5; max-height: 4.5em; overflow: hidden; }
  .empty { color: #525252; font-style: italic; padding: 1rem 0; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .audit { margin-bottom: 2rem; }
  .audit-entry { font-size: 0.75rem; color: #737373; padding: 0.25rem 0; border-bottom: 1px solid #1a1a1a; display: flex; gap: 0.5rem; }
  .audit-time { color: #525252; min-width: 3rem; font-family: monospace; }
  .audit-action { color: #a3a3a3; }
  .audit-actor { color: #f59e0b; }
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #262626; color: #525252; font-size: 0.75rem; }
  .endpoints { display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap; }
  .endpoint { background: #171717; border: 1px solid #262626; border-radius: 4px; padding: 0.25rem 0.5rem; font-family: monospace; font-size: 0.75rem; }
</style>
</head>
<body>
${workspaceId
  ? `<h1>${esc(wsName)}</h1>
<p class="subtitle">${wsDescription ? esc(wsDescription) + ' — ' : ''}Read-only workspace view. <a href="/dashboard">All workspaces</a></p>`
  : `<h1>Substrate</h1>
<p class="subtitle">Agent-native data layer — read-only dashboard. Agents manage the data; this view builds trust.</p>`}

<div class="stats">
  <div class="stat"><div class="stat-value">${workspaces.results.length}</div><div class="stat-label">Workspaces</div></div>
  <div class="stat"><div class="stat-value">${tables.results.length}</div><div class="stat-label">Tables</div></div>
  <div class="stat"><div class="stat-value">${recordCount?.cnt ?? 0}</div><div class="stat-label">Records</div></div>
  <div class="stat"><div class="stat-value">${fileCount?.cnt ?? 0}</div><div class="stat-label">Files</div></div>
  <div class="stat"><div class="stat-value">${auditCount?.cnt ?? 0}</div><div class="stat-label">Changes (24h)</div></div>
</div>

${contentRecs.length ? `
<div class="section">
  <div class="section-title">Content (${contentRecs.length})</div>
  <div class="section-meta">
    ${Object.entries(pipeline).map(([st, cnt]) => {
      const c = statusColors[st] || '#6b7280';
      return `<span class="pipeline-item" style="background:${c}20;color:${c}">${esc(st)}: ${cnt}</span>`;
    }).join('')}
    ${Object.entries(propertyCount).map(([p, cnt]) =>
      `<span class="property-item">${esc(p)}: ${cnt}</span>`
    ).join('')}
  </div>
  <div class="timeline">
    ${timelineDays.map(td => {
      const hasContent = !!td.content;
      const cls = hasContent ? 'tl-day has-content' : 'tl-day is-gap';
      const stColor = hasContent ? (statusColors[td.content!.status] || '#6b7280') : '';
      return `<div class="${cls}">
        <div class="tl-dayname">${esc(td.day)}</div>
        <div class="tl-date">${esc(td.date.slice(5))}</div>
        ${hasContent
          ? `<div class="tl-title" style="color:${stColor}">${esc(td.content!.title.length > 30 ? td.content!.title.slice(0, 28) + '…' : td.content!.title)}</div><div class="tl-prop">${esc(td.content!.property)}</div>`
          : `<div class="tl-empty">gap</div>`}
      </div>`;
    }).join('')}
  </div>
  ${contentRecs.map(r => {
    const d = r.data as Record<string, unknown>;
    const status = String(d.status || '');
    const color = statusColors[status] || '#6b7280';
    const title = String(d.title || d.name || r.id);
    const property = d.property ? String(d.property) : '';
    const date = d.publish_date ? String(d.publish_date) : '';
    const agent = d.assigned_agent ? String(d.assigned_agent) : '';
    const tags = Array.isArray(d.tags) ? d.tags as string[] : [];
    const preview = getPreview(d);
    const upvotes = Array.isArray(d.upvotes) ? d.upvotes as string[] : [];
    const needsWriter = status === 'draft' && !agent;
    const hasBody = !!(d.body && String(d.body).trim());
    return `<div class="card${needsWriter ? ' needs-writer' : ''}">
      <div class="card-title">${esc(title)}</div>
      <div class="card-meta">
        ${status ? `<span class="badge" style="background:${color}20;color:${color}">${esc(status)}</span>` : ''}
        ${property ? `<span class="meta-item">${esc(property)}</span>` : ''}
        ${date ? `<span class="meta-item">${esc(date)}</span>` : ''}
        ${agent ? `<span class="agent-label">${esc(agent)}</span>` : ''}
        ${needsWriter ? `<span class="needs-writer-badge">needs writer</span>` : ''}
        ${upvotes.length ? `<span class="upvote">\u25B2 ${upvotes.length}<span class="upvote-voters">${upvotes.map(v => esc(v)).join(', ')}</span></span>` : ''}
      </div>
      ${tags.length ? `<div style="margin-top:0.5rem">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      ${preview ? `<div class="${hasBody ? 'body-preview' : 'summary-preview'}">${esc(preview)}${preview.length >= 200 ? '…' : ''}</div>` : ''}
    </div>`;
  }).join('')}
</div>
` : ''}

${Object.entries(byTable).filter(([name]) => name !== 'Content').map(([tableName, recs]) => `
<div class="section">
  <div class="section-title">${esc(tableName)} (${recs.length})</div>
  ${recs.map(r => {
    const d = r.data as Record<string, unknown>;
    const status = String(d.status || '');
    const color = statusColors[status] || '#6b7280';
    const title = String(d.title || d.name || r.id);
    const property = d.property ? String(d.property) : '';
    const tags = Array.isArray(d.tags) ? d.tags as string[] : [];
    const description = d.description ? String(d.description) : '';
    return `<div class="card">
      <div class="card-title">${esc(title)}</div>
      <div class="card-meta">
        ${status ? `<span class="badge" style="background:${color}20;color:${color}">${esc(status)}</span>` : ''}
        ${property ? `<span class="meta-item">${esc(property)}</span>` : ''}
      </div>
      ${description ? `<div class="body-preview">${esc(description.slice(0, 200))}</div>` : ''}
    </div>`;
  }).join('')}
</div>
`).join('')}

${!workspaceId && workspaces.results.length > 1 ? `
<div class="section">
  <div class="section-title">Workspaces</div>
  ${workspaces.results.map((ws: any) => `<a href="/dashboard/${esc(ws.id)}" style="display:inline-block;margin:0.25rem 0.5rem 0.25rem 0;padding:0.25rem 0.75rem;background:#171717;border:1px solid #262626;border-radius:6px;font-size:0.8125rem;color:#e5e5e5;text-decoration:none;">${esc(ws.name)}</a>`).join('')}
</div>` : ''}

${Object.keys(byTable).length === 0 ? '<p class="empty">No records yet. Connect an agent and start creating.</p>' : ''}

${auditEntries.length ? `
<div class="audit">
  <div class="section-title">Recent Activity</div>
  ${auditEntries.map((a: any) => `
    <div class="audit-entry">
      <span class="audit-time">${esc(a.time)}</span>
      <span class="audit-actor">${esc(a.actor)}</span>
      <span class="audit-action">${esc(a.action)} "${esc(String(a.title).slice(0, 50))}"</span>
    </div>
  `).join('')}
</div>
` : ''}

<div class="footer">
  <div>Substrate v0.1.0 — the UI is optional, the data is real.</div>
  ${workspaceId
    ? `<div style="margin-top:0.5rem;color:#737373;font-size:0.75rem;">Share this link: <span class="endpoint">/dashboard/${esc(workspaceId)}</span></div>`
    : `<div class="endpoints">
    <span class="endpoint">/mcp</span> Streamable HTTP
    <span class="endpoint">/sse</span> SSE
    <span class="endpoint">/reader/mcp</span> Reader (read + upvote)
    <span class="endpoint">/dashboard</span> This view
  </div>`}
</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
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

    // ─── CORS preflight ────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ─── Public endpoints (no auth) ────────────────────────────────

    // Health / info endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'substrate-mcp',
        version: '0.1.0',
        description: 'Substrate — the agent-native data layer. D1 for structured data, R2 for files.',
        auth: 'Bearer token required. Bootstrap: first connection without tokens creates admin access.',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — auth required)',
          sse: '/sse (SSE — auth required)',
          reader_mcp: '/reader/mcp (Read-only — auth required)',
          reader_sse: '/reader/sse (Read-only — auth required)',
          dashboard: '/dashboard (Human-readable — public)',
        },
        capabilities: {
          tools: '22 tools, 8 resources, 4 prompts',
        },
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Dashboard — read-only human view (public trust layer)
    if (url.pathname === '/dashboard') {
      return renderDashboard(env);
    }

    // Workspace-scoped dashboard — shareable link per workspace
    const dashMatch = url.pathname.match(/^\/dashboard\/([a-f0-9-]+)$/i);
    if (dashMatch) {
      return renderDashboard(env, dashMatch[1]);
    }

    // Reader info endpoint (public)
    if (url.pathname === '/reader') {
      return new Response(JSON.stringify({
        name: 'substrate-reader',
        version: '0.1.0',
        description: 'Read-only access to Substrate with upvote capability. 4 tools: find_records, list_workspaces, get_record, upvote_content.',
        auth: 'Bearer token required (any role).',
        endpoints: {
          mcp: '/reader/mcp',
          sse: '/reader/sse',
        },
      }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ─── Authenticated MCP endpoints ───────────────────────────────

    const isMcpEndpoint =
      url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') ||
      url.pathname === '/sse' || url.pathname.startsWith('/sse/') ||
      url.pathname.startsWith('/reader/mcp') || url.pathname.startsWith('/reader/sse');

    if (isMcpEndpoint) {
      // Validate Bearer token
      const tokenOrError = await authenticateRequest(request, env.DB);
      if (tokenOrError instanceof Response) return tokenOrError;

      const token = tokenOrError;
      const authedRequest = injectAuthContext(request, token);

      // Route based on endpoint + role enforcement
      const isReaderEndpoint = url.pathname.startsWith('/reader/');

      if (isReaderEndpoint) {
        // Reader endpoints — any role can access (readers get read-only tools)
        if (url.pathname === '/reader/mcp' || url.pathname.startsWith('/reader/mcp/')) {
          return ReaderMCP.serve('/reader/mcp').fetch(authedRequest, env, ctx);
        }
        if (url.pathname === '/reader/sse' || url.pathname.startsWith('/reader/sse/')) {
          return ReaderMCP.serve('/reader/sse').fetch(authedRequest, env, ctx);
        }
      }

      // Full MCP endpoints — reader tokens get routed to ReaderMCP for safety
      const role = token.role as string;
      if (role === 'reader') {
        // Reader tokens hitting /mcp or /sse get redirected to reader DO
        const readerPath = url.pathname.startsWith('/sse') ? '/reader/sse' : '/reader/mcp';
        return ReaderMCP.serve(readerPath).fetch(authedRequest, env, ctx);
      }

      // Admin/Editor tokens — full access
      if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
        return SubstrateMCP.serve('/mcp').fetch(authedRequest, env, ctx);
      }
      if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
        return SubstrateMCP.serve('/sse').fetch(authedRequest, env, ctx);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
