export type AuthRole = 'device' | 'source' | 'relay';

export interface AuthEnv {
  INK_BRIDGE_TOKEN?: string;
  INK_DEVICE_TOKEN?: string;
  INK_RELAY_TOKEN?: string;
  INK_SOURCE_TOKEN?: string;
}

function parseToken(request: Request): string | null {
  const bearer = request.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }

  return (
    request.headers.get('x-ink-token')?.trim() ?? request.headers.get('x-api-key')?.trim() ?? null
  );
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(digest);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

async function tokenMatches(input: string, expected: string): Promise<boolean> {
  const [inputHash, expectedHash] = await Promise.all([sha256Bytes(input), sha256Bytes(expected)]);
  return equalBytes(inputHash, expectedHash);
}

function roleTokens(env: AuthEnv, role: AuthRole): string[] {
  const bridgeToken = env.INK_BRIDGE_TOKEN?.trim();
  const deviceToken = env.INK_DEVICE_TOKEN?.trim();
  const relayToken = env.INK_RELAY_TOKEN?.trim();
  const sourceToken = env.INK_SOURCE_TOKEN?.trim();

  const candidates =
    role === 'device'
      ? [deviceToken, bridgeToken]
      : role === 'relay'
        ? [relayToken, bridgeToken]
        : [sourceToken, bridgeToken];

  return candidates.filter((value): value is string => Boolean(value));
}

export async function isAuthorized(
  request: Request,
  env: AuthEnv,
  role: AuthRole
): Promise<boolean> {
  const token = parseToken(request);
  if (!token) return false;

  const candidates = roleTokens(env, role);
  if (candidates.length === 0) return false;

  for (const candidate of candidates) {
    if (await tokenMatches(token, candidate)) return true;
  }

  return false;
}
