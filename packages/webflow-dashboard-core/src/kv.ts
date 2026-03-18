const SESSION_TTL = 7200;

export interface SessionData {
  email: string;
  createdAt: number;
}

export async function getSession(
  kv: KVNamespace,
  sessionToken: string
): Promise<SessionData | null> {
  if (!sessionToken) return null;

  try {
    const data = await kv.get(sessionToken, 'json');
    return data as SessionData | null;
  } catch {
    return null;
  }
}

export async function setSession(
  kv: KVNamespace,
  sessionToken: string,
  email: string
): Promise<void> {
  await kv.put(
    sessionToken,
    JSON.stringify({
      email,
      createdAt: Date.now()
    } satisfies SessionData),
    { expirationTtl: SESSION_TTL }
  );
}

export async function deleteSession(kv: KVNamespace, sessionToken: string): Promise<void> {
  await kv.delete(sessionToken);
}

export function generateSessionToken(): string {
  return `session_${crypto.randomUUID()}`;
}

export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
  options: { failOpen?: boolean } = {}
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  try {
    const current = await kv.get(windowKey, 'text');
    const count = current ? Number.parseInt(current, 10) : 0;

    if (count >= limit) {
      const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
      return {
        allowed: false,
        remaining: 0,
        retryAfter: resetAt - now
      };
    }

    await kv.put(windowKey, String(count + 1), {
      expirationTtl: windowSeconds
    });

    return {
      allowed: true,
      remaining: limit - count - 1,
      retryAfter: 0
    };
  } catch {
    if (options.failOpen) {
      return { allowed: true, remaining: limit, retryAfter: 0 };
    }

    return { allowed: false, remaining: 0, retryAfter: windowSeconds };
  }
}
