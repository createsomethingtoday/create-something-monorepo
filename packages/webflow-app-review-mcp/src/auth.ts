export function unauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer realm="webflow-app-review-mcp"',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

/**
 * Validate Authorization header against a single shared bearer token.
 * When expectedToken is not configured, auth is bypassed for local/dev usage.
 */
export function validateBearerToken(request: Request, expectedToken?: string): Response | null {
  if (!expectedToken) return null;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorizedResponse('Missing Authorization: Bearer <MCP_API_KEY> header.');
  }

  const provided = authHeader.slice('Bearer '.length).trim();
  if (!provided || provided !== expectedToken) {
    return unauthorizedResponse('Invalid bearer token.');
  }

  return null;
}

