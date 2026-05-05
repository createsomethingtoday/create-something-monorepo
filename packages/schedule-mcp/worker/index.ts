/**
 * Schedule MCP Server — Cloudflare Worker
 *
 * Shared scheduling with backfill/forecast, deployed as a remote MCP server.
 * Uses all three MCP primitives (Resources, Tools, Prompts) aligned to the
 * Three-Tier Framework (Database, Automation, Judgment).
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport (Claude Code, Codex)
 *   /sse  — SSE fallback transport (Cursor, ChatGPT, Claude Desktop)
 *   /, /health — Health/info JSON
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Calendars, events, members, units, plans
 *   Automation tier (Tools)     — CRUD, backfill, forecast, conflicts, iCal + sampling feedback
 *   Judgment tier (Prompts)     — Schedule analysis, conflict resolution, optimization
 *
 * Cross-Cutting Concerns:
 *   Touchpoints  — /mcp, /sse, / endpoints
 *   Artifacts    — Events, calendars, plans as typed payloads
 *   Insight      — tracedTool wrappers, sampling traces, structured telemetry
 *   Orchestration — apply_plan (backfill + forecast composition)
 *
 * Recursive Property (Sampling):
 *   Tools with heuristic outputs (find_conflicts, apply_plan, export_ical)
 *   can request LLM judgment via MCP sampling — Automation requesting Judgment.
 *   Gracefully degrades when clients don't support sampling.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';
import { z } from 'zod';

// MCP primitive registration functions
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';
import type { D1Database } from '../src/db/queries.js';

// Insight (cross-cutting concern)
import {
  configureInsight,
  traceSamplingRequest,
  traceSamplingResponse,
  generateTraceId,
} from '../src/insight.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  DB: D1Database;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  /** Optional API key for authenticating remote MCP clients */
  MCP_API_KEY?: string;
}

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Validate API key from Bearer token or X-API-Key header.
 * Returns null if auth passes, or an error Response if it fails.
 * When MCP_API_KEY is not set, auth is bypassed (development mode).
 */
function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) return null; // No key configured — open access (dev mode)

  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : apiKeyHeader;

  if (!token || token !== env.MCP_API_KEY) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Valid API key required. Set Bearer token or X-API-Key header.',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return null;
}

// =============================================================================
// MCP Agent — Durable Object with all three primitives + sampling
//
// Architecture Decision: McpAgent (stateful DO) is intentionally retained
// over createMcpHandler (stateless). Reason: Sampling (the recursive property)
// requires a persistent session between the MCP server and client to call
// createMessage(). createMcpHandler is stateless per-request and cannot
// maintain the transport session needed for sampling round-trips.
//
// If sampling is removed in the future, migrate to createMcpHandler for
// reduced cost and latency. See MCP Best Practices Audit (Feb 2026).
// =============================================================================

export class ScheduleMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'schedule-mcp',
    version: '1.0.0',
    icons: [{
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTggMnY0Ii8+PHBhdGggZD0iTTE2IDJ2NCIvPjxyZWN0IHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgeD0iMyIgeT0iNCIgcng9IjIiLz48cGF0aCBkPSJNMyAxMGgxOCIvPjwvZz48L3N2Zz4=',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    }],
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as any,
        'schedule-mcp',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
        {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: 'schedule-mcp',
        projectId: (this.env as any).BRAINTRUST_PROJECT_ID,
        },
      );
    }

    // Configure Insight for Worker mode (logs to console → wrangler tail)
    configureInsight({
      enabled: true,
      logToStderr: true,
    });

    // Lazy accessor for D1 — resolved at handler execution time
    const getDb = () => this.env.DB;

    // Database tier (Resources)
    registerResources(this.server, getDb);

    // Automation tier (Tools) — with sampling feedback loop
    registerTools(this.server, getDb, this.requestSampling.bind(this));

    // Judgment tier (Prompts)
    registerPrompts(this.server);
  }

  // ===========================================================================
  // Sampling Feedback Loop — The Recursive Property
  // ===========================================================================

  /**
   * Request LLM judgment on a tool's heuristic output via MCP sampling.
   *
   * This is the recursive property in action: Automation requesting Judgment.
   * The tool encounters data in the Database and needs judgment to provide
   * richer output — so it asks via the client's LLM.
   *
   * Gracefully degrades: if the client doesn't support sampling, returns null
   * and the tool returns the raw heuristic result.
   */
  private async requestSampling(
    toolName: string,
    input: string,
    heuristicResult: unknown,
  ): Promise<{ validated: boolean; refinement: string } | null> {
    const traceId = generateTraceId();

    // Insight: trace the sampling request
    traceSamplingRequest(toolName, traceId, input);

    try {
      const response = await (this.server as any).server.createMessage({
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `The ${toolName} tool produced this result:\n\n${JSON.stringify(heuristicResult, null, 2)}\n\nQuestion: ${input}\n\nProvide a brief assessment. Reply with "VALID" if the result looks correct, or explain any issues or recommendations.`,
          },
        }],
        systemPrompt: 'You are reviewing scheduling data produced by the Schedule MCP server. Be concise and actionable. Reply with "VALID" if the output is correct, or briefly explain corrections/recommendations needed.',
        maxTokens: 300,
        includeContext: 'thisServer' as const,
      });

      const text = typeof response.content === 'object' && 'text' in response.content
        ? response.content.text
        : String(response.content);
      const validated = text.toUpperCase().includes('VALID');

      // Insight: trace the sampling response
      traceSamplingResponse(toolName, traceId, validated);

      return { validated, refinement: text };
    } catch {
      // Client doesn't support sampling, or request failed — graceful degradation
      traceSamplingResponse(toolName, traceId, false, { error: 'sampling_unavailable' });
      return null;
    }
  }
}

// =============================================================================
// Worker Entry Point
// =============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // CORS preflight — allow before auth check
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Authenticate MCP endpoints
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') ||
        url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
    }

    // Streamable HTTP transport (Claude Code, Codex)
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return ScheduleMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE fallback transport (Cursor, ChatGPT, Claude Desktop)
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return ScheduleMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Health / info endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'schedule-mcp',
        version: '1.1.0',
        description: 'Schedule MCP — shared scheduling with backfill, forecast, conflict detection, and sampling feedback',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — Claude Code, Codex)',
          sse: '/sse (SSE — Cursor, ChatGPT, Claude Desktop)',
        },
        capabilities: {
          resources: '5 URIs (Database tier — calendars, members, units, plans, events-this-week)',
          tools: '30 tools (Automation tier — diagnostics, list/read, full CRUD, scheduling, interop, notifications)',
          prompts: '3 prompts (Judgment tier — analysis, conflict resolution, optimization)',
          sampling: '3 tools use sampling (Recursive property — find_conflicts, apply_plan, export_ical)',
        },
        framework: {
          database: 'D1-backed persistence for schedules, events, members, units, plans',
          automation: 'Plan-based backfill/forecast, RFC 5545 RRULE, conflict detection',
          judgment: 'Schedule analysis, conflict resolution, optimization prompts',
          recursive_property: 'Tools request LLM judgment via MCP sampling — Automation requesting Judgment',
          insight: 'Structured telemetry: tool traces, resource reads, sampling events',
        },
        cross_cutting: {
          touchpoints: '/mcp, /sse, / — MCP server surface',
          artifacts: 'Events, calendars, plans, conflicts, availability slots (Zod-validated)',
          orchestration: 'apply_plan composes backfill + forecast; cron triggers planned',
          insight: 'tracedTool wrappers, sampling request/response traces, event buffer',
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
