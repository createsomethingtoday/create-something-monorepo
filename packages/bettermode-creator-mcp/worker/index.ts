/**
 * Bettermode Marketplace Creator MCP — Cloudflare Worker
 *
 * Read-only MCP exposing Bettermode + Airtable + community_queue helpers
 * to a Dify agent (or any MCP client) drafting admin replies for the
 * Webflow Community Marketplace Creators space.
 *
 * Endpoints:
 *   /mcp        Streamable HTTP transport (Dify, Claude Code, Codex)
 *   /sse        SSE fallback transport
 *   /, /health  Health/info JSON
 *
 * Auth: Bearer token in `Authorization: Bearer ${MCP_BEARER_TOKEN}` header.
 *       If MCP_BEARER_TOKEN is unset the server is open (dev only).
 */

import { enableTelemetry } from '@create-something/mcp-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import { registerCreatorTools, type McpEnv } from '../src/tools/index.js';

interface Env extends McpEnv {
  MCP_OBJECT: DurableObjectNamespace;
  MCP_BEARER_TOKEN?: string;
  ENVIRONMENT?: string;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_HOST?: string;
}

const SERVER_NAME = 'bettermode-marketplace-creator';
const SERVER_VERSION = '0.1.0';

const TOOL_NAMES = [
  'fetch_post_thread',
  'get_creator_context',
  'list_recent_approved_drafts',
  'get_draft_status',
];

export class BettermodeCreatorMcp extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        SERVER_NAME,
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
        {
          publicKey: this.env.LANGFUSE_PUBLIC_KEY,
          secretKey: this.env.LANGFUSE_SECRET_KEY,
          projectName: this.env.LANGFUSE_PROJECT_NAME?.trim() || SERVER_NAME,
          host: this.env.LANGFUSE_HOST,
        },
      );
    }
    registerCreatorTools(this.server, this.env);
  }
}

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
  if (!env.MCP_BEARER_TOKEN) return true;
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return !!match && match[1] === env.MCP_BEARER_TOKEN;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') return preflight();

    const url = new URL(request.url);

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return BettermodeCreatorMcp.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      if (!checkBearer(request, env)) return unauthorized();
      return BettermodeCreatorMcp.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: SERVER_NAME,
            version: SERVER_VERSION,
            description: 'Read-only Bettermode + Airtable + community queue helpers for Marketplace Creator drafting',
            tools: TOOL_NAMES,
            endpoints: { mcp: '/mcp', sse: '/sse' },
            environment: env.ENVIRONMENT || 'development',
            bearer_required: !!env.MCP_BEARER_TOKEN,
            telemetry: {
              d1: !!env.TELEMETRY_DB,
              langfuse: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
            },
          },
          null,
          2,
        ),
        { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  },
} satisfies ExportedHandler<Env>;
