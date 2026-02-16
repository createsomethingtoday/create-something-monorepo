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
import { enableTelemetry } from '@create-something/mcp-core';
import { z } from 'zod';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';
import { HOST_PLAYBOOKS } from '../src/playbooks.js';
import { MCP_CATALOG } from '../src/catalog.js';
import {
  runHalfDozenDedup,
  runHalfDozenFleetWatchdog,
  runHalfDozenInboxTriage,
} from './halfdozenFleetWatchdog.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  OPENAI_API_KEY?: string;
  HALFDOZEN_AGENT_ROUTE_TOKEN?: string;
  HALFDOZEN_TELEMETRY_MCP_URL?: string;
  HALFDOZEN_GMAIL_MCP_URL?: string;
  HALFDOZEN_NOTION_MCP_URL?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const HALFDOZEN_FLEET_WATCHDOG_ROUTE = '/clients/halfdozen/agents/fleet-watchdog/run';
const HALFDOZEN_INBOX_TRIAGE_ROUTE = '/clients/halfdozen/agents/inbox-triage/run';
const HALFDOZEN_DEDUP_ROUTE = '/clients/halfdozen/agents/dedup/run';

const HALFDOZEN_PROTECTED_ROUTES = [
  HALFDOZEN_FLEET_WATCHDOG_ROUTE,
  HALFDOZEN_INBOX_TRIAGE_ROUTE,
  HALFDOZEN_DEDUP_ROUTE,
] as const;

const AgentRouteBodySchema = z.object({
  query: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  max_turns: z.number().int().min(1).max(30).optional(),
  timeout_ms: z.number().int().min(1_000).max(120_000).optional(),
});

type AgentRouteBody = z.infer<typeof AgentRouteBodySchema>;

type HalfDozenRouteRunInput = {
  openaiApiKey: string;
  telemetryMcpUrl?: string;
  gmailMcpUrl?: string;
  notionMcpUrl?: string;
  query?: string;
  model?: string;
  maxTurns?: number;
  timeoutMs?: number;
};

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  const apiKey = request.headers.get('X-API-Key')?.trim();
  return apiKey && apiKey.length > 0 ? apiKey : null;
}

function validateRouteToken(request: Request, expectedToken?: string): Response | null {
  if (!expectedToken) {
    return jsonResponse(
      {
        success: false,
        error: 'Server misconfigured: HALFDOZEN_AGENT_ROUTE_TOKEN is not set.',
      },
      500,
    );
  }

  const actualToken = getAuthToken(request);
  if (!actualToken || actualToken !== expectedToken) {
    return jsonResponse(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Valid Bearer token or X-API-Key header is required.',
      },
      401,
      { 'WWW-Authenticate': 'Bearer realm="playbook-halfdozen"' },
    );
  }

  return null;
}

function isHalfDozenScenarioRoute(pathname: string): pathname is (typeof HALFDOZEN_PROTECTED_ROUTES)[number] {
  return (HALFDOZEN_PROTECTED_ROUTES as readonly string[]).includes(pathname);
}

async function parseAgentRouteBody(request: Request): Promise<AgentRouteBody> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  const raw = await request.text();
  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  return AgentRouteBodySchema.parse(parsed);
}

// =============================================================================
// MCP Agent
// =============================================================================

export class PlaybookMCP extends McpAgent<Env> {
  server: any = new McpServer({
    name: 'playbook',
    version: '1.3.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, 'playbook');
    }

    registerResources(this.server);
    registerTools(this.server);
    registerPrompts(this.server);
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (isHalfDozenScenarioRoute(url.pathname)) {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            ...JSON_HEADERS,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      if (request.method !== 'POST') {
        return jsonResponse(
          {
            success: false,
            error: 'Method not allowed',
            message: 'Use POST for this endpoint.',
          },
          405,
          { Allow: 'POST, OPTIONS' },
        );
      }

      const authError = validateRouteToken(request, env.HALFDOZEN_AGENT_ROUTE_TOKEN);
      if (authError) {
        return authError;
      }

      if (!env.OPENAI_API_KEY) {
        return jsonResponse(
          {
            success: false,
            error: 'Server misconfigured: OPENAI_API_KEY is not set.',
          },
          500,
        );
      }

      let body: AgentRouteBody = {};
      try {
        body = await parseAgentRouteBody(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            error: 'Invalid request body',
            message,
          },
          400,
        );
      }

      const baseInput: HalfDozenRouteRunInput = {
        openaiApiKey: env.OPENAI_API_KEY,
        telemetryMcpUrl: env.HALFDOZEN_TELEMETRY_MCP_URL,
        gmailMcpUrl: env.HALFDOZEN_GMAIL_MCP_URL,
        notionMcpUrl: env.HALFDOZEN_NOTION_MCP_URL,
        query: body.query,
        model: body.model,
        maxTurns: body.max_turns,
        timeoutMs: body.timeout_ms,
      };

      try {
        if (url.pathname === HALFDOZEN_FLEET_WATCHDOG_ROUTE) {
          const result = await runHalfDozenFleetWatchdog(baseInput);
          return jsonResponse(result);
        }

        if (url.pathname === HALFDOZEN_INBOX_TRIAGE_ROUTE) {
          const result = await runHalfDozenInboxTriage(baseInput);
          return jsonResponse(result);
        }

        const result = await runHalfDozenDedup(baseInput);
        return jsonResponse(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const scenario =
          url.pathname === HALFDOZEN_FLEET_WATCHDOG_ROUTE
            ? 'fleet-watchdog'
            : url.pathname === HALFDOZEN_INBOX_TRIAGE_ROUTE
              ? 'inbox-triage'
              : 'dedup';
        return jsonResponse(
          {
            success: false,
            scenario,
            error: message,
          },
          500,
        );
      }
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/'))
      return PlaybookMCP.serve('/mcp').fetch(request, env, ctx);
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/'))
      return PlaybookMCP.serve('/sse').fetch(request, env, ctx);

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: 'playbook',
        version: '1.3.0',
        description: 'Host workflow playbooks and installation guidance for MCP onboarding',
        hosts: HOST_PLAYBOOKS.map((p) => p.name),
        catalogEntries: MCP_CATALOG.length,
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          halfdozen_fleet_watchdog: HALFDOZEN_FLEET_WATCHDOG_ROUTE,
          halfdozen_inbox_triage: HALFDOZEN_INBOX_TRIAGE_ROUTE,
          halfdozen_dedup: HALFDOZEN_DEDUP_ROUTE,
        },
        protectedRoutes: HALFDOZEN_PROTECTED_ROUTES,
        tools: [
          'get_playbook',
          'compare_hosts',
          'get_folder_structure',
          'detect_host',
          'list_available_mcps',
          'generate_mcp_config',
          'scaffold_project',
          'verify_mcp_connection',
        ],
        resources: 6,
        prompts: ['workflow_setup', 'host_comparison', 'project_structure'],
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
