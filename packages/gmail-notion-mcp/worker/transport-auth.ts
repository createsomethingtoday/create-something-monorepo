import { normalizeAccountId } from '../src/identity.js';

interface TransportAuthEnv {
  MCP_API_KEY?: string;
  MCP_ACCOUNT_ID?: string;
}

export function authorizeMcpTransport(request: Request, env: TransportAuthEnv): Response | null {
  const expected = env.MCP_API_KEY?.trim();
  if (!expected) {
    return Response.json({ error: 'MCP transport authentication is not configured' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match || !constantTimeEqual(match[1].trim(), expected)) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="gmail-notion-mcp"' } },
    );
  }

  return null;
}

export function resolveServerAccountId(env: TransportAuthEnv): string {
  return normalizeAccountId(env.MCP_ACCOUNT_ID?.trim() || 'operator');
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const length = Math.max(actual.length, expected.length);
  let mismatch = actual.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
