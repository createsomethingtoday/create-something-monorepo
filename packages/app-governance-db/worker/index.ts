import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  MCP_API_KEY?: string;
}

export function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) {
    return misconfiguredResponse('MCP_API_KEY is not configured for this deployment.');
  }
  return validateBearerToken(request, env.MCP_API_KEY);
}

export class AppGovernanceMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'app-governance-db',
    version: '1.0.0',
  });

  async init() {
    registerTools(this.server, () => this.env.DB);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') || url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return AppGovernanceMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return AppGovernanceMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'app-governance-db',
            version: '1.0.0',
            description:
              'App Governance & Transparency database layer — D1-canonical findings, Slack-synced items, categorization, notifications, audit. Atlas-backed.',
            auth: {
              mode: 'Bearer required',
              configured: Boolean(env.MCP_API_KEY),
              header: 'Authorization: Bearer <MCP_API_KEY>',
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
            },
            context: {
              tracker_canvas: 'F0BB96552KG',
              triage_channel: 'C05KPSPTPFT',
              airtable_projection: 'app1Q0o9xw2Zny7gw',
            },
          },
          null,
          2,
        ),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        },
      );
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};
