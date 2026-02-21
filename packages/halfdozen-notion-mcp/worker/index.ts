/**
 * Notion Half Dozen X CREATE SOMETHING — Cloudflare Worker
 *
 * One operator, two workspaces (Half Dozen + client). Full Notion tools.
 * No Composio; two operator-managed Notion integration tokens.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport
 *   /sse  — SSE fallback transport
 *   /     — Health/info JSON
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
  NOTION_API_KEY?: string;
  NOTION_CLIENT_API_KEY?: string;
  WORKSPACE_HALFDOZEN_LABEL?: string;
  WORKSPACE_HALFDOZEN_DESCRIPTION?: string;
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
}

const SERVER_NAME = 'notion-halfdozen-create-something';

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
        projectName: SERVER_NAME,
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return NotionHalfDozenMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return NotionHalfDozenMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
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
