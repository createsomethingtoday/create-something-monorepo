/**
 * Cloudflare KV session utilities.
 *
 * Replaces Vercel KV with Cloudflare KV for session storage.
 * Sessions are stored with a 2-hour TTL.
 */

const SESSION_TTL = 7200; // 2 hours in seconds

export interface SessionData {
	email: string;
	createdAt: number;
}

/**
 * Get a session from KV.
 */
export async function getSession(kv: KVNamespace, sessionToken: string): Promise<SessionData | null> {
	if (!sessionToken) return null;

	try {
		const data = await kv.get(sessionToken, 'json');
		return data as SessionData | null;
	} catch {
		return null;
	}
}

/**
 * Set a session in KV.
 */
export async function setSession(
	kv: KVNamespace,
	sessionToken: string,
	email: string
): Promise<void> {
	const data: SessionData = {
		email,
		createdAt: Date.now()
	};

	await kv.put(sessionToken, JSON.stringify(data), {
		expirationTtl: SESSION_TTL
	});
}

/**
 * Delete a session from KV.
 */
export async function deleteSession(kv: KVNamespace, sessionToken: string): Promise<void> {
	await kv.delete(sessionToken);
}

/**
 * Generate a session token.
 */
export function generateSessionToken(): string {
	return `session_${crypto.randomUUID()}`;
}

/**
 * Rate limiting using KV.
 *
 * Returns whether the request is allowed and remaining attempts.
 */
export async function checkRateLimit(
	kv: KVNamespace,
	key: string,
	limit: number,
	windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
	const now = Math.floor(Date.now() / 1000);
	const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

	try {
		const current = await kv.get(windowKey, 'text');
		const count = current ? parseInt(current, 10) : 0;

		if (count >= limit) {
			const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
			return {
				allowed: false,
				remaining: 0,
				retryAfter: resetAt - now
			};
		}

		// Increment counter
		await kv.put(windowKey, String(count + 1), {
			expirationTtl: windowSeconds
		});

		return {
			allowed: true,
			remaining: limit - count - 1,
			retryAfter: 0
		};
	} catch {
		// On error, allow the request
		return { allowed: true, remaining: limit, retryAfter: 0 };
	}
}
