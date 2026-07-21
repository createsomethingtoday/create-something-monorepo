import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { misconfiguredResponse, validateBearerToken } from '../src/auth.js';
import { AirtableClient } from '../src/airtable.js';
import {
  cloudflareAccessServePath,
  isCloudflareAccessMcpPath,
  parseAllowedEmails,
  parseReviewerDirectory,
  resolveCloudflareAccessRequest,
} from '../src/cloudflare-access.js';
import { DEFAULT_AIRTABLE_BASE_ID, DEFAULT_GOVERNANCE_FINDINGS_TABLE_ID } from '../src/schema.js';
import { registerPrompts } from '../src/prompts.js';
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
  REVIEWER_AUTH_EMAIL_ALIASES_JSON?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  OAUTH_ALLOWED_EMAIL_DOMAIN?: string;
  OAUTH_ALLOWED_EMAILS?: string;
}

type RequestProps = {
  accountId?: string;
  email?: string;
  name?: string | null;
  authMode?: 'legacy' | 'cloudflare-access';
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
        () => this.props?.accountId ?? this.env.MCP_ACCOUNT_ID?.trim() ?? 'operator',
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

    registerResources(this.server, getClient);
    registerTools(this.server, getClient);
    registerPrompts(this.server);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id',
};

const JSON_HEADERS = { 'Content-Type': 'application/json', ...CORS_HEADERS };

function allowedDomain(env: Env): string {
  return (env.OAUTH_ALLOWED_EMAIL_DOMAIN ?? 'webflow.com').trim().toLowerCase();
}

function accessError(status: 401 | 403, code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: JSON_HEADERS,
  });
}

async function authenticateWithCloudflareAccess(
  request: Request,
  env: Env,
): Promise<{ props: RequestProps } | Response> {
  let directory;
  try {
    directory = parseReviewerDirectory(
      env.REVIEWER_DIRECTORY_JSON,
      env.REVIEWER_AUTH_EMAIL_ALIASES_JSON,
    );
  } catch {
    return misconfiguredResponse('REVIEWER_DIRECTORY_JSON is invalid.');
  }

  const result = await resolveCloudflareAccessRequest({
    request,
    teamDomain: env.CF_ACCESS_TEAM_DOMAIN ?? '',
    audience: env.CF_ACCESS_AUD ?? '',
    allowedDomain: allowedDomain(env),
    allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
    directory,
  });
  if (result.ok === false) {
    if (result.status === 401) return accessError(401, 'UNAUTHORIZED', result.message);
    if (result.status === 403) return accessError(403, 'FORBIDDEN', result.message);
    return misconfiguredResponse(result.message);
  }

  return {
    props: {
      authMode: 'cloudflare-access',
      accountId: result.accountId,
      email: result.email,
      name: result.name,
    },
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (isCloudflareAccessMcpPath(url.pathname)) {
      const basePath = cloudflareAccessServePath(url.pathname);
      const serve = basePath === '/access/sse'
        ? WebflowAppReviewMCP.serveSSE('/access/sse')
        : WebflowAppReviewMCP.serve('/access/mcp');
      const result = await authenticateWithCloudflareAccess(request, env);
      if (result instanceof Response) return result;
      return serve.fetch(request, env, { ...ctx, props: result.props });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/') || url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return WebflowAppReviewMCP.serve('/mcp').fetch(request, env, {
        ...ctx,
        props: {
          authMode: 'legacy' as const,
          ...(env.MCP_ACCOUNT_ID?.trim() ? { accountId: env.MCP_ACCOUNT_ID.trim() } : {}),
        },
      });
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return WebflowAppReviewMCP.serveSSE('/sse').fetch(request, env, {
        ...ctx,
        props: {
          authMode: 'legacy' as const,
          ...(env.MCP_ACCOUNT_ID?.trim() ? { accountId: env.MCP_ACCOUNT_ID.trim() } : {}),
        },
      });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-app-review-mcp',
            version: '1.0.0',
            description: 'Webflow App Review MCP — Airtable-scoped review workflows and governance database access',
            auth: {
              modes: {
                cloudflareAccess: {
                  flow: 'Cloudflare Access Managed OAuth with a signed application assertion',
                  endpoint: '/access/mcp',
                  teamDomain: env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, '') || null,
                  audienceConfigured: Boolean(env.CF_ACCESS_AUD?.trim()),
                  configured: Boolean(env.CF_ACCESS_TEAM_DOMAIN?.trim() && env.CF_ACCESS_AUD?.trim()),
                },
                legacy: {
                  flow: 'Shared bearer token (hub bridges only)',
                  configured: Boolean(env.MCP_API_KEY),
                  header: 'Authorization: Bearer <MCP_API_KEY>',
                },
              },
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
              managedOAuthMcp: '/access/mcp',
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
