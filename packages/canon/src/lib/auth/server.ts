/**
 * Server-Side Token Validation
 *
 * Secure JWT validation with JWKS caching for Cloudflare Workers and SvelteKit.
 * Uses KV for persistent caching across stateless Worker instances.
 *
 * Canon: Verification is invisible—the trusted identity simply emerges.
 *
 * @packageDocumentation
 */

// Import from types module to avoid circular dependencies
import {
	SESSION_CONFIG,
	type JWTPayload,
	type User,
	type JWK,
	type KVLike,
	type AuthEnv,
} from './types.js';
import { COOKIE_CONFIG, parseCookieHeader } from './cookies.js';

// Re-export types for backwards compatibility
export type { KVLike, AuthEnv };

/** Cached JWKS structure for KV storage */
interface CachedJWKS {
	keys: JWK[];
	fetchedAt: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const JWKS_KV_KEY = 'identity:jwks';
const JWKS_KV_TTL = SESSION_CONFIG.JWKS_CACHE_TTL; // seconds

// Module-level fallback cache (used when KV is not available)
let moduleCache: CachedJWKS | null = null;

// =============================================================================
// JWKS FETCHING (with KV caching)
// =============================================================================

/**
 * Fetch JWKS from Identity Worker with KV caching
 *
 * Caching strategy:
 * 1. Check KV cache first (if env.AUTH_CACHE available)
 * 2. Fall back to module-level cache
 * 3. Fetch from Identity Worker if cache miss/expired
 * 4. Update both KV and module cache on successful fetch
 */
async function fetchJWKS(env?: AuthEnv): Promise<JWK[]> {
	const now = Date.now();
	const ttlMs = JWKS_KV_TTL * 1000;

	// Try KV cache first
	if (env?.AUTH_CACHE) {
		try {
			const cached = await env.AUTH_CACHE.get(JWKS_KV_KEY, 'json') as CachedJWKS | null;
			if (cached && now - cached.fetchedAt < ttlMs) {
				// Also update module cache for faster subsequent calls
				moduleCache = cached;
				return cached.keys;
			}
		} catch {
			// KV read failed, fall through to module cache
		}
	}

	// Try module cache
	if (moduleCache && now - moduleCache.fetchedAt < ttlMs) {
		return moduleCache.keys;
	}

	// Fetch from Identity Worker
	try {
		const response = await fetch(`${SESSION_CONFIG.IDENTITY_ENDPOINT}/.well-known/jwks.json`);
		if (!response.ok) {
			console.error('Failed to fetch JWKS:', response.status);
			return moduleCache?.keys ?? [];
		}

		const data = await response.json() as { keys: JWK[] };
		const cached: CachedJWKS = { keys: data.keys, fetchedAt: now };

		// Update module cache
		moduleCache = cached;

		// Update KV cache (fire and forget)
		if (env?.AUTH_CACHE) {
			try {
				await env.AUTH_CACHE.put(JWKS_KV_KEY, JSON.stringify(cached), {
					expirationTtl: JWKS_KV_TTL,
				});
			} catch {
				// KV write failed, continue with module cache
			}
		}

		return data.keys;
	} catch (error) {
		console.error('JWKS fetch error:', error);
		return moduleCache?.keys ?? [];
	}
}

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================

/**
 * Extract access token from a Request object
 *
 * Checks cookies first, then Authorization header as fallback.
 * Prioritizes cookies for security (httpOnly, secure).
 *
 * @example
 * ```typescript
 * // In API route
 * export const GET: RequestHandler = async ({ request }) => {
 *   const token = getTokenFromRequest(request);
 *   if (!token) {
 *     return json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // ...
 * };
 * ```
 */
export function getTokenFromRequest(request: Request): string | null {
	// Try cookie first (preferred for security)
	const cookieHeader = request.headers.get('Cookie');
	if (cookieHeader) {
		const cookies = parseCookieHeader(cookieHeader);
		const token = cookies[COOKIE_CONFIG.NAMES.ACCESS_TOKEN];
		if (token) return token;
	}

	// Fall back to Authorization header
	const authHeader = request.headers.get('Authorization');
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.slice(7);
	}

	return null;
}

// =============================================================================
// BASE64URL UTILITIES
// =============================================================================

/**
 * Base64URL decode to ArrayBuffer (for crypto.subtle.verify)
 */
function base64UrlDecode(input: string): ArrayBuffer {
	const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
	const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

// =============================================================================
// TOKEN VALIDATION
// =============================================================================

/**
 * Validate a JWT with cryptographic signature verification via JWKS
 *
 * Uses KV caching when env.AUTH_CACHE is provided for robust
 * cross-instance caching in Cloudflare Workers.
 *
 * @param token - The JWT access token to validate
 * @param env - Optional environment with AUTH_CACHE KV namespace
 * @returns User object if valid, null otherwise
 *
 * @example
 * ```typescript
 * // In SvelteKit +page.server.ts
 * import { validateToken, getTokenFromRequest } from '@create-something/canon/auth/server';
 *
 * export const load: PageServerLoad = async ({ request, platform }) => {
 *   const token = getTokenFromRequest(request);
 *   const user = token
 *     ? await validateToken(token, platform?.env)
 *     : null;
 *   return { user };
 * };
 * ```
 *
 * @example
 * ```typescript
 * // In Cloudflare Worker
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     const token = getTokenFromRequest(request);
 *     const user = await validateToken(token, env);
 *     if (!user) {
 *       return new Response('Unauthorized', { status: 401 });
 *     }
 *     // ...
 *   }
 * };
 * ```
 */
export async function validateToken(token: string, env?: AuthEnv): Promise<User | null> {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		// Parse header to get key ID
		const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))) as {
			kid?: string;
			alg?: string;
		};
		const kid = header.kid;

		// Verify algorithm
		if (header.alg !== 'ES256') return null;

		// Get public key from JWKS (with KV caching)
		const keys = await fetchJWKS(env);
		const jwk = keys.find((k) => k.kid === kid);
		if (!jwk) return null;

		// Import public key
		const publicKey = await crypto.subtle.importKey(
			'jwk',
			{ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
			{ name: 'ECDSA', namedCurve: 'P-256' },
			true,
			['verify']
		);

		// Verify signature
		const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
		const signature = base64UrlDecode(signatureB64);

		const valid = await crypto.subtle.verify(
			{ name: 'ECDSA', hash: 'SHA-256' },
			publicKey,
			signature,
			data
		);

		if (!valid) return null;

		// Parse and validate payload
		const payload = JSON.parse(
			atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
		) as JWTPayload;

		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) return null;

		// Check issuer
		if (payload.iss !== SESSION_CONFIG.IDENTITY_ENDPOINT) return null;

		return {
			id: payload.sub,
			email: payload.email,
			tier: payload.tier,
			source: payload.source,
		};
	} catch {
		return null;
	}
}

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/** Error thrown when authentication is required but not provided */
export class AuthenticationError extends Error {
	constructor(message = 'Authentication required') {
		super(message);
		this.name = 'AuthenticationError';
	}
}

/**
 * Require authentication, throwing if not authenticated
 *
 * Use this when a route absolutely requires a valid user.
 * Throws AuthenticationError if token is missing or invalid.
 *
 * @param request - The incoming request
 * @param env - Optional environment with AUTH_CACHE KV namespace
 * @returns User object (never null - throws instead)
 * @throws AuthenticationError if not authenticated
 *
 * @example
 * ```typescript
 * // In SvelteKit +page.server.ts
 * import { requireAuth } from '@create-something/canon/auth/server';
 * import { error } from '@sveltejs/kit';
 *
 * export const load: PageServerLoad = async ({ request, platform }) => {
 *   try {
 *     const user = await requireAuth(request, platform?.env);
 *     return { user };
 *   } catch (e) {
 *     throw error(401, 'Unauthorized');
 *   }
 * };
 * ```
 *
 * @example
 * ```typescript
 * // In Cloudflare Worker
 * import { requireAuth, AuthenticationError } from '@create-something/canon/auth/server';
 *
 * export default {
 *   async fetch(request: Request, env: Env) {
 *     try {
 *       const user = await requireAuth(request, env);
 *       return new Response(`Hello, ${user.email}`);
 *     } catch (e) {
 *       if (e instanceof AuthenticationError) {
 *         return new Response('Unauthorized', { status: 401 });
 *       }
 *       throw e;
 *     }
 *   }
 * };
 * ```
 */
export async function requireAuth(request: Request, env?: AuthEnv): Promise<User> {
	const token = getTokenFromRequest(request);
	if (!token) {
		throw new AuthenticationError('No authentication token provided');
	}

	const user = await validateToken(token, env);
	if (!user) {
		throw new AuthenticationError('Invalid or expired token');
	}

	return user;
}

/**
 * Get optional user from request (does not throw)
 *
 * Use this when authentication is optional but you want user info if available.
 *
 * @param request - The incoming request
 * @param env - Optional environment with AUTH_CACHE KV namespace
 * @returns User object if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * // In SvelteKit +layout.server.ts
 * import { getOptionalUser } from '@create-something/canon/auth/server';
 *
 * export const load: LayoutServerLoad = async ({ request, platform }) => {
 *   const user = await getOptionalUser(request, platform?.env);
 *   return { user }; // null if not authenticated
 * };
 * ```
 */
export async function getOptionalUser(request: Request, env?: AuthEnv): Promise<User | null> {
	const token = getTokenFromRequest(request);
	if (!token) return null;

	return validateToken(token, env);
}

/**
 * Clear JWKS cache (useful for testing or forced refresh)
 *
 * Clears both module-level cache and optionally KV cache.
 *
 * @param env - Optional environment with AUTH_CACHE KV namespace
 */
export async function clearJWKSCache(env?: AuthEnv): Promise<void> {
	moduleCache = null;

	if (env?.AUTH_CACHE) {
		try {
			await env.AUTH_CACHE.delete(JWKS_KV_KEY);
		} catch {
			// Ignore delete failures
		}
	}
}
