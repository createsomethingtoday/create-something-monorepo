import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { AirtableClient } from '../src/airtable.js';
import { validateBearerToken } from '../src/auth.js';
import { registerPrompts } from '../src/prompts.js';
import { registerResources } from '../src/resources.js';
import { DEFAULT_AIRTABLE_BASE_ID } from '../src/schema.js';
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  MCP_API_KEY?: string;
}

function requireEnv(env: Env, key: keyof Env): string {
  const value = env[key];
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value;
}

export class WebflowAppReviewMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'webflow-app-review-mcp',
    version: '1.0.0',
  });

  async init() {
    const client = new AirtableClient({
      apiKey: requireEnv(this.env, 'AIRTABLE_API_KEY'),
      baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
    });

    registerResources(this.server, () => client);
    registerTools(this.server, () => client);
    registerPrompts(this.server);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') ||
        url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateBearerToken(request, env.MCP_API_KEY);
      if (authError) return authError;
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return WebflowAppReviewMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return WebflowAppReviewMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'webflow-app-review-mcp',
        version: '1.0.0',
        description: 'Webflow App Review MCP with Airtable-scoped app review workflows',
        endpoints: {
          mcp: '/mcp (auth required: bearer token)',
          sse: '/sse (auth required: bearer token)',
          health: '/ (public)',
        },
        auth: {
          bearer_header: 'Authorization: Bearer <MCP_API_KEY>',
          configured: Boolean(env.MCP_API_KEY),
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
