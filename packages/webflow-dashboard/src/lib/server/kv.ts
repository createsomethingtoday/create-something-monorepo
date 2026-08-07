/**
 * Cloudflare KV session utilities.
 *
 * Replaces Vercel KV with Cloudflare KV for session storage.
 * Sessions are stored with a 2-hour TTL.
 */

const SESSION_TTL = 7200; // 2 hours in seconds
const SESSION_HANDOFF_TTL = 300; // 5 minutes in seconds

/** Slide the 2-hour TTL once a session is this old, so activity keeps it alive. */
const SESSION_REFRESH_AFTER_SECONDS = 1800; // 30 minutes

/** Hard ceiling on a session's life regardless of activity. */
const SESSION_ABSOLUTE_MAX_SECONDS = 86400; // 24 hours

export const SESSION_COOKIE_NAME = 'session_token';

/**
 * Single definition of the session cookie flags.
 *
 * sameSite 'none' is required for the Webflow iframe embed; CSRF is enforced by
 * the trusted-origin check in hooks.server.ts instead.
 */
export const SESSION_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: true,
	path: '/' as const,
	maxAge: SESSION_TTL,
	sameSite: 'none' as const
};

export interface SessionData {
	email: string;
	createdAt: number;
	/** First issue time, preserved across refreshes to enforce the absolute cap. */
	issuedAt?: number;
}

export interface SessionHandoffData {
	sessionToken: string;
	email: string;
	createdAt: number;
}

/**
 * Validates that a KV value is actually a session.
 *
 * The session token comes straight from a cookie and is used verbatim as the KV
 * key, and the SESSIONS namespace also holds rate-limit counters written by
 * `checkRateLimit` as bare numbers under predictable keys
 * (`ratelimit:auth:login:<ip>:<windowIndex>`). Without this guard,
 * `kv.get(key, 'json')` parses "3" into a truthy `3`, hooks.server.ts sets
 * `locals.user = { email: undefined }`, and that passes every `!locals.user`
 * auth gate.
 *
 * Only `email` is checked. `createdAt` is deliberately not required:
 * `shouldRefreshSession` already tolerates its absence, and demanding it would
 * log out live sessions for no security gain.
 */
function isSessionData(value: unknown): value is SessionData {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

	const email = (value as { email?: unknown }).email;
	return typeof email === 'string' && email.length > 0;
}

/**
 * Get a session from KV.
 */
export async function getSession(kv: KVNamespace, sessionToken: string): Promise<SessionData | null> {
	if (!sessionToken) return null;

	try {
		const data = await kv.get(sessionToken, 'json');
		return isSessionData(data) ? data : null;
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
	const now = Date.now();
	const data: SessionData = {
		email,
		createdAt: now,
		issuedAt: now
	};

	await kv.put(sessionToken, JSON.stringify(data), {
		expirationTtl: SESSION_TTL
	});
}

/**
 * True when an active session is old enough to warrant sliding its TTL, and
 * still inside the absolute lifetime cap.
 */
export function shouldRefreshSession(session: SessionData, now: number = Date.now()): boolean {
	const issuedAt = session.issuedAt ?? session.createdAt;

	if (issuedAt && now - issuedAt >= SESSION_ABSOLUTE_MAX_SECONDS * 1000) {
		return false;
	}

	if (!session.createdAt) return true;

	return now - session.createdAt >= SESSION_REFRESH_AFTER_SECONDS * 1000;
}

/**
 * Extend a session's TTL without changing its identity or absolute expiry.
 */
export async function refreshSession(
	kv: KVNamespace,
	sessionToken: string,
	session: SessionData,
	now: number = Date.now()
): Promise<void> {
	const data: SessionData = {
		...session,
		createdAt: now,
		issuedAt: session.issuedAt ?? session.createdAt ?? now
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
	const windowIndex = Math.floor(now / windowSeconds);
	const windowKey = `ratelimit:${key}:${windowIndex}`;
	const previousWindowKey = `ratelimit:${key}:${windowIndex - 1}`;

	try {
		// Count the previous window too. A pure fixed window lets a caller spend the
		// full limit twice across a window boundary (2x burst in seconds).
		const [current, previous] = await Promise.all([
			kv.get(windowKey, 'text'),
			kv.get(previousWindowKey, 'text')
		]);
		const count = current ? parseInt(current, 10) : 0;
		const previousCount = previous ? parseInt(previous, 10) : 0;
		const windowElapsed = now - windowIndex * windowSeconds;
		const previousWeight = Math.max(0, 1 - windowElapsed / windowSeconds);
		const weightedCount = count + Math.floor(previousCount * previousWeight);

		if (weightedCount >= limit) {
			const resetAt = (windowIndex + 1) * windowSeconds;
			return {
				allowed: false,
				remaining: 0,
				retryAfter: resetAt - now
			};
		}

		// Increment counter. Keep the window readable for one extra window so the
		// weighted check above can still see it after the boundary.
		await kv.put(windowKey, String(count + 1), {
			expirationTtl: windowSeconds * 2
		});

		return {
			allowed: true,
			remaining: Math.max(0, limit - weightedCount - 1),
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
