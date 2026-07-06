import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { enableTelemetry } from '@create-something/mcp-core';

import { registerPrompts } from '../src/prompts/index.js';
import { registerResources } from '../src/resources/index.js';
import { registerTools } from '../src/tools/index.js';

interface Env {
  MCP_OBJECT: DurableObjectNamespace;
  TELEMETRY_DB?: D1Database;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  MCP_API_KEY?: string;
  ZENDESK_MCP_API_KEY?: string;
  MCP_ACCOUNT_ID?: string;
  WEBFLOW_ZENDESK_SUBDOMAIN?: string;
  ZENDESK_SUBDOMAIN?: string;
  WEBFLOW_ZENDESK_EMAIL?: string;
  ZENDESK_EMAIL?: string;
  WEBFLOW_ZENDESK_API_TOKEN?: string;
  ZENDESK_API_TOKEN?: string;
  WEBFLOW_ZENDESK_PASSWORD?: string;
  ZENDESK_PASSWORD?: string;
  WEBFLOW_ZENDESK_OAUTH_TOKEN?: string;
  ZENDESK_OAUTH_TOKEN?: string;
  ZENDESK_READ_ONLY?: string;
  MCP_TOOL_ACCESS_MODE?: string;
  ZENDESK_TIMEOUT_MS?: string;
}

type WorkerContext = {
  accountId: string;
  tokenProvider: { getAccessToken(): Promise<string> };
  metadata: Record<string, unknown>;
  policy: {
    scopes: string[];
    readOnly?: boolean;
    constraints: Record<string, unknown>;
  };
};

const SERVER_NAME = 'zendesk-mcp';
const SERVER_VERSION = '0.1.0';
const DEFAULT_LANGFUSE_PROJECT_NAME = 'CREATE SOMETHING';

export class ZendeskMCP extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    const getContext = (): WorkerContext => resolveZendeskContext(this.env);
    const adapter = createScopedAdapter(this.server, getContext);

    enableTelemetry(this.server, this.env.TELEMETRY_DB, SERVER_NAME, () => getContext().accountId, {
      publicKey: this.env.LANGFUSE_PUBLIC_KEY,
      secretKey: this.env.LANGFUSE_SECRET_KEY,
      projectName: resolveLangfuseProjectName(this.env),
    });

    registerResources(adapter);
    registerTools(adapter);
    registerPrompts(adapter);
  }
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-API-Key, Mcp-Session-Id',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      const subdomain = first(env.WEBFLOW_ZENDESK_SUBDOMAIN, env.ZENDESK_SUBDOMAIN) ?? 'webflow2579';
      return jsonResponse({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: 'Zendesk MCP for Webflow asset reviewer support workflows.',
        zendesk: {
          subdomain,
          baseUrl: `https://${subdomain}.zendesk.com`,
          authMode: resolveAuthMode(env),
          emailConfigured: Boolean(first(env.WEBFLOW_ZENDESK_EMAIL, env.ZENDESK_EMAIL)),
          apiTokenConfigured: Boolean(first(env.WEBFLOW_ZENDESK_API_TOKEN, env.ZENDESK_API_TOKEN)),
          oauthTokenConfigured: Boolean(first(env.WEBFLOW_ZENDESK_OAUTH_TOKEN, env.ZENDESK_OAUTH_TOKEN)),
          passwordConfigured: Boolean(first(env.WEBFLOW_ZENDESK_PASSWORD, env.ZENDESK_PASSWORD)),
        },
        transportAuth: {
          configured: Boolean(resolveMcpApiKey(env)),
          header: 'Authorization: Bearer <ZENDESK_MCP_API_KEY or MCP_API_KEY>',
        },
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          health: '/health',
        },
        telemetry: {
          d1_configured: Boolean(env.TELEMETRY_DB),
          langfuse_configured: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
          langfuse_project_name: resolveLangfuseProjectName(env),
          langfuse_keys_configured: Boolean(env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY),
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateTransportAuth(request, env);
      if (authError) return authError;
      return ZendeskMCP.serve('/mcp').fetch(request, env, ctx);
    }

    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      const authError = validateTransportAuth(request, env);
      if (authError) return authError;
      return ZendeskMCP.serve('/sse').fetch(request, env, ctx);
    }

    return jsonResponse({ error: 'NotFound' }, 404);
  },
};

function createScopedAdapter(server: McpServer, getContext: () => WorkerContext) {
  return {
    tool(
      name: string,
      description: string,
      schema: Record<string, unknown>,
      handler: (params: Record<string, unknown>, ctx: WorkerContext, extra: unknown) => Promise<unknown>,
      _options?: { readOnly?: boolean },
    ) {
      server.tool(name, description, schema, async (params, extra) => handler(params, getContext(), extra));
    },
    resource(
      name: string,
      uri: string,
      metadata: { description?: string; mimeType?: string },
      handler: (uri: URL, ctx: WorkerContext) => Promise<unknown>,
    ) {
      server.resource(name, uri, metadata, async (resourceUri) => handler(resourceUri, getContext()));
    },
    prompt(
      name: string,
      description: string,
      schema: Record<string, unknown> | undefined,
      handler: (params: Record<string, unknown>, ctx: WorkerContext) => Promise<unknown>,
    ) {
      if (schema) {
        server.prompt(name, description, schema, async (params) => handler(params, getContext()));
      } else {
        server.prompt(name, description, async () => handler({}, getContext()));
      }
    },
  } as never;
}

function resolveZendeskContext(env: Env): WorkerContext {
  const authMode = resolveAuthMode(env);
  const token =
    authMode === 'oauth'
      ? first(env.WEBFLOW_ZENDESK_OAUTH_TOKEN, env.ZENDESK_OAUTH_TOKEN)
      : authMode === 'api-token'
        ? first(env.WEBFLOW_ZENDESK_API_TOKEN, env.ZENDESK_API_TOKEN)
        : first(env.WEBFLOW_ZENDESK_PASSWORD, env.ZENDESK_PASSWORD);
  const email = first(env.WEBFLOW_ZENDESK_EMAIL, env.ZENDESK_EMAIL);
  const subdomain = first(env.WEBFLOW_ZENDESK_SUBDOMAIN, env.ZENDESK_SUBDOMAIN) ?? 'webflow2579';
  const timeoutMs = parsePositiveInt(env.ZENDESK_TIMEOUT_MS);
  if (!token) throw new Error('Missing Zendesk service credential.');
  if (authMode !== 'oauth' && !email) throw new Error('Missing Zendesk service email.');

  return {
    accountId: env.MCP_ACCOUNT_ID?.trim() || 'webflow-zendesk',
    tokenProvider: {
      getAccessToken: async () => token,
    },
    metadata: {
      subdomain,
      authMode,
      ...(email ? { email } : {}),
      ...(timeoutMs ? { timeoutMs } : {}),
    },
    policy: {
      scopes: [`zendesk:${authMode}`],
      readOnly: parseBoolean(env.ZENDESK_READ_ONLY) ?? false,
      constraints: {
        ...(env.MCP_TOOL_ACCESS_MODE ? { mcpToolAccessMode: env.MCP_TOOL_ACCESS_MODE } : {}),
      },
    },
  };
}

function resolveAuthMode(env: Env): 'api-token' | 'oauth' | 'password' {
  if (first(env.WEBFLOW_ZENDESK_OAUTH_TOKEN, env.ZENDESK_OAUTH_TOKEN)) return 'oauth';
  if (first(env.WEBFLOW_ZENDESK_API_TOKEN, env.ZENDESK_API_TOKEN)) return 'api-token';
  return 'password';
}

function validateTransportAuth(request: Request, env: Env): Response | null {
  const configured = resolveMcpApiKey(env);
  if (!configured) {
    return jsonResponse({ error: 'MISCONFIGURED', message: 'ZENDESK_MCP_API_KEY or MCP_API_KEY is not configured.' }, 503);
  }
  const provided = extractProvidedApiKey(request);
  if (!provided || provided !== configured) {
    return jsonResponse({ error: 'UNAUTHORIZED', message: 'Valid bearer token required.' }, 401);
  }
  return null;
}

function resolveMcpApiKey(env: Env): string | undefined {
  return first(env.ZENDESK_MCP_API_KEY, env.MCP_API_KEY);
}

function resolveLangfuseProjectName(env: Pick<Env, 'LANGFUSE_PROJECT_NAME'>): string {
  return env.LANGFUSE_PROJECT_NAME?.trim() || DEFAULT_LANGFUSE_PROJECT_NAME;
}

function extractProvidedApiKey(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
  return request.headers.get('x-api-key')?.trim() || null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function first(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
