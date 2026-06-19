import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID, DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID } from '../src/schema.js';
import { registerPrompts } from '../src/prompts.js';
import { parseReviewerDirectory, getReviewerProfileForAccount } from '../src/reviewer-directory.js';
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  MCP_ACCOUNT_ID?: string;
  MCP_API_KEY?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_GOVERNANCE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_GOVERNANCE_BASE_ID?: string;
  AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID?: string;
  REVIEWER_DIRECTORY_JSON?: string;
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

export class WebflowAppReviewMCP extends McpAgent<Env, unknown, RequestProps> {
  server = new McpServer({
    name: 'webflow-app-review-mcp',
    version: '1.0.0',
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(
        this.server,
        this.env.TELEMETRY_DB as unknown as Parameters<typeof enableTelemetry>[1],
        'webflow-app-review-mcp',
        () => this.env.MCP_ACCOUNT_ID?.trim() || 'operator',
      );
    }

    const getClient = () => {
      if (!this.env.AIRTABLE_API_KEY) {
        throw new Error('Missing AIRTABLE_API_KEY environment variable.');
      }
      return new AirtableClient({
        apiKey: this.env.AIRTABLE_API_KEY,
        governanceApiKey: this.env.AIRTABLE_GOVERNANCE_API_KEY,
        baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
        governanceBaseId: this.env.AIRTABLE_GOVERNANCE_BASE_ID,
        governanceFindingsTableId: this.env.AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID,
      });
    };

    const reviewerDirectory = parseReviewerDirectory(this.env.REVIEWER_DIRECTORY_JSON);
    const getReviewer = () => getReviewerProfileForAccount(reviewerDirectory, this.props?.accountId ?? null);

    registerResources(this.server, getClient, getReviewer);
    registerTools(this.server, getClient, getReviewer);
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
      return WebflowAppReviewMCP.serve('/mcp').fetch(request, env, {
        ...ctx,
        props: {
          ...(accountId ? { accountId } : {}),
        },
      });
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const accountId = request.headers.get('x-mcp-account-id') ?? request.headers.get('x-hub-account-id');
      return WebflowAppReviewMCP.serve('/sse').fetch(request, env, {
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
            name: 'webflow-app-review-mcp',
            version: '1.0.0',
            description: 'Webflow App Review MCP — Airtable-scoped review and governance tracking workflows',
            auth: {
              mode: 'Bearer required',
              configured: Boolean(env.MCP_API_KEY),
              header: 'Authorization: Bearer <MCP_API_KEY>',
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
            },
            tables: {
              assets: 'tblRwzpWoLgE9MrUm',
              assetVersions: 'tblHxZ2hgSFLZxsZu',
              governanceBase: env.AIRTABLE_GOVERNANCE_BASE_ID ?? env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
              governanceFindings: env.AIRTABLE_GOVERNANCE_FINDINGS_TABLE_ID ?? DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID,
            },
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
