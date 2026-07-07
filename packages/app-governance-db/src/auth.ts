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
        'WWW-Authenticate': 'Bearer realm="app-governance-db"',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

export function misconfiguredResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: 'MISCONFIGURED',
        message,
      },
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}

async function sha256hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resolve the bearer token (Authorization header, or ?key= for WebSocket/browser
 * clients that cannot set headers) to an operator identity. The legacy shared
 * MCP_API_KEY resolves to 'shared'; per-operator keys live hashed in api_keys.
 */
export async function resolveOperator(
  request: Request,
  env: { DB: D1Database; MCP_API_KEY?: string },
): Promise<{ operator: string } | Response> {
  if (!env.MCP_API_KEY) {
    return misconfiguredResponse('MCP_API_KEY is not configured for this deployment.');
  }
  const authHeader = request.headers.get('Authorization');
  const provided = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : new URL(request.url).searchParams.get('key')?.trim();
  if (!provided) {
    return unauthorizedResponse('Missing Authorization: Bearer <key> header (or ?key= for WebSocket clients).');
  }
  if (provided === env.MCP_API_KEY) {
    return { operator: 'shared' };
  }
  const hash = await sha256hex(provided);
  const row = await env.DB.prepare('SELECT label FROM api_keys WHERE token_hash = ? AND active = 1')
    .bind(hash)
    .first<{ label: string }>();
  if (row) {
    return { operator: row.label };
  }
  return unauthorizedResponse('Invalid bearer token.');
}

/**
 * Validate Authorization header against a single shared bearer token.
 */
export function validateBearerToken(request: Request, expectedToken: string): Response | null {
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
