import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { AirtableClient } from '../src/airtable.js';
import { validateBearerAuth } from '../src/auth.js';
import { AIRTABLE_BASE_ID_DEFAULT, TABLE_IDS } from '../src/schema.js';
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import { registerPrompts } from '../src/prompts.js';

export interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

export class WebflowTemplateReviewMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'webflow-template-review-mcp',
    version: '1.0.0',
  });

  async init() {
    if (!this.env.AIRTABLE_API_KEY) {
      throw new Error('Missing AIRTABLE_API_KEY secret.');
    }

    const baseId = this.env.AIRTABLE_BASE_ID || AIRTABLE_BASE_ID_DEFAULT;
    const client = new AirtableClient({
      apiKey: this.env.AIRTABLE_API_KEY,
      baseId,
    });

    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, 'webflow-template-review-mcp', undefined, {
        apiKey: (this.env as any).BRAINTRUST_API_KEY,
        projectName: 'webflow-template-review-mcp',
      });
    }

    const context = {
      client,
      authRequired: true,
      baseId,
    };

    registerResources(this.server, context);
    registerTools(this.server, context);
    registerPrompts(this.server);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const protectedPath =
      url.pathname === '/mcp' ||
      url.pathname.startsWith('/mcp/') ||
      url.pathname === '/sse' ||
      url.pathname.startsWith('/sse/');

    if (protectedPath) {
      const authError = validateBearerAuth(request, env);
      if (authError) return authError;
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return WebflowTemplateReviewMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return WebflowTemplateReviewMCP.serve('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: 'webflow-template-review-mcp',
        version: '1.0.0',
        description: 'Webflow Template Review MCP with Airtable-scoped template review workflows',
        endpoints: {
          mcp: '/mcp (auth required: bearer token)',
          sse: '/sse (auth required: bearer token)',
          health: '/ (public)',
        },
        scope: {
          base_id: env.AIRTABLE_BASE_ID || AIRTABLE_BASE_ID_DEFAULT,
          tables: TABLE_IDS,
          template_scope_only: true,
        },
        auth: {
          bearer_header: 'Authorization: Bearer <MCP_API_KEY>',
          configured: Boolean(env.MCP_API_KEY),
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
