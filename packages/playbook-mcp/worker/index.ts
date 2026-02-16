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
import { runHalfDozenFleetWatchdog, type FleetWatchdogRunInput } from './halfdozenFleetWatchdog.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  OPENAI_API_KEY?: string;
  HALFDOZEN_AGENT_ROUTE_TOKEN?: string;
  HALFDOZEN_TELEMETRY_MCP_URL?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const HALFDOZEN_FLEET_WATCHDOG_ROUTE = '/clients/halfdozen/agents/fleet-watchdog/run';

const FleetWatchdogRouteBodySchema = z.object({
  query: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  max_turns: z.number().int().min(1).max(30).optional(),
  timeout_ms: z.number().int().min(1_000).max(120_000).optional(),
});

type FleetWatchdogRouteBody = z.infer<typeof FleetWatchdogRouteBodySchema>;

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

async function parseFleetWatchdogBody(request: Request): Promise<FleetWatchdogRouteBody> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  const raw = await request.text();
  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  return FleetWatchdogRouteBodySchema.parse(parsed);
}

// =============================================================================
// MCP Agent
// =============================================================================

export class PlaybookMCP extends McpAgent<Env> {
  server: any = new McpServer({
    name: 'playbook',
    version: '1.2.0',
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

    if (url.pathname === HALFDOZEN_FLEET_WATCHDOG_ROUTE) {
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

      let body: FleetWatchdogRouteBody = {};
      try {
        body = await parseFleetWatchdogBody(request);
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

      const runInput: FleetWatchdogRunInput = {
        openaiApiKey: env.OPENAI_API_KEY,
        telemetryMcpUrl: env.HALFDOZEN_TELEMETRY_MCP_URL,
        query: body.query,
        model: body.model,
        maxTurns: body.max_turns,
        timeoutMs: body.timeout_ms,
      };

      try {
        const result = await runHalfDozenFleetWatchdog(runInput);
        return jsonResponse(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return jsonResponse(
          {
            success: false,
            scenario: 'fleet-watchdog',
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
        version: '1.2.0',
        description: 'Host workflow playbooks and installation guidance for MCP onboarding',
        hosts: HOST_PLAYBOOKS.map((p) => p.name),
        catalogEntries: MCP_CATALOG.length,
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          halfdozen_fleet_watchdog: HALFDOZEN_FLEET_WATCHDOG_ROUTE,
        },
        protectedRoutes: [HALFDOZEN_FLEET_WATCHDOG_ROUTE],
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
