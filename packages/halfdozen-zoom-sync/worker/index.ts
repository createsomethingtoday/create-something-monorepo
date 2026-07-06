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
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';

import { ComposioToolFactory } from '@create-something/composio-bridge';
import { registerSyncTools } from '../src/tools/sync.js';
import { registerSearchTools } from '../src/tools/search.js';
import { registerSessionTools } from '../src/tools/session.js';
import { registerZoomApiAuthTools } from '../src/tools/zoom-api-auth.js';
import { registerClipsResources } from '../src/resources/clips.js';
import { registerStatusResources } from '../src/resources/status.js';
import { registerPrompts } from '../src/prompts/analysis.js';
import { initSchema, type D1Database } from '../src/lib/db.js';
import { createHalfDozenZoomExecutionHooks } from '../src/lib/composio-security-policy.js';
import type { SteelSessionContext } from '../src/lib/steel.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  // Durable Object binding
  MCP_OBJECT: DurableObjectNamespace;

  // D1 database
  DB: D1Database;

  // Shared feedback database (all Half Dozen MCPs)
  FEEDBACK_DB: any;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;

  // KV namespace for session context
  ZOOM_SESSION_CONTEXT: KVNamespace;

  // Secrets (set via `wrangler secret put`)
  STEEL_API_KEY: string;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;

  // Optional: Composio API key to expose Zoom API tools (meetings, recordings, etc.) alongside Zoom Clips tools
  COMPOSIO_API_KEY?: string;
  // Optional: Composio Zoom auth config ID (from Composio dashboard) so zoom_api_get_connect_link can return a connect URL
  COMPOSIO_ZOOM_AUTH_CONFIG_ID?: string;
}

// Session context KV key (cookie blob; used when no profile is set)
const SESSION_CONTEXT_KEY = 'zoom-session-context';
// Steel Profile ID (preferred over session context when set — one-time login, reuse until 30-day expiry)
const CLIPS_PROFILE_ID_KEY = 'zoom-clips-profile-id';
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';

function resolveLangfuseProjectName(env: { LANGFUSE_PROJECT_NAME?: string }): string {
  const configured = env.LANGFUSE_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_LANGFUSE_PROJECT_NAME;
}

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
  private currentAccountId = 'operator';

  override async fetch(request: Request): Promise<Response> {
    this.currentAccountId = this.getAccountIdFromRequest(request) ?? 'operator';
    return super.fetch(request);
  }

  private getAccountIdFromRequest(request: Request): string | null {
    const accountHeader = request.headers.get('x-mcp-account-id') ?? request.headers.get('x-account-id');
    if (accountHeader?.trim()) return accountHeader.trim();

    const auth = request.headers.get('authorization');
    if (auth?.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      if (token) return token;
    }

    return null;
  }

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, 'halfdozen-zoom-sync', () => this.currentAccountId, {
        publicKey: (this.env as any).LANGFUSE_PUBLIC_KEY,
        secretKey: (this.env as any).LANGFUSE_SECRET_KEY,
        projectName: resolveLangfuseProjectName(this.env),
      });
    }

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

    const getClipsProfileId = async (): Promise<string | null> => {
      return await this.env.ZOOM_SESSION_CONTEXT.get(CLIPS_PROFILE_ID_KEY);
    };

    const setClipsProfileId = async (profileId: string): Promise<void> => {
      await this.env.ZOOM_SESSION_CONTEXT.put(CLIPS_PROFILE_ID_KEY, profileId);
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
      getClipsProfileId,
    });
    registerSearchTools(this.server, notionConfig);
    registerSessionTools(this.server, {
      steelApiKey: this.env.STEEL_API_KEY,
      getDb,
      getSessionContext,
      setSessionContext,
      getClipsProfileId,
      setClipsProfileId,
    });

    // Database tier (Resources)
    registerClipsResources(this.server, getDb, notionConfig);
    registerStatusResources(this.server, getDb, getSessionContext, getClipsProfileId);

    // Judgment tier (Prompts)
    registerPrompts(this.server);

    // Composio Zoom API tools (meetings, recordings, webinars) and auth navigation when key is set
    if (this.env.COMPOSIO_API_KEY) {
      const composioFactory = new ComposioToolFactory({
        apiKey: this.env.COMPOSIO_API_KEY,
        apps: [{ app: 'ZOOM', prefix: 'zoom_api', readOnly: true }],
        executionHooks: createHalfDozenZoomExecutionHooks(),
      });
      const composioCount = await composioFactory.registerToolsOnMcpServer(
        this.server as import('@create-something/composio-bridge').McpServerLike,
        'default',
      );
      registerZoomApiAuthTools(this.server, {
        composioClient: composioFactory.getClient(),
        composioApiKey: this.env.COMPOSIO_API_KEY,
        zoomAuthConfigId: this.env.COMPOSIO_ZOOM_AUTH_CONFIG_ID,
        entityId: 'default',
      });
      if (composioCount > 0) {
        console.info(
          `Registered ${composioCount} Composio Zoom API tools (zoom_api_*) and auth tools (zoom_api_connection_status, zoom_api_get_connect_link)`,
        );
      }
    }

    // Feedback (cross-cutting — support ticket pathway)
    if (this.env.FEEDBACK_DB) {
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), 'halfdozen-zoom-sync');
    }
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

    // Health / info — self-describes auth surfaces so clients know which tools need which setup
    if (url.pathname === '/' || url.pathname === '/health') {
      const composioEnabled = Boolean(env.COMPOSIO_API_KEY);
      const automationClips = [
        'sync_clips',
        'extract_clip',
        'search_clips',
        'get_session_status',
        'upload_session_context',
        'set_clips_profile',
      ];
      const automationApi = composioEnabled
        ? ['zoom_api_connection_status', 'zoom_api_get_connect_link', 'zoom_api_* (Composio Zoom toolkit)']
        : [];

      return new Response(
        JSON.stringify(
          {
            name: 'halfdozen-zoom-sync',
            version: '2.0.0',
            description: 'Zoom Clips to Notion MCP Server',
            auth_surfaces: {
              zoom_clips: {
                method: 'profile_or_session_context',
                description: 'Steel profile (set_clips_profile, one-time) or session cookies (upload_session_context). Prefer profile for agent auth.',
                tools: automationClips,
              },
              zoom_api: {
                method: 'composio',
                description: 'Composio connected account (entity: default). Use zoom_api_connection_status and zoom_api_get_connect_link to navigate auth.',
                tools: composioEnabled
                  ? ['zoom_api_connection_status', 'zoom_api_get_connect_link', 'zoom_api_*']
                  : [],
                enabled: composioEnabled,
              },
            },
            framework: {
              database: ['clips://library', 'clips://status', 'clips://session', 'clips://clip/{id}'],
              automation: [...automationClips, ...automationApi],
              judgment: ['transcript_analysis', 'clip_summarization', 'sync_strategy'],
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
            },
          },
          null,
          2,
        ),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
