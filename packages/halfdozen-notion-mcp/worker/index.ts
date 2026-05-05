/**
 * Notion Half Dozen X CREATE SOMETHING — Cloudflare Worker
 *
 * One operator, two workspaces (Half Dozen + client). Full Notion tools.
 * No Composio; two operator-managed Notion integration tokens.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport
 *   /sse  — SSE fallback transport
 *   /, /health — Health/info JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';
import { getWorkspaceConfig } from '../src/config.js';
import { getNotionClients } from '../src/lib/notion.js';
import { registerNotionTools } from '../src/tools/index.js';
import { NOTION_TOOLS, registerWorkspacesResource, registerToolsResource } from '../src/resources.js';
import { registerTaskWorkflowPrompt } from '../src/prompts.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  FEEDBACK_DB: D1Database;
  BRAINTRUST_API_KEY?: string;
  BRAINTRUST_PROJECT_NAME?: string;
  NOTION_API_KEY?: string;
  NOTION_CLIENT_API_KEY?: string;
  WORKSPACE_HALFDOZEN_LABEL?: string;
  WORKSPACE_HALFDOZEN_DESCRIPTION?: string;
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  MCP_BEARER_TOKEN?: string;
}

const SERVER_NAME = 'notion-halfdozen-create-something';
const DEFAULT_BRAINTRUST_PROJECT_NAME = 'CREATE SOMETHING';

function resolveBraintrustProjectName(env: { BRAINTRUST_PROJECT_NAME?: string }): string {
  const configured = env.BRAINTRUST_PROJECT_NAME?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_BRAINTRUST_PROJECT_NAME;
}

// =============================================================================
// MCP Agent
// =============================================================================

export class NotionHalfDozenMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: '1.0.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, SERVER_NAME, undefined, {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: resolveBraintrustProjectName(this.env),
        projectId: (this.env as any).BRAINTRUST_PROJECT_ID,
      });
    }

    const clients = getNotionClients(this.env);
    const config = getWorkspaceConfig(this.env);

    if (!clients.halfdozen && !clients.client) {
      console.warn('Neither NOTION_API_KEY nor NOTION_CLIENT_API_KEY is set; no Notion tools will be available.');
    } else {
      registerNotionTools(this.server, clients);
    }

    registerWorkspacesResource(this.server, config);
    registerToolsResource(this.server);
    registerTaskWorkflowPrompt(this.server, config);

    if (this.env.FEEDBACK_DB) {
      registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), SERVER_NAME);
    }
  }
}

// =============================================================================
// Worker entry
// =============================================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="mcp"',
      ...CORS_HEADERS,
    },
  });
}

function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function checkBearer(request: Request, env: Env): boolean {
  // Enforce only when MCP_BEARER_TOKEN is set; open otherwise (backward-compat).
  if (!env.MCP_BEARER_TOKEN) return true;
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return !!match && match[1] === env.MCP_BEARER_TOKEN;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // CORS preflight — always pass without bearer check
    if (request.method === 'OPTIONS') return preflight();

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return NotionHalfDozenMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return NotionHalfDozenMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const config = getWorkspaceConfig(env);
      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            display_name: config.displayName,
            version: '1.0.0',
            description: config.description,
            tools: NOTION_TOOLS.map((t) => t.name),
            auth: {
              halfdozen: `NOTION_API_KEY — ${config.halfdozen.label}`,
              client: `NOTION_CLIENT_API_KEY — ${config.client.label}`,
            },
            endpoints: { mcp: '/mcp', sse: '/sse' },
          },
          null,
          2
        ),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  },
};
