import { createServer, handleApplyWebhook } from '../src/index.js';
import type { ZipRecruiterEnv } from '../src/types.js';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, X-API-Key',
};

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

export default {
  async fetch(request: Request, env: ZipRecruiterEnv): Promise<Response> {
    const url = new URL(request.url);
    const server = createServer();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        name: 'ziprecruiter-mcp',
        version: '0.1.0',
        endpoints: {
          mcp: '/mcp',
          webhook: '/webhooks/apply',
          health: '/health',
        },
        configured: {
          db: Boolean(env.DB),
          storage: Boolean(env.STORAGE),
          zipRecruiterApiKey: Boolean(env.ZIPRECRUITER_API_KEY),
          webhookSecret: Boolean(env.ZIPRECRUITER_WEBHOOK_SECRET),
          mcpApiKey: Boolean(env.ZIPRECRUITER_MCP_API_KEY || env.MCP_API_KEY),
        },
      });
    }

    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      return withCors(await server.handleRequest(request, env));
    }

    if (url.pathname === '/webhooks/apply') {
      return withCors(await handleApplyWebhook(request, env));
    }

    return json({ error: 'Not found. Supported endpoints: /mcp, /webhooks/apply, /health.' }, { status: 404 });
  },
};
