export interface AuthEnv {
  MCP_API_KEY?: string;
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  const apiKeyHeader = request.headers.get('X-API-Key');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return apiKeyHeader;
}

export function validateApiKey(request: Request, env: AuthEnv): Response | null {
  if (!env.MCP_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ServerMisconfigured', message: 'MCP_API_KEY is not configured for this deployment.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const provided = extractApiKey(request);
  if (!provided || provided !== env.MCP_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Valid API key required. Use Authorization: Bearer <token> or X-API-Key.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null;
}
