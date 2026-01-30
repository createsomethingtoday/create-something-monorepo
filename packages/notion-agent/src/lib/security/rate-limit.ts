/**
 * Rate Limiting using Cloudflare KV
 * 
 * Implements a sliding window rate limiter using KV storage.
 * Limits are per-user and per-endpoint.
 */

export interface RateLimitConfig {
	/** Maximum requests allowed in the window */
	limit: number;
	/** Window size in seconds */
	windowSeconds: number;
	/** Optional prefix for KV keys */
	prefix?: string;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
	retryAfter?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
	limit: 60,
	windowSeconds: 60,
	prefix: 'ratelimit'
};

/**
 * Check and update rate limit for a user/endpoint.
 * Uses a simple counter with TTL for sliding window approximation.
 */
export async function checkRateLimit(
	kv: KVNamespace,
	userId: string,
	endpoint: string,
	config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
	const { limit, windowSeconds, prefix } = { ...DEFAULT_CONFIG, ...config };
	const key = `${prefix}:${endpoint}:${userId}`;
	const now = Math.floor(Date.now() / 1000);

	// Get current count and window start
	const stored = await kv.get(key, 'json') as { count: number; windowStart: number } | null;

	let count = 0;
	let windowStart = now;

	if (stored) {
		// Check if we're still in the same window
		if (now - stored.windowStart < windowSeconds) {
			count = stored.count;
			windowStart = stored.windowStart;
		}
		// If window expired, start fresh (count = 0, windowStart = now)
	}

	const resetAt = windowStart + windowSeconds;
	const remaining = Math.max(0, limit - count);

	if (count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetAt,
			retryAfter: resetAt - now
		};
	}

	// Increment counter
	await kv.put(
		key,
		JSON.stringify({ count: count + 1, windowStart }),
		{ expirationTtl: windowSeconds }
	);

	return {
		allowed: true,
		remaining: remaining - 1,
		resetAt
	};
}

/**
 * Rate limit configurations for different endpoints.
 */
export const RATE_LIMITS = {
	/** Agent execution - expensive operation */
	execute: { limit: 10, windowSeconds: 60, prefix: 'rl' } as RateLimitConfig,
	
	/** Agent CRUD - moderate limits */
	agents: { limit: 30, windowSeconds: 60, prefix: 'rl' } as RateLimitConfig,
	
	/** Dashboard/read operations - higher limits */
	read: { limit: 120, windowSeconds: 60, prefix: 'rl' } as RateLimitConfig,
	
	/** OAuth - very limited */
	auth: { limit: 5, windowSeconds: 60, prefix: 'rl' } as RateLimitConfig,
};

/**
 * Apply rate limit headers to a response.
 */
export function applyRateLimitHeaders(
	headers: Headers,
	result: RateLimitResult
): void {
	headers.set('X-RateLimit-Remaining', result.remaining.toString());
	headers.set('X-RateLimit-Reset', result.resetAt.toString());
	if (result.retryAfter) {
		headers.set('Retry-After', result.retryAfter.toString());
	}
}

/**
 * Create a rate limit error response.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
	const headers = new Headers();
	applyRateLimitHeaders(headers, result);
	headers.set('Content-Type', 'application/json');

	return new Response(
		JSON.stringify({
			error: 'Rate limit exceeded',
			retryAfter: result.retryAfter,
			resetAt: result.resetAt
		}),
		{
			status: 429,
			headers
		}
	);
}
