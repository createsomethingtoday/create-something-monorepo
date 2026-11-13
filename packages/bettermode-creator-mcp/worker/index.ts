/**
 * Bettermode Marketplace Creator MCP — Cloudflare Worker
 *
 * MCP exposing Bettermode + Airtable + response-queue helpers to an agent
 * (any MCP client) drafting admin replies for the Webflow Community
 * Marketplace Creators space. Bettermode and Airtable are read-only. Queue
 * writes are internal (drafts, dismissals); no tool posts to the community.
 *
 * Endpoints:
 *   /mcp        Streamable HTTP transport (Dify, Claude Code, Codex)
 *   /sse        SSE fallback transport
 *   /, /health  Health/info JSON
 *
 * Auth: Bearer token in `Authorization: Bearer ${MCP_BEARER_TOKEN}` header.
 *       If MCP_BEARER_TOKEN is unset the server is open (dev only).
 */

import { WorkerEntrypoint } from 'cloudflare:workers';
import { enableTelemetry } from '@create-something/mcp-core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';

import {
  dismissQueueItem,
  getQueueHealth,
  listQueueHistory,
  listResponseQueue,
  saveAgentDraft,
} from '../src/lib/store.js';
import { loadQueueThread, registerCreatorTools, type McpEnv } from '../src/tools/index.js';

// The agent Worker's private send entrypoint (QueueAdmin).
type CreatorAgentBinding = {
  sendDraft(input: {
    postId: string;
    draftText: string;
    requestedBy?: string | null;
  }): Promise<{ ok: true; reply_id: string | null } | { ok: false; error: string }>;
};

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
  CREATOR_AGENT?: CreatorAgentBinding;
}

const SERVER_NAME = 'bettermode-marketplace-creator';
const SERVER_VERSION = '0.3.0';

const TOOL_NAMES = [
  'fetch_post_thread',
  'get_creator_context',
  'list_recent_approved_drafts',
  'get_draft_status',
  'list_response_queue',
  'save_draft',
  'dismiss_queue_item',
  'get_queue_health',
  'list_queue_history',
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

// Private API for the response-queue dashboard. A named entrypoint has no
// public URL: only a Worker in this account with a service binding to it can
// call it. The caller (the Template Review MCP) signs the person in and
// decides who may write. This class does no access check of its own.
export class QueueApi extends WorkerEntrypoint<Env> {
  async listQueue(input?: { limit?: number }) {
    const limit = Math.min(Math.max(Math.trunc(input?.limit ?? 50), 1), 100);
    const items = await listResponseQueue(this.env.DB, limit);
    return { count: items.length, items };
  }

  async getThread(input: { postId: string }) {
    return loadQueueThread(this.env, String(input?.postId || ''));
  }

  async health() {
    return getQueueHealth(this.env.DB);
  }

  async history(input?: { limit?: number }) {
    const limit = Math.min(Math.max(Math.trunc(input?.limit ?? 30), 1), 100);
    const items = await listQueueHistory(this.env.DB, limit);
    return { count: items.length, items };
  }

  async saveDraft(input: { postId: string; draft: string; note?: string | null }) {
    return saveAgentDraft(this.env.DB, String(input?.postId || ''), String(input?.draft || ''), input?.note ?? null);
  }

  async dismiss(input: { postId: string; reason: string }) {
    return dismissQueueItem(this.env.DB, String(input?.postId || ''), String(input?.reason || ''));
  }

  // Posts the reply in the community. The text sent is the text given here,
  // so the caller passes what the person saw when they pressed Send.
  async sendDraft(input: { postId: string; draft: string; requestedBy?: string | null }) {
    if (!this.env.CREATOR_AGENT) {
      return { ok: false as const, error: 'Send is not connected: the CREATOR_AGENT binding is missing.' };
    }
    return this.env.CREATOR_AGENT.sendDraft({
      postId: String(input?.postId || ''),
      draftText: String(input?.draft || ''),
      requestedBy: input?.requestedBy ?? null,
    });
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
            description: 'Bettermode + Airtable reads and response-queue drafting for the Marketplace Creators space',
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
