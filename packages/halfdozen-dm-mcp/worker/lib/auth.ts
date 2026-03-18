export interface AuthEnv {
  MCP_API_KEY?: string;
}

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1]?.trim();
  return token || null;
}

export function extractApiKey(request: Request): string | null {
  const bearerToken = parseBearerToken(request.headers.get('Authorization'));
  if (bearerToken) return bearerToken;

  const apiKeyHeader = request.headers.get('X-API-Key');
  const trimmed = apiKeyHeader?.trim();
  return trimmed || null;
}

export function resolveRequestAccountId(request: Request): string | null {
  const accountHeader =
    request.headers.get('x-mcp-account-id') ?? request.headers.get('x-account-id');
  const trimmed = accountHeader?.trim();
  return trimmed || null;
}

export function validateApiKey(request: Request, env: AuthEnv): Response | null {
  if (!env.MCP_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'ServerMisconfigured',
        message: 'MCP_API_KEY is not configured for this deployment.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  const provided = extractApiKey(request);
  if (!provided || provided !== env.MCP_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized',
        message: 'Valid API key required. Use Authorization: Bearer <token> or X-API-Key.',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  return null;
}
