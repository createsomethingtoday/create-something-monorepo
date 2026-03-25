/**
 * Cloudflare KV session utilities.
 *
 * Replaces Vercel KV with Cloudflare KV for session storage.
 * Sessions are stored with a 2-hour TTL.
 */

const SESSION_TTL = 7200; // 2 hours in seconds
const SESSION_HANDOFF_TTL = 300; // 5 minutes in seconds

export interface SessionData {
	email: string;
	createdAt: number;
}

export interface SessionHandoffData {
	sessionToken: string;
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
 * Create a short-lived, one-time handoff token that can bootstrap an
 * authenticated session in a top-level browsing context.
 */
export async function createSessionHandoff(
	kv: KVNamespace,
	sessionToken: string,
	email: string
): Promise<string> {
	const handoffToken = `handoff_${crypto.randomUUID()}`;
	const data: SessionHandoffData = {
		sessionToken,
		email,
		createdAt: Date.now()
	};

	await kv.put(`handoff:${handoffToken}`, JSON.stringify(data), {
		expirationTtl: SESSION_HANDOFF_TTL
	});

	return handoffToken;
}

/**
 * Consume a one-time session handoff token.
 */
export async function consumeSessionHandoff(
	kv: KVNamespace,
	handoffToken: string
): Promise<SessionHandoffData | null> {
	if (!handoffToken) return null;

	const storageKey = `handoff:${handoffToken}`;

	try {
		const data = await kv.get(storageKey, 'json');
		if (!data) return null;

		await kv.delete(storageKey);
		return data as SessionHandoffData;
	} catch {
		return null;
	}
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
	windowSeconds: number,
	options: {
		/**
		 * When true, storage failures allow requests (legacy behavior).
		 * When false (default), failures deny requests to avoid bypassing controls.
		 */
		failOpen?: boolean;
	} = {}
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
		if (options.failOpen) {
			return { allowed: true, remaining: limit, retryAfter: 0 };
		}

		// Fail closed by default to avoid bypassing auth controls when KV is unavailable.
		return { allowed: false, remaining: 0, retryAfter: windowSeconds };
	}
}
