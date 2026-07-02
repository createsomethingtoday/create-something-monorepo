import { McpAgent } from 'agents/mcp';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolveRuntimeConfig } from './config.js';
import { langfuseHealth } from './langfuse.js';
import { createBlondishSyncMcpServer } from './mcp.js';
import type { Env } from './types.js';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

export class BlondishSyncMcp extends McpAgent<Env> {
  server!: McpServer;

  async init() {
    this.server = createBlondishSyncMcpServer(this.env);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    if (url.pathname === '/' || url.pathname === '/health') {
      const runtime = resolveRuntimeConfig(env);
      return jsonResponse({
        ok: true,
        worker: runtime.serverName,
        mode: 'operator_mcp',
        endpoints: {
          mcp: '/mcp',
          health: '/health',
        },
        config: {
          client: runtime.clientSlug,
          tenant: runtime.tenantSlug,
          client_display_name: runtime.clientDisplayName,
          tool_prefix: runtime.toolPrefix,
          client_source_data_source_configured: Boolean(runtime.sourceDataSourceId || runtime.sourceDataSourceTitle),
          halfdozen_target_data_source_configured: Boolean(env.HALFDOZEN_TICKETS_DATA_SOURCE_ID?.trim() || env.HALFDOZEN_TICKETS_DATABASE_ID?.trim() || env.HALFDOZEN_TICKETS_DATA_SOURCE_TITLE?.trim()),
          client_status_property: runtime.sourceStatusProperty || 'Status',
          langfuse: langfuseHealth(env),
        },
        secrets: {
          mcp_api_key_configured: Boolean(env.MCP_API_KEY?.trim()),
          client_token_configured: Boolean((env.CLIENT_NOTION_API_KEY ?? env.BLONDISH_NOTION_API_KEY)?.trim()),
          halfdozen_token_configured: Boolean(env.HALFDOZEN_NOTION_API_KEY?.trim()),
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return BlondishSyncMcp.serve('/mcp').fetch(request, env, ctx);
    }

    return jsonResponse({ ok: false, error: 'Not found', mcp_endpoint: '/mcp' }, { status: 404 });
  },
};

function checkBearer(request: Request, env: Env): boolean {
  if (!env.MCP_API_KEY?.trim()) return false;
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return !!match && match[1] === env.MCP_API_KEY;
}

function unauthorized(): Response {
  return jsonResponse({ error: 'Unauthorized' }, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Bearer realm="mcp"' },
  });
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}
