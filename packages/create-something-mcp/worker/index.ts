/**
 * CREATE SOMETHING Content MCP — Cloudflare Worker
 *
 * The CREATE SOMETHING knowledge base as a remote MCP server.
 * Single entry point to all content across properties.
 *
 * Endpoints:
 *   /mcp  — Streamable HTTP transport (Claude Code, Codex)
 *   /sse  — SSE fallback transport (Cursor, legacy clients)
 *   /     — Health/info JSON
 *
 * Architecture (demonstrates the Three-Tier Framework):
 *   Database (Resources)  — Papers, Canon, Patterns, Masters, Framework, Graph, Praxis, Products
 *   Automation (Tools)    — Search, Relate, Classify, Apply Triad, Audit Design
 *   Judgment (Prompts)    — Architecture Review, Design Review, Triad Analysis, MCP Design, Research Dive
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';

// Content counts
import { PAPERS } from '../src/content/generated/papers.js';
import { CANON_PAGES } from '../src/content/generated/canon.js';
import { CANON_REGISTRY_MANIFEST } from '../src/content/generated/canon-registry.js';
import { PATTERNS } from '../src/content/generated/patterns.js';
import { GRAPH_NODES, GRAPH_EDGES } from '../src/content/generated/graph.js';
import { MASTERS } from '../src/content/masters.js';
import { PRAXIS_EXERCISES } from '../src/content/praxis.js';
import { PRODUCTS } from '../src/content/products.js';

// =============================================================================
// Types
// =============================================================================

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
}

// =============================================================================
// MCP Agent — Durable Object with all three primitives
// =============================================================================

export class CreateSomethingMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'create-something',
    version: '1.0.0',
  });

  async init() {
    // Telemetry: meter all tool calls + register health/usage resources
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as any,
        'create-something',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
        {
        publicKey: (this.env as any).LANGFUSE_PUBLIC_KEY,
        secretKey: (this.env as any).LANGFUSE_SECRET_KEY,
        projectName: 'create-something',
        },
      );
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

    // Streamable HTTP transport (Claude Code, Codex)
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return CreateSomethingMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE fallback transport (Cursor, legacy clients)
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return CreateSomethingMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Health / info endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        name: 'create-something',
        version: '1.0.0',
        description: 'The CREATE SOMETHING Content MCP — a single entry point to all philosophy, research, design system, and practices',
        endpoints: {
          mcp: '/mcp (Streamable HTTP — Claude Code, Codex)',
          sse: '/sse (SSE — Cursor, legacy clients)',
        },
        content: {
          papers: PAPERS.length,
          canon_pages: CANON_PAGES.length,
          canon_registry_items: CANON_REGISTRY_MANIFEST.items.length,
          patterns: PATTERNS.length,
          masters: MASTERS.length,
          graph_nodes: GRAPH_NODES.length,
          graph_edges: GRAPH_EDGES.length,
          praxis_exercises: PRAXIS_EXERCISES.length,
          products: PRODUCTS.length,
        },
        capabilities: {
          resources: `${PAPERS.length + CANON_PAGES.length + CANON_REGISTRY_MANIFEST.items.length + PATTERNS.length + MASTERS.length + 13 + 2 + 1 + 1} URIs (Database tier)`,
          tools: '11 tools (Automation tier — search, relate, classify, apply_triad, audit_design, canon_registry_search, canon_registry_get, canon_template_get, canon_extension_route, canon_overlay_review, canon_overlay_instantiate_preview)',
          prompts: '5 prompts (Judgment tier — architecture_review, design_review, triad_analysis, mcp_design, research_dive)',
        },
        properties: {
          'io': 'Research papers and knowledge graph',
          'ltd': 'Canon design system, patterns, and masters',
          'space': 'Praxis exercises and interactive tools',
          'agency': 'Products and services',
          'framework': 'Three-Tier Framework definitions and mappings'
        },
        links: {
          philosophy: 'https://createsomething.ltd',
          research: 'https://createsomething.io',
          workbench: 'https://createsomething.space',
          services: 'https://createsomething.agency'
        }
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
