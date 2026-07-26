export interface AdminAuthEnv {
  OPERATOR_ADMIN_TOKEN?: string;
}

function tokenFromRequest(request: Request): string | null {
  const bearer = request.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }

  const headerToken = request.headers.get('x-operator-token')?.trim();
  if (headerToken) return headerToken;

  return null;
}

async function sha256Bytes(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
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

export async function isAdminRequest(request: Request, env: AdminAuthEnv): Promise<boolean> {
  const expected = env.OPERATOR_ADMIN_TOKEN?.trim();
  if (!expected) return false;

  const token = tokenFromRequest(request);
  if (!token) return false;

  const [tokenHash, expectedHash] = await Promise.all([sha256Bytes(token), sha256Bytes(expected)]);
  return equalBytes(tokenHash, expectedHash);
}
