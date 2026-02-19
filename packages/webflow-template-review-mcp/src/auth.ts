export type BearerAuthEnv = {
  MCP_API_KEY?: string;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

export function validateBearerAuth(request: Request, env: BearerAuthEnv): Response | null {
  if (!env.MCP_API_KEY) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'MCP_API_KEY_MISSING',
          message: 'Server misconfigured: MCP_API_KEY secret is not set.',
        },
      },
      500,
    );
  }

  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization header required. Use Authorization: Bearer <MCP_API_KEY>.',
          },
        },
        null,
        2,
      ),
      {
        status: 401,
        headers: {
          ...JSON_HEADERS,
          'WWW-Authenticate': 'Bearer realm="webflow-template-review-mcp"',
        },
      },
    );
  }

  const token = header.slice(7);
  if (token !== env.MCP_API_KEY) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid bearer token.',
        },
      },
      401,
    );
  }

  return null;
}
