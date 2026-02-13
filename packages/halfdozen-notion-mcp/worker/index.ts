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
import { registerFeedbackTool, D1FeedbackStore } from '@create-something/mcp-core';
import { getNotionClients } from '../src/lib/notion.js';
import { registerNotionTools } from '../src/tools/index.js';
import { registerWorkspacesResource } from '../src/resources.js';
import { registerTaskWorkflowPrompt } from '../src/prompts.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  FEEDBACK_DB: D1Database;
  NOTION_API_KEY?: string;
  NOTION_CLIENT_API_KEY?: string;
}

const SERVER_NAME = 'notion-halfdozen-create-something';
const DISPLAY_NAME = 'Notion Half Dozen X CREATE SOMETHING';

// =============================================================================
// MCP Agent
// =============================================================================

export class NotionHalfDozenMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: '1.0.0',
  });

  async init() {
    const clients = getNotionClients(this.env);

    if (!clients.halfdozen && !clients.client) {
      console.warn('Neither NOTION_API_KEY nor NOTION_CLIENT_API_KEY is set; no Notion tools will be available.');
    } else {
      registerNotionTools(this.server, clients);
    }

    registerWorkspacesResource(this.server);
    registerTaskWorkflowPrompt(this.server);

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
      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            display_name: DISPLAY_NAME,
            version: '1.0.0',
            description: 'Half Dozen access to its own Notion and its CREATE SOMETHING (agency) client\'s Notion. Full Notion tools; no Composio.',
            auth: {
              halfdozen: 'NOTION_API_KEY — Half Dozen internal (Meeting Capture, transcripts)',
              client: 'NOTION_CLIENT_API_KEY — CREATE SOMETHING client workspace',
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
