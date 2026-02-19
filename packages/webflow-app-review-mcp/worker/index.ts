import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { OAuthProvider, type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { enableTelemetry, type D1Database } from '@create-something/mcp-core';

import { AirtableClient } from '../src/airtable.js';
import { registerPrompts } from '../src/prompts.js';
import { registerResources } from '../src/resources.js';
import { DEFAULT_AIRTABLE_BASE_ID } from '../src/schema.js';
import { registerTools } from '../src/tools.js';

const MCP_ROUTE = '/mcp';
const SSE_ROUTE = '/sse';
const HEALTH_ROUTE = '/health';
const AUTHORIZE_ROUTE = '/authorize';
const OAUTH_TOKEN_ROUTE = '/oauth/token';
const OAUTH_REGISTER_ROUTE = '/oauth/register';
const DEFAULT_OAUTH_USER_ID = 'webflow-app-review-user';
const DEFAULT_SHARED_OAUTH_CLIENT_NAME = 'App Review Shared Client';
const SHARED_OAUTH_GRANT_TYPES = ['authorization_code', 'refresh_token'];
const SHARED_OAUTH_RESPONSE_TYPES = ['code'];

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  OAUTH_KV: KVNamespace;
  TELEMETRY_DB?: D1Database;
  OAUTH_PROVIDER?: OAuthHelpers;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  MCP_API_KEY?: string;
  OAUTH_USER_ID?: string;
  SHARED_OAUTH_CLIENT_ID?: string;
  SHARED_OAUTH_CLIENT_SECRET?: string;
  SHARED_OAUTH_CLIENT_NAME?: string;
}

function requireEnv(env: Env, key: keyof Env): string {
  const value = env[key];
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value;
}

export class WebflowAppReviewMCP extends McpAgent<Env> {
  server = new McpServer({
    name: 'webflow-app-review-mcp',
    version: '1.0.0',
  });

  async init() {
    if (this.env.TELEMETRY_DB) {
      enableTelemetry(this.server, this.env.TELEMETRY_DB as any, 'webflow-app-review-mcp');
    }

    const client = new AirtableClient({
      apiKey: requireEnv(this.env, 'AIRTABLE_API_KEY'),
      baseId: this.env.AIRTABLE_BASE_ID ?? DEFAULT_AIRTABLE_BASE_ID,
    });

    registerResources(this.server, () => client);
    registerTools(this.server, () => client);
    registerPrompts(this.server);
  }
}

interface StoredOAuthClient {
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  clientName?: string;
  grantTypes?: string[];
  responseTypes?: string[];
  registrationDate?: number;
  tokenEndpointAuthMethod: string;
}

function hasSharedClientCredentials(env: Env): boolean {
  return Boolean(env.SHARED_OAUTH_CLIENT_ID?.trim() && env.SHARED_OAUTH_CLIENT_SECRET?.trim());
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureSharedOAuthClient(env: Env, redirectUri: string): Promise<void> {
  const clientId = env.SHARED_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.SHARED_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return;
  }

  const key = `client:${clientId}`;
  const existing = await env.OAUTH_KV.get<StoredOAuthClient>(key, { type: 'json' });
  const secretHash = await sha256Hex(clientSecret);
  const redirectUris = Array.from(new Set([
    ...(existing?.redirectUris ?? []),
    redirectUri,
  ]));

  const clientName = env.SHARED_OAUTH_CLIENT_NAME?.trim()
    || existing?.clientName
    || DEFAULT_SHARED_OAUTH_CLIENT_NAME;
  const registrationDate = existing?.registrationDate ?? Math.floor(Date.now() / 1000);
  const record: StoredOAuthClient = {
    clientId,
    clientSecret: secretHash,
    redirectUris,
    clientName,
    grantTypes: SHARED_OAUTH_GRANT_TYPES,
    responseTypes: SHARED_OAUTH_RESPONSE_TYPES,
    registrationDate,
    tokenEndpointAuthMethod: 'client_secret_basic',
  };

  const existingRedirectUris = existing?.redirectUris ?? [];
  const redirectsMatch = existingRedirectUris.length === redirectUris.length
    && existingRedirectUris.every((uri) => redirectUris.includes(uri));
  const shouldWrite = !existing
    || existing.clientSecret !== secretHash
    || existing.clientName !== clientName
    || existing.tokenEndpointAuthMethod !== 'client_secret_basic'
    || !redirectsMatch;
  if (!shouldWrite) {
    return;
  }

  await env.OAUTH_KV.put(key, JSON.stringify(record));
}

function isMcpPath(pathname: string): boolean {
  return pathname === MCP_ROUTE || pathname.startsWith(`${MCP_ROUTE}/`);
}

function isSsePath(pathname: string): boolean {
  return pathname === SSE_ROUTE || pathname.startsWith(`${SSE_ROUTE}/`);
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return withCors(new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  }));
}

async function handleMcpOrSseRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (isMcpPath(url.pathname)) {
    return WebflowAppReviewMCP.serve(MCP_ROUTE).fetch(request, env, ctx);
  }
  if (isSsePath(url.pathname)) {
    return WebflowAppReviewMCP.serve(SSE_ROUTE).fetch(request, env, ctx);
  }
  return new Response('Not found', { status: 404 });
}

const oauthApiHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleMcpOrSseRequest(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;

const defaultHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const usingSharedClient = hasSharedClientCredentials(env);

    if (url.pathname === AUTHORIZE_ROUTE) {
      if (!env.OAUTH_PROVIDER) {
        return jsonResponse({
          ok: false,
          error: {
            code: 'OAUTH_PROVIDER_UNAVAILABLE',
            message: 'OAuth provider helpers were not initialized.',
          },
        }, 500);
      }

      try {
        if (usingSharedClient) {
          const expectedClientId = env.SHARED_OAUTH_CLIENT_ID?.trim();
          const requestedClientId = url.searchParams.get('client_id')?.trim();
          const requestedRedirectUri = url.searchParams.get('redirect_uri')?.trim();

          if (!expectedClientId || requestedClientId !== expectedClientId) {
            return jsonResponse({
              ok: false,
              error: {
                code: 'OAUTH_CLIENT_NOT_ALLOWED',
                message: 'Client is not allowed for this protected App Review connector.',
              },
            }, 401);
          }
          if (!requestedRedirectUri) {
            return jsonResponse({
              ok: false,
              error: {
                code: 'OAUTH_REDIRECT_URI_REQUIRED',
                message: 'Missing redirect_uri for OAuth authorization request.',
              },
            }, 400);
          }
          await ensureSharedOAuthClient(env, requestedRedirectUri);
        }

        const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
        const clientInfo = await env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);
        const userId = env.OAUTH_USER_ID ?? DEFAULT_OAUTH_USER_ID;

        const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
          request: oauthReqInfo,
          userId,
          metadata: {
            approved_at: new Date().toISOString(),
            client_id: oauthReqInfo.clientId,
            client_name: clientInfo?.clientName ?? null,
          },
          scope: oauthReqInfo.scope,
          props: {
            authType: 'oauth',
            userId,
            clientId: oauthReqInfo.clientId,
            clientName: clientInfo?.clientName ?? null,
          },
        });

        return Response.redirect(redirectTo, 302);
      } catch (error) {
        return jsonResponse({
          ok: false,
          error: {
            code: 'OAUTH_AUTHORIZATION_FAILED',
            message: error instanceof Error ? error.message : 'Failed to complete OAuth authorization.',
          },
        }, 400);
      }
    }

    if (url.pathname === '/' || url.pathname === HEALTH_ROUTE) {
      return jsonResponse({
        name: 'webflow-app-review-mcp',
        version: '1.1.0',
        description: 'Webflow App Review MCP with OAuth and optional legacy API-key auth',
        endpoints: {
          mcp: MCP_ROUTE,
          sse: SSE_ROUTE,
          health: HEALTH_ROUTE,
          oauth_authorize: AUTHORIZE_ROUTE,
          oauth_token: OAUTH_TOKEN_ROUTE,
          ...(usingSharedClient ? {} : { oauth_register: OAUTH_REGISTER_ROUTE }),
          oauth_metadata: '/.well-known/oauth-authorization-server',
        },
        auth: {
          oauth: 'OAuth 2.1 (authorization code + PKCE)',
          legacy_api_key: Boolean(env.MCP_API_KEY),
          oauth_mode: usingSharedClient ? 'shared-client-secret' : 'dynamic-registration',
          shared_client_id: usingSharedClient ? env.SHARED_OAUTH_CLIENT_ID : null,
        },
      });
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
} satisfies ExportedHandler<Env>;

function createOAuthProvider(enableDynamicRegistration: boolean): OAuthProvider {
  return new OAuthProvider({
    apiRoute: [MCP_ROUTE, SSE_ROUTE],
    apiHandler: oauthApiHandler,
    defaultHandler,
    authorizeEndpoint: AUTHORIZE_ROUTE,
    tokenEndpoint: OAUTH_TOKEN_ROUTE,
    ...(enableDynamicRegistration ? { clientRegistrationEndpoint: OAUTH_REGISTER_ROUTE } : {}),
    accessTokenTTL: 60 * 60,
    refreshTokenTTL: 60 * 60 * 24 * 30,
    allowImplicitFlow: false,
    // Keep Codex and other existing clients working while new OAuth clients migrate.
    resolveExternalToken: ({ token, env }): { props: Record<string, unknown> } | null => {
      if (!env?.MCP_API_KEY || token !== env.MCP_API_KEY) {
        return null;
      }
      return {
        props: {
          authType: 'legacy-api-key',
          userId: 'mcp-api-key',
          clientId: 'legacy-static-token',
        },
      };
    },
  });
}

const oauthProviderWithDynamicRegistration = createOAuthProvider(true);
const oauthProviderWithSharedClient = createOAuthProvider(false);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (hasSharedClientCredentials(env)) {
      return oauthProviderWithSharedClient.fetch(request, env, ctx);
    }
    return oauthProviderWithDynamicRegistration.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
