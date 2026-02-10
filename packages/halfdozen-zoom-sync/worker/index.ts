/**
 * Zoom Clips MCP Server — Cloudflare Worker
 *
 * Zoom Clips to Notion sync, deployed as a remote MCP server.
 * Uses all three MCP primitives (Resources, Tools, Prompts) aligned to the
 * Three-Tier Framework (Database, Automation, Judgment).
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport (Claude Code, Codex)
 *   /sse  — SSE fallback transport (Cursor, ChatGPT, Claude Desktop)
 *   /     — Health/info JSON
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Clips library, clip details, sync status, session health
 *   Automation tier (Tools)     — Sync, extract, search, session management
 *   Judgment tier (Prompts)     — Transcript analysis, summarization, sync strategy
 *
 * Browser Automation:
 *   Uses Steel.dev sessions + CDP-over-WebSocket for Zoom Clips extraction.
 *   Zoom has no REST API for Clips — browser automation is required.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { registerSyncTools } from '../src/tools/sync.js';
import { registerSearchTools } from '../src/tools/search.js';
import { registerSessionTools } from '../src/tools/session.js';
import { registerClipsResources } from '../src/resources/clips.js';
import { registerStatusResources } from '../src/resources/status.js';
import { registerPrompts } from '../src/prompts/analysis.js';
import { initSchema, type D1Database } from '../src/lib/db.js';
import type { SteelSessionContext } from '../src/lib/steel.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  // Durable Object binding
  MCP_OBJECT: DurableObjectNamespace;

  // D1 database
  DB: D1Database;

  // KV namespace for session context
  ZOOM_SESSION_CONTEXT: KVNamespace;

  // Secrets (set via `wrangler secret put`)
  STEEL_API_KEY: string;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}

// Session context KV key
const SESSION_CONTEXT_KEY = 'zoom-session-context';

// =============================================================================
// MCP Agent — Durable Object with all three primitives
// =============================================================================

export class ZoomClipsMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'halfdozen-zoom-sync',
    version: '2.0.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHJlY3QgeD0iMiIgeT0iNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjE0IiByeD0iMiIvPjxwYXRoIGQ9Im0xNiA4IDYtMyIvPjxwYXRoIGQ9Im0xNiAxNCA2IDMiLz48cGF0aCBkPSJNMjIgNXY1Ii8+PC9nPjwvc3ZnPg==',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  private schemaInitialized = false;

  async init() {
    const getDb = () => this.env.DB as unknown as D1Database;

    // Initialize schema on first use
    if (!this.schemaInitialized) {
      try {
        await initSchema(getDb());
        this.schemaInitialized = true;
      } catch (e) {
        console.error('Schema init failed (may already exist):', e);
        this.schemaInitialized = true; // Don't retry
      }
    }

    const notionConfig = {
      apiKey: this.env.NOTION_API_KEY,
      databaseId: this.env.NOTION_DATABASE_ID,
    };

    // Session context accessors (KV-backed)
    const getSessionContext = async (): Promise<SteelSessionContext | null> => {
      const raw = await this.env.ZOOM_SESSION_CONTEXT.get(SESSION_CONTEXT_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as SteelSessionContext;
      } catch {
        return null;
      }
    };

    const setSessionContext = async (ctx: SteelSessionContext): Promise<void> => {
      await this.env.ZOOM_SESSION_CONTEXT.put(
        SESSION_CONTEXT_KEY,
        JSON.stringify(ctx),
      );
    };

    // -----------------------------------------------------------------------
    // Register all three tiers
    // -----------------------------------------------------------------------

    // Automation tier (Tools)
    registerSyncTools(this.server, {
      steelApiKey: this.env.STEEL_API_KEY,
      notionConfig,
      getDb,
      getSessionContext,
    });
    registerSearchTools(this.server, notionConfig);
    registerSessionTools(this.server, {
      steelApiKey: this.env.STEEL_API_KEY,
      getDb,
      getSessionContext,
      setSessionContext,
    });

    // Database tier (Resources)
    registerClipsResources(this.server, getDb, notionConfig);
    registerStatusResources(this.server, getDb, getSessionContext);

    // Judgment tier (Prompts)
    registerPrompts(this.server);
  }
}

// =============================================================================
// Worker entry point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // MCP transports
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return ZoomClipsMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return ZoomClipsMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Health / info
    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({
          name: 'halfdozen-zoom-sync',
          version: '2.0.0',
          description: 'Zoom Clips to Notion MCP Server',
          framework: {
            database: ['clips://library', 'clips://status', 'clips://session', 'clips://clip/{id}'],
            automation: ['sync_clips', 'extract_clip', 'search_clips', 'get_session_status', 'upload_session_context'],
            judgment: ['transcript_analysis', 'clip_summarization', 'sync_strategy'],
          },
          endpoints: {
            mcp: '/mcp',
            sse: '/sse',
          },
        }, null, 2),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
