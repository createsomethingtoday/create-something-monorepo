/**
 * Half Dozen DM MCP — Cloudflare Worker
 *
 * Generalized DM server identity.
 * v1 toolset: Notion (single client workspace, one operator-managed token).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { registerFeedbackTool, D1FeedbackStore, enableTelemetry } from '@create-something/mcp-core';
import { getDmConfig } from '../src/config.js';
import { getNotionClient, requireNotionClient } from '../src/lib/notion.js';
import { registerNotionTools } from '../src/tools/index.js';
import { DM_NOTION_TOOLS, registerToolsetsResource, registerToolsResource } from '../src/resources.js';
import { registerTaskWorkflowPrompt } from '../src/prompts.js';
import { validateApiKey } from './lib/auth.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  FEEDBACK_DB: D1Database;
  MCP_API_KEY?: string;
  NOTION_API_KEY?: string;
  WORKSPACE_CLIENT_LABEL?: string;
  WORKSPACE_CLIENT_DESCRIPTION?: string;
  MCP_DISPLAY_NAME?: string;
  MCP_DESCRIPTION?: string;
  ENABLED_TOOLSETS?: string;
}

const SERVER_NAME = 'halfdozen-dm-mcp';

// =============================================================================
// MCP Agent
// =============================================================================

export class HalfDozenDmMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: '1.0.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.FEEDBACK_DB) {
      enableTelemetry(this.server, this.env.FEEDBACK_DB, SERVER_NAME);
    }

    const config = getDmConfig(this.env);
    const notionClient = getNotionClient(this.env);
    const enabledToolsets = new Set(config.enabledToolsets);

    if (enabledToolsets.has('notion')) {
      if (!notionClient) {
        console.warn('NOTION_API_KEY is not set; Notion tools will be unavailable.');
      } else {
        registerNotionTools(this.server, requireNotionClient(notionClient));
      }
    }

    registerToolsetsResource(this.server, config);
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
      const authError = validateApiKey(request, env);
      if (authError) return authError;
      return HalfDozenDmMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
      return HalfDozenDmMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      const config = getDmConfig(env);
      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            display_name: config.displayName,
            version: '1.0.0',
            description: config.description,
            toolsets: config.enabledToolsets,
            tools: DM_NOTION_TOOLS.map((t) => t.name),
            auth: {
              transport: 'Authorization: Bearer <MCP_API_KEY> or X-API-Key',
              upstream: `NOTION_API_KEY (server-side secret) — ${config.clientLabel}`,
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
