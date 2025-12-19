/**
 * Authentication utilities for Cloudflare KV session management
 */

export interface SessionData {
	email: string;
	createdAt: number;
}

/**
 * Create a new session in KV
 */
export async function createSession(
	kv: KVNamespace,
	email: string
): Promise<string> {
	const token = `session_${crypto.randomUUID()}`;

	// Store email as session value with 2-hour expiration
	await kv.put(token, email, {
		expirationTtl: 7200 // 2 hours in seconds
	});

	return token;
}

/**
 * Get session data from KV
 */
export async function getSession(
	kv: KVNamespace,
	token: string
): Promise<string | null> {
	return await kv.get(token);
}

/**
 * Delete session from KV
 */
export async function deleteSession(
	kv: KVNamespace,
	token: string
): Promise<void> {
	await kv.delete(token);
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_TIERS = {
	auth: {
		requests: 5,
		window: 900, // 15 minutes
		name: 'Auth'
	},
	free: {
		requests: 100,
		window: 3600, // 1 hour
		name: 'Free'
	},
	paid: {
		requests: 1000,
		window: 3600,
		name: 'Paid'
	}
} as const;

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: string;
	retryAfter: number;
}

/**
 * Check rate limit using sliding window algorithm
 */
export async function checkRateLimit(
	kv: KVNamespace,
	identifier: string,
	limits: { requests: number; window: number }
): Promise<RateLimitResult> {
	const key = `ratelimit_${identifier}`;
	const now = Date.now();
	const windowStart = now - (limits.window * 1000);

	try {
		// Get current request timestamps
		const storedData = await kv.get(key);
		let timestamps: number[] = [];

		if (storedData) {
			try {
				const parsed = JSON.parse(storedData);
				timestamps = Array.isArray(parsed) ? parsed : [];
			} catch {
				timestamps = [];
			}
		}

		// Filter to current window (sliding window algorithm)
		const recentRequests = timestamps.filter(ts => ts > windowStart);

		// Check if limit exceeded
		if (recentRequests.length >= limits.requests) {
			const oldestRequest = Math.min(...recentRequests);
			const resetTime = oldestRequest + (limits.window * 1000);

			return {
				allowed: false,
				remaining: 0,
				limit: limits.requests,
				resetAt: new Date(resetTime).toISOString(),
				retryAfter: Math.ceil((resetTime - now) / 1000)
			};
		}

		// Add current request timestamp
		recentRequests.push(now);

		// Store updated timestamps with TTL
		await kv.put(key, JSON.stringify(recentRequests), {
			expirationTtl: limits.window + 60
		});

		// Calculate next reset time
		const oldestInWindow = recentRequests[0];
		const nextResetTime = oldestInWindow + (limits.window * 1000);

		return {
			allowed: true,
			remaining: limits.requests - recentRequests.length,
			limit: limits.requests,
			resetAt: new Date(nextResetTime).toISOString(),
			retryAfter: 0
		};
	} catch (error) {
		console.error('Rate limit check error:', error);

		// On error, allow request (fail open strategy)
		return {
			allowed: true,
			remaining: limits.requests,
			limit: limits.requests,
			resetAt: new Date(now + limits.window * 1000).toISOString(),
			retryAfter: 0
		};
	}
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
	return request.headers.get('cf-connecting-ip') ||
		request.headers.get('x-forwarded-for')?.split(',')[0] ||
		'unknown';
}
