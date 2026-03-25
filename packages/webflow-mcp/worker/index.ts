import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  WEBFLOW_ORIGINALITY_SERVER_NAME,
  WEBFLOW_ORIGINALITY_SERVER_VERSION,
  createWebflowMcpServer,
} from '../src/server.js';

interface Env {
  MCP_API_KEY?: string;
  WEBFLOW_ORIGINALITY_MCP_API_TOKEN?: string;
  WEBFLOW_LOCAL_MCP_API_TOKEN?: string;
}

const PRIMARY_API_TOKEN_ENV_VAR = 'WEBFLOW_ORIGINALITY_MCP_API_TOKEN';
const LEGACY_API_TOKEN_ENV_VAR = 'WEBFLOW_LOCAL_MCP_API_TOKEN';
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-Requested-With, X-API-Key',
};

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

function jsonResponse(payload: unknown, status = 200): Response {
  return withCors(
    new Response(JSON.stringify(payload, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}

function configuredApiKey(env: Env): string | null {
  const candidate =
    env.WEBFLOW_ORIGINALITY_MCP_API_TOKEN?.trim() ||
    env.WEBFLOW_LOCAL_MCP_API_TOKEN?.trim() ||
    env.MCP_API_KEY?.trim() ||
    '';
  return candidate.length > 0 ? candidate : null;
}

function requestToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  const match = auth?.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();

  const xApiKey = request.headers.get('x-api-key')?.trim();
  if (xApiKey) return xApiKey;

  return new URL(request.url).searchParams.get('token')?.trim() ?? null;
}

function validateApiKey(request: Request, env: Env): Response | null {
  const expected = configuredApiKey(env);
  if (!expected) {
    return jsonResponse(
      {
        error: `${PRIMARY_API_TOKEN_ENV_VAR} is not configured for this deployment.`,
      },
      503,
    );
  }

  if (requestToken(request) !== expected) {
    return jsonResponse(
      {
        error: `Unauthorized. Provide Authorization: Bearer <${PRIMARY_API_TOKEN_ENV_VAR}>.`,
      },
      401,
    );
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        name: WEBFLOW_ORIGINALITY_SERVER_NAME,
        version: WEBFLOW_ORIGINALITY_SERVER_VERSION,
        endpoints: {
          mcp: '/mcp',
          health: '/health',
        },
        auth: {
          configured: Boolean(configuredApiKey(env)),
          header: `Authorization: Bearer <${PRIMARY_API_TOKEN_ENV_VAR}>`,
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const authError = validateApiKey(request, env);
      if (authError) return authError;

      const server = createWebflowMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      await server.connect(transport);
      return withCors(await transport.handleRequest(request));
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
};
