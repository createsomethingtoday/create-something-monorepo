import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createWebflowMcpServer } from '../src/index.js';

interface Env {
  WEBFLOW_LOCAL_MCP_API_KEY?: string;
  WEBFLOW_MCP_API_KEY?: string;
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PROJECT_NAME?: string;
  LANGFUSE_BASE_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};
const API_KEY_ENV_VARS = [
  'WEBFLOW_LOCAL_MCP_API_KEY',
  'WEBFLOW_MCP_API_KEY',
  'WEBFLOW_SITE_ANALYZER_MCP_API_KEY',
  'MCP_API_KEY',
] as const;

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

function getApiKeys(env: Env): string[] {
  return [
    ...new Set(
      API_KEY_ENV_VARS.map((name) => env[name]?.trim()).filter((value): value is string => Boolean(value)),
    ),
  ];
}

function parseBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function isAuthorized(request: Request, env: Env): boolean {
  const configuredTokens = getApiKeys(env);
  if (configuredTokens.length === 0) return true;

  const headerToken =
    parseBearerToken(request) ??
    request.headers.get('x-api-key')?.trim() ??
    new URL(request.url).searchParams.get('token')?.trim() ??
    null;

  return Boolean(headerToken && configuredTokens.includes(headerToken));
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function syncEnvToProcess(env: Env): void {
  const entries: Array<[keyof Env, string | undefined]> = [
    ['WEBFLOW_LOCAL_MCP_API_KEY', env.WEBFLOW_LOCAL_MCP_API_KEY],
    ['WEBFLOW_MCP_API_KEY', env.WEBFLOW_MCP_API_KEY],
    ['WEBFLOW_SITE_ANALYZER_MCP_API_KEY', env.WEBFLOW_SITE_ANALYZER_MCP_API_KEY],
    ['MCP_API_KEY', env.MCP_API_KEY],
    ['LANGFUSE_PROJECT_NAME', env.LANGFUSE_PROJECT_NAME],
    ['LANGFUSE_PUBLIC_KEY', env.LANGFUSE_PUBLIC_KEY],
    ['LANGFUSE_SECRET_KEY', env.LANGFUSE_SECRET_KEY],
    ['LANGFUSE_BASE_URL', env.LANGFUSE_BASE_URL],
  ];

  for (const [key, value] of entries) {
    if (typeof value === 'string' && value.length > 0) {
      process.env[key] = value;
    }
  }

  process.env.WEBFLOW_MCP_RUNTIME = 'worker';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    syncEnvToProcess(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        ok: true,
        name: 'webflow-mcp',
        transport: 'streamable-http',
        endpoint: '/mcp',
        auth: {
          configured: getApiKeys(env).length > 0,
          header: 'Authorization: Bearer <WEBFLOW_MCP_API_KEY>',
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      if (!isAuthorized(request, env)) {
        return json(
          { error: 'Unauthorized. Provide Authorization: Bearer <WEBFLOW_MCP_API_KEY>.' },
          { status: 401 },
        );
      }

      try {
        const server = createWebflowMcpServer();
        const transport = new WebStandardStreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        await server.connect(transport);
        return withCors(await transport.handleRequest(request));
      } catch (error) {
        return json(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 500 },
        );
      }
    }

    return json({ error: 'Not found. MCP endpoint is /mcp.' }, { status: 404 });
  },
};
