import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID, TABLE_IDS } from '../src/schema.js';
import { registerPrompts } from '../src/prompts.js';
import { registerResources } from '../src/resources.js';
import { parseReviewerDirectory, getReviewerProfileForAccount } from '../src/reviewer-directory.js';
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  REVIEWER_DIRECTORY_JSON?: string;
  WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL?: string;
  GSAP_VALIDATION_WORKER_URL?: string;
  TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS?: string;
}

type RequestProps = {
  accountId?: string;
};

export function validateApiKey(request: Request, env: Env): Response | null {
  if (!env.MCP_API_KEY) {
    return misconfiguredResponse('MCP_API_KEY is not configured for this deployment.');
  }
  return validateBearerToken(request, env.MCP_API_KEY);
}

export class WebflowTemplateReviewMCP extends McpAgent<Env, unknown, RequestProps> {
  server = new McpServer({
    name: 'webflow-template-review-mcp',
    version: '1.0.0',
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-template-review-mcp',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
      );
    }

    const getClient = () => {
      if (!this.env.AIRTABLE_API_KEY) {
        throw new Error('Missing AIRTABLE_API_KEY environment variable.');
      }
      return new AirtableClient({
        apiKey: this.env.AIRTABLE_API_KEY,
        baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
      });
    };

    const reviewerDirectory = parseReviewerDirectory(this.env.REVIEWER_DIRECTORY_JSON);
    const getReviewer = () => getReviewerProfileForAccount(reviewerDirectory, this.props?.accountId ?? null);

    registerResources(this.server, getClient, getReviewer);
    registerTools(this.server, getClient, getReviewer, {
      webflowValidationWorkerUrl: this.env.WEBFLOW_TEMPLATE_VALIDATION_WORKER_URL,
      gsapValidationWorkerUrl: this.env.GSAP_VALIDATION_WORKER_URL,
      timeoutMs: this.env.TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS ? Number(this.env.TEMPLATE_REVIEW_VALIDATION_TIMEOUT_MS) : undefined,
    });
    registerPrompts(this.server);
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
      const accountId = request.headers.get('x-mcp-account-id') ?? request.headers.get('x-hub-account-id');
      return WebflowTemplateReviewMCP.serve('/mcp').fetch(request, env, {
        ...ctx,
        props: {
          ...(accountId ? { accountId } : {}),
        },
      });
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const accountId = request.headers.get('x-mcp-account-id') ?? request.headers.get('x-hub-account-id');
      return WebflowTemplateReviewMCP.serve('/sse').fetch(request, env, {
        ...ctx,
        props: {
          ...(accountId ? { accountId } : {}),
        },
      });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-template-review-mcp',
            version: '1.0.0',
            description: 'Webflow Template Review MCP — Airtable-scoped review workflows for template Assets + Asset Versions',
            auth: {
              mode: 'Bearer required',
              configured: Boolean(env.MCP_API_KEY),
              header: 'Authorization: Bearer <MCP_API_KEY>',
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
            },
            scope: 'templates-only',
            tables: TABLE_IDS,
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
