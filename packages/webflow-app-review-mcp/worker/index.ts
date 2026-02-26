import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { AirtableClient } from '../src/airtable.js';
import { DEFAULT_AIRTABLE_BASE_ID } from '../src/schema.js';
import { registerPrompts } from '../src/prompts.js';
import { registerResources } from '../src/resources.js';
import { registerTools } from '../src/tools.js';
import {
  handleDiscovery,
  handleAuthorize,
  handleToken,
  validateOAuthToken,
  type OAuthConfig,
} from './oauth.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  OAUTH_KV: KVNamespace;
  /** Set via wrangler vars — the client_id distributed to the team */
  SHARED_OAUTH_CLIENT_ID: string;
  /** Set via wrangler secret — the shared client_secret */
  SHARED_OAUTH_CLIENT_SECRET: string;
  /** Set via wrangler secret — comma-separated allowed redirect hosts */
  SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
}

function getOAuthConfig(env: Env, issuer: string): OAuthConfig {
  return {
    clientId: env.SHARED_OAUTH_CLIENT_ID,
    clientSecret: env.SHARED_OAUTH_CLIENT_SECRET,
    allowedRedirectHosts: (env.SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
    issuer,
    kv: env.OAUTH_KV,
  };
}

export class WebflowAppReviewMCP extends McpAgent<Env> {
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const issuer = `${url.protocol}//${url.host}`;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // OAuth discovery
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return handleDiscovery(issuer);
    }

    // OAuth authorization
    if (url.pathname === '/authorize') {
      return handleAuthorize(request, getOAuthConfig(env, issuer));
    }

    // OAuth token exchange
    if (url.pathname === '/token') {
      return handleToken(request, getOAuthConfig(env, issuer));
    }

    // MCP endpoint — requires valid OAuth Bearer token
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = await validateOAuthToken(request, env.OAUTH_KV);
      if (authError) return authError;
      return WebflowAppReviewMCP.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE endpoint (legacy) — requires valid OAuth Bearer token
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = await validateOAuthToken(request, env.OAUTH_KV);
      if (authError) return authError;
      return WebflowAppReviewMCP.serve('/sse').fetch(request, env, ctx);
    }

    // Health / info
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            name: 'webflow-app-review-mcp',
            version: '1.0.0',
            description:
              'Webflow App Review MCP — Airtable-scoped review workflows for Assets + Asset Versions',
            auth: {
              oauth_mode: 'shared-client-secret',
              shared_client_configured: Boolean(
                env.SHARED_OAUTH_CLIENT_ID && env.SHARED_OAUTH_CLIENT_SECRET,
              ),
              legacy_api_key: false,
            },
            endpoints: {
              mcp: '/mcp',
              sse: '/sse',
              authorize: '/authorize',
              token: '/token',
              discovery: '/.well-known/oauth-authorization-server',
            },
            tables: {
              assets: 'tblRwzpWoLgE9MrUm',
              assetVersions: 'tblHxZ2hgSFLZxsZu',
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
