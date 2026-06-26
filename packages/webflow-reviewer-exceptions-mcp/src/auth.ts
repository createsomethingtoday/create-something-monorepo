const REALM = 'webflow-reviewer-exceptions-mcp';

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
        'WWW-Authenticate': `Bearer realm="${REALM}"`,
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

export function validateBearerToken(request: Request, expectedToken: string): Response | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorizedResponse('Missing Authorization: Bearer <token> header.');
  }

  const provided = authHeader.slice('Bearer '.length).trim();
  if (!provided || provided !== expectedToken) {
    return unauthorizedResponse('Invalid bearer token.');
  }

  return null;
}
