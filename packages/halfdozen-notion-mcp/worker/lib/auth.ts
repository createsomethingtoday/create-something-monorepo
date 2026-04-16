export interface AuthEnv {
  MCP_API_KEY?: string;
}

const CORS_ALLOW_HEADERS = 'Content-Type, Accept, Authorization, X-API-Key, Mcp-Session-Id, Mcp-Protocol-Version';
const CORS_ALLOW_METHODS = 'GET, POST, DELETE, OPTIONS';

function buildCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', request.headers.get('Origin') ?? '*');
  headers.set('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
  headers.set('Access-Control-Allow-Methods', CORS_ALLOW_METHODS);
  headers.set('Access-Control-Expose-Headers', 'mcp-session-id');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');
  return headers;
}

function jsonResponse(request: Request, body: unknown, status: number): Response {
  const headers = buildCorsHeaders(request);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

export function preflightResponse(request: Request): Response {
  return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return apiKeyHeader?.trim() || null;
}

export function validateApiKey(request: Request, env: AuthEnv): Response | null {
  if (!env.MCP_API_KEY) {
    return null;
  }

  const provided = extractApiKey(request);
  if (!provided || provided !== env.MCP_API_KEY) {
    return jsonResponse(
      request,
      {
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer <token> or X-API-Key.',
      },
      401
    );
  }

  return null;
}
