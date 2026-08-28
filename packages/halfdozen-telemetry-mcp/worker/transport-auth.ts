interface TransportAuthEnv {
  MCP_BEARER_TOKEN?: string;
}

export function authorizeMcpTransport(request: Request, env: TransportAuthEnv): Response | null {
  const expected = env.MCP_BEARER_TOKEN?.trim();
  if (!expected) {
    return Response.json({ error: 'MCP transport authentication is not configured' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match || !constantTimeEqual(match[1].trim(), expected)) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
    );
  }

  return null;
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const length = Math.max(actual.length, expected.length);
  let mismatch = actual.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
