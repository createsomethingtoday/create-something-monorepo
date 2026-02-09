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
import { registerTools } from '../src/tools/index.js';
import { registerResources } from '../src/resources/index.js';
import { registerPrompts } from '../src/prompts/index.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
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
  });

  async init() {
    // D1 via binding — no REST API overhead
    const d1 = bindingExecutor(this.env.DB);
    // R2 via binding — no S3 signing overhead
    const r2 = bindingR2Store(this.env.FILES);

    // Register all three tiers with binding-backed accessors
    registerTools(this.server, () => d1, () => r2, () => 'agent');
    registerResources(this.server, () => d1);
    registerPrompts(this.server, () => d1);
  }
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

    // Health / info endpoint
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'substrate-mcp',
        version: '0.1.0',
        description: 'Substrate — the agent-native data layer. D1 for structured data, R2 for files.',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — Claude Code, Codex)',
          sse: '/sse (SSE — OpenAI, ChatGPT, Cursor)',
        },
        capabilities: {
          tools: '19 (workspace/table/record CRUD, query, relations, bulk, file upload/download)',
          resources: '8 (workspaces, tables, records, relations, files, audit)',
          prompts: '4 (workspace setup, data modeling, role perspective, data audit)',
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
