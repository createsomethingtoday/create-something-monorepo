/**
 * Playbook MCP — Cloudflare Worker
 *
 * Lightweight host workflow playbooks as a remote MCP server.
 * Ships alongside client MCPs for onboarding.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP (Claude Code, Codex)
 *   /sse  — SSE fallback (Cursor, Claude Desktop)
 *   /     — Health/info JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';
import { HOST_PLAYBOOKS } from '../src/playbooks.js';
import { MCP_CATALOG } from '../src/catalog.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  // FEEDBACK_DB: D1Database;  // TODO: enable when CS feedback D1 is created
}

// =============================================================================
// MCP Agent
// =============================================================================

export class PlaybookMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'playbook',
    version: '1.1.0',
  });

  async init() {
    registerResources(this.server);
    registerTools(this.server);
    registerPrompts(this.server);

    // TODO: enable when FEEDBACK_DB is bound
    // if (this.env.FEEDBACK_DB) {
    //   const { registerFeedbackTool, D1FeedbackStore } = await import('@create-something/mcp-core');
    //   registerFeedbackTool(this.server, new D1FeedbackStore(this.env.FEEDBACK_DB), 'playbook');
    // }
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/'))
      return PlaybookMCP.serve('/mcp').fetch(request, env, ctx);
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/'))
      return PlaybookMCP.serve('/sse').fetch(request, env, ctx);

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'playbook',
        version: '1.1.0',
        description: 'Host workflow playbooks and installation guidance for MCP onboarding',
        hosts: HOST_PLAYBOOKS.map(p => p.name),
        catalogEntries: MCP_CATALOG.length,
        endpoints: { mcp: '/mcp', sse: '/sse' },
        tools: [
          'get_playbook', 'compare_hosts', 'get_folder_structure',
          'detect_host', 'list_available_mcps', 'generate_mcp_config',
          'scaffold_project', 'verify_mcp_connection',
        ],
        resources: 6,
        prompts: ['workflow_setup', 'host_comparison', 'project_structure'],
      }, null, 2), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
