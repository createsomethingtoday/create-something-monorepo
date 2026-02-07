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
 *   /     — Health/info JSON
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Calendars, events, members, units, templates
 *   Automation tier (Tools)     — CRUD, backfill, forecast, conflicts, iCal + sampling feedback
 *   Judgment tier (Prompts)     — Schedule analysis, conflict resolution, optimization
 *
 * Cross-Cutting Concerns:
 *   Touchpoints  — /mcp, /sse, / endpoints
 *   Artifacts    — Events, calendars, templates as typed payloads
 *   Insight      — tracedTool wrappers, sampling traces, structured telemetry
 *   Orchestration — apply_template (backfill + forecast composition)
 *
 * Recursive Property (Sampling):
 *   Tools with heuristic outputs (find_conflicts, apply_template, export_ical)
 *   can request LLM judgment via MCP sampling — Automation requesting Judgment.
 *   Gracefully degrades when clients don't support sampling.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
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
}

// =============================================================================
// MCP Agent — Durable Object with all three primitives + sampling
// =============================================================================

export class ScheduleMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'schedule-mcp',
    version: '1.0.0',
  });

  async init() {
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

    // Streamable HTTP transport (Claude Code, Codex)
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return ScheduleMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE fallback transport (Cursor, ChatGPT, Claude Desktop)
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return ScheduleMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Health / info endpoint
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'schedule-mcp',
        version: '1.1.0',
        description: 'Schedule MCP — shared scheduling with backfill, forecast, conflict detection, and sampling feedback',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — Claude Code, Codex)',
          sse: '/sse (SSE — Cursor, ChatGPT, Claude Desktop)',
        },
        capabilities: {
          resources: '5 URIs (Database tier — calendars, members, units, templates, events-this-week)',
          tools: '14 tools (Automation tier — CRUD, backfill, forecast, conflicts, availability, iCal)',
          prompts: '3 prompts (Judgment tier — analysis, conflict resolution, optimization)',
          sampling: '3 tools use sampling (Recursive property — find_conflicts, apply_template, export_ical)',
        },
        framework: {
          database: 'D1-backed persistence for schedules, events, members, units, templates',
          automation: 'Template-based backfill/forecast, RFC 5545 RRULE, conflict detection',
          judgment: 'Schedule analysis, conflict resolution, optimization prompts',
          recursive_property: 'Tools request LLM judgment via MCP sampling — Automation requesting Judgment',
          insight: 'Structured telemetry: tool traces, resource reads, sampling events',
        },
        cross_cutting: {
          touchpoints: '/mcp, /sse, / — MCP server surface',
          artifacts: 'Events, calendars, templates, conflicts, availability slots (Zod-validated)',
          orchestration: 'apply_template composes backfill + forecast; cron triggers planned',
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
