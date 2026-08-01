import { resolveRuntimeConfig } from './config.js';
import { langfuseHealth } from './langfuse.js';
import {
  SCOPE_READ,
  SCOPE_WRITE,
  buildProtectedResourceMetadata,
  parseAllowedDomains,
  parseAllowedEmails,
  resolveIdentityOAuthRequest,
} from './oauth-access.js';
import type { Env } from './types.js';

export type RequestProps = {
  accountId?: string;
  email?: string;
  name?: string | null;
  scopes?: string[];
  authMode?: 'legacy' | 'oauth';
};

type ServeMcp = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  props: RequestProps,
) => Promise<Response>;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

function identityIssuer(env: Env): string {
  return env.CS_IDENTITY_ISSUER?.trim().replace(/\/+$/, '') ?? '';
}

function isProtectedResourcePath(pathname: string): boolean {
  return (
    pathname === '/.well-known/oauth-protected-resource'
    || pathname === '/.well-known/oauth-protected-resource/mcp'
    || pathname === '/mcp/.well-known/oauth-protected-resource'
    || pathname === '/mcp/.well-known/oauth-protected-resource/mcp'
  );
}

function isMcpPath(pathname: string): boolean {
  return pathname === '/mcp' || pathname.startsWith('/mcp/');
}

function isLegacyBearer(request: Request, env: Env): boolean {
  if (!env.MCP_API_KEY?.trim()) return false;
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return !!match && match[1] === env.MCP_API_KEY;
}

export function createTicketSyncWorker(serveMcp: ServeMcp) {
  return {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      const issuer = identityIssuer(env);

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      if (isProtectedResourcePath(url.pathname)) {
        if (!issuer) {
          return jsonResponse(
            { ok: false, error: 'CREATE SOMETHING Identity is not configured.' },
            { status: 503 },
          );
        }
        return jsonResponse(buildProtectedResourceMetadata({
          resourceOrigin: url.origin,
          authorizationServer: issuer,
        }));
      }

      if (url.pathname === '/' || url.pathname === '/health') {
        const runtime = resolveRuntimeConfig(env);
        return jsonResponse({
          ok: true,
          worker: runtime.serverName,
          mode: 'operator_mcp',
          endpoints: {
            mcp: '/mcp',
            health: '/health',
            oauth_protected_resource: '/.well-known/oauth-protected-resource',
          },
          auth: {
            oauth: {
              flow: 'OAuth 2.1 + PKCE with Dynamic Client Registration (CREATE SOMETHING Identity)',
              configured: Boolean(issuer),
              allowlist_configured:
                parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS).size > 0
                || parseAllowedDomains(env.OAUTH_ALLOWED_DOMAINS).size > 0,
              authorization_server: issuer || null,
              scopes: [SCOPE_READ, SCOPE_WRITE],
            },
            legacy: {
              flow: 'Shared bearer token (Hub and existing agent clients)',
              configured: Boolean(env.MCP_API_KEY?.trim()),
            },
          },
          config: {
            client: runtime.clientSlug,
            tenant: runtime.tenantSlug,
            client_display_name: runtime.clientDisplayName,
            tool_prefix: runtime.toolPrefix,
            client_source_data_source_configured: Boolean(runtime.sourceDataSourceId || runtime.sourceDataSourceTitle),
            halfdozen_target_data_source_configured: Boolean(env.HALFDOZEN_TICKETS_DATA_SOURCE_ID?.trim() || env.HALFDOZEN_TICKETS_DATABASE_ID?.trim() || env.HALFDOZEN_TICKETS_DATA_SOURCE_TITLE?.trim()),
            client_status_property: runtime.sourceStatusProperty || 'Status',
            client_status_map: runtime.sourceStatusMap,
            langfuse: langfuseHealth(env),
          },
          secrets: {
            mcp_api_key_configured: Boolean(env.MCP_API_KEY?.trim()),
            client_token_configured: Boolean((env.CLIENT_NOTION_API_KEY ?? env.BLONDISH_NOTION_API_KEY)?.trim()),
            halfdozen_token_configured: Boolean(env.HALFDOZEN_NOTION_API_KEY?.trim()),
          },
        });
      }

      if (isMcpPath(url.pathname)) {
        if (isLegacyBearer(request, env)) {
          return serveMcp(request, env, ctx, { authMode: 'legacy' });
        }

        if (!issuer) return legacyUnauthorized();

        const result = await resolveIdentityOAuthRequest({
          request,
          issuer,
          expectedResource: `${url.origin}/mcp`,
          allowedEmails: parseAllowedEmails(env.OAUTH_ALLOWED_EMAILS),
          allowedDomains: parseAllowedDomains(env.OAUTH_ALLOWED_DOMAINS),
        });
        if (result.ok === false) {
          if (result.status === 401) return oauthUnauthorized(url.origin, result.message);
          return jsonResponse(
            { ok: false, error: { code: result.code.toUpperCase(), message: result.message } },
            { status: result.status },
          );
        }

        return serveMcp(request, env, ctx, {
          authMode: 'oauth',
          accountId: result.accountId,
          email: result.email,
          name: result.name,
          scopes: result.scopes,
        });
      }

      return jsonResponse({ ok: false, error: 'Not found', mcp_endpoint: '/mcp' }, { status: 404 });
    },
  };
}

function oauthUnauthorized(origin: string, message: string): Response {
  return jsonResponse(
    { ok: false, error: { code: 'UNAUTHORIZED', message } },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

function legacyUnauthorized(): Response {
  return jsonResponse(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="mcp"' } },
  );
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}
