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
import { getAuth0Config } from './auth0.js';
import { isCurrentIdentitySession } from '@create-something/auth-platform';

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

const JWKS_KV_TTL = SESSION_CONFIG.JWKS_CACHE_TTL; // seconds

// Module-level fallback cache (used when KV is not available)
const moduleCache = new Map<string, CachedJWKS>();

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
async function fetchJWKS(
	jwksUrl: string,
	env?: AuthEnv,
	runtimeFetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<JWK[]> {
	const now = Date.now();
	const ttlMs = JWKS_KV_TTL * 1000;
	const cacheKey = `identity:jwks:${jwksUrl}`;

	// Try KV cache first
	if (env?.AUTH_CACHE) {
		try {
			const cached = await env.AUTH_CACHE.get(cacheKey, 'json') as CachedJWKS | null;
			if (cached && now - cached.fetchedAt < ttlMs) {
				// Also update module cache for faster subsequent calls
				moduleCache.set(cacheKey, cached);
				return cached.keys;
			}
		} catch {
			// KV read failed, fall through to module cache
		}
	}

	// Try module cache
	const cachedModuleEntry = moduleCache.get(cacheKey);
	if (cachedModuleEntry && now - cachedModuleEntry.fetchedAt < ttlMs) {
		return cachedModuleEntry.keys;
	}

	// Fetch from Identity Worker
	try {
		const response = await runtimeFetch(jwksUrl);
		if (!response.ok) {
			console.error('Failed to fetch JWKS:', response.status);
			return cachedModuleEntry?.keys ?? [];
		}

		const data = await response.json() as { keys: JWK[] };
		const cached: CachedJWKS = { keys: data.keys, fetchedAt: now };

		// Update module cache
		moduleCache.set(cacheKey, cached);

		// Update KV cache (fire and forget)
		if (env?.AUTH_CACHE) {
			try {
				await env.AUTH_CACHE.put(cacheKey, JSON.stringify(cached), {
					expirationTtl: JWKS_KV_TTL,
				});
			} catch {
				// KV write failed, continue with module cache
			}
		}

		return data.keys;
	} catch (error) {
		console.error('JWKS fetch error:', error);
		return cachedModuleEntry?.keys ?? [];
	}
}

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================

function parseJwtPayload(token: string): JWTPayload | null {
	try {
		const [, payloadB64] = token.split('.');
		if (!payloadB64) return null;
		return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload;
	} catch {
		return null;
	}
}

function getJwtProvider(payload: JWTPayload, env?: AuthEnv): { issuer: string; audience?: string; jwksUrl: string; claimsNamespace?: string } {
	const auth0Config = getAuth0Config(env);
	if (auth0Config && payload.iss === auth0Config.issuer) {
		return {
			issuer: auth0Config.issuer,
			audience: auth0Config.clientId,
			jwksUrl: auth0Config.jwksUrl,
			claimsNamespace: auth0Config.claimsNamespace,
		};
	}

	return {
		issuer: SESSION_CONFIG.IDENTITY_ENDPOINT,
		jwksUrl: `${SESSION_CONFIG.IDENTITY_ENDPOINT}/.well-known/jwks.json`,
	};
}

function getVerificationAlgorithm(alg: string): AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams {
	if (alg === 'RS256') {
		return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
	}

	return { name: 'ECDSA', namedCurve: 'P-256' };
}

function getVerificationParams(alg: string): AlgorithmIdentifier | EcdsaParams {
	if (alg === 'RS256') {
		return { name: 'RSASSA-PKCS1-v1_5' };
	}

	return { name: 'ECDSA', hash: 'SHA-256' };
}

function extractUserFromPayload(payload: JWTPayload, env?: AuthEnv): User | null {
	const auth0Config = getAuth0Config(env);
	const namespace = auth0Config?.claimsNamespace;
	const namespacePrefix = namespace ? `${namespace}/` : null;

	const tierValue =
		payload.tier ??
		(namespacePrefix ? payload[`${namespacePrefix}tier`] : undefined);
	const sourceValue =
		payload.source ??
		(namespacePrefix ? payload[`${namespacePrefix}source`] : undefined);

	const tier: User['tier'] = tierValue === 'pro' || tierValue === 'agency' ? tierValue : 'free';
	const source: User['source'] =
		sourceValue === 'workway' ||
		sourceValue === 'templates' ||
		sourceValue === 'io' ||
		sourceValue === 'space' ||
		sourceValue === 'lms'
			? sourceValue
			: 'space';

	if (typeof payload.email !== 'string' || !payload.email) {
		return null;
	}

	return {
		id: payload.sub,
		email: payload.email,
		tier,
		source,
	};
}

export interface IdentityVerificationConfig {
	issuer: string;
	jwksUrl: string;
	audience: string;
	fetch?: typeof globalThis.fetch;
	now?: () => number;
	cache?: AuthEnv;
}

export interface VerifiedIdentity {
	subject: string;
	email: string | null;
	issuer: string;
	audience: string[];
	tier: User['tier'];
	source: User['source'];
	claims: JWTPayload;
}

function normalizeAudience(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Verify a CREATE SOMETHING identity token against explicit provider configuration.
 *
 * This is the provider-neutral primitive for applications that need cryptographic
 * identity without inheriting production URLs or framework-specific runtime state.
 */
export const verifyIdentityToken = async (
	token: string,
	config: IdentityVerificationConfig,
): Promise<VerifiedIdentity | null> => {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		const header = JSON.parse(
			atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')),
		) as { kid?: string; alg?: string };
		if (!header.kid || (header.alg !== 'ES256' && header.alg !== 'RS256')) return null;

		const payload = parseJwtPayload(token);
		if (!payload || payload.iss !== config.issuer || typeof payload.sub !== 'string') return null;
		if (!isCurrentIdentitySession(payload)) return null;

		const tokenAudience = normalizeAudience(payload.aud);
		const expectedAudience = normalizeAudience(config.audience);
		if (expectedAudience.length !== 1 || tokenAudience.length !== 1 || tokenAudience[0] !== expectedAudience[0]) {
			return null;
		}

		const now = (config.now ?? (() => Math.floor(Date.now() / 1000)))();
		if (!Number.isFinite(payload.exp) || payload.exp <= now) return null;
		if (typeof payload.iat === 'number' && payload.iat > now + 60) return null;

		const keys = await fetchJWKS(config.jwksUrl, config.cache, config.fetch);
		const jwk = keys.find((candidate) => candidate.kid === header.kid);
		if (!jwk) return null;

		const publicKey = await crypto.subtle.importKey(
			'jwk',
			header.alg === 'RS256'
				? { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg }
				: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, alg: jwk.alg },
			getVerificationAlgorithm(header.alg),
			true,
			['verify'],
		);
		const valid = await crypto.subtle.verify(
			getVerificationParams(header.alg),
			publicKey,
			base64UrlDecode(signatureB64),
			new TextEncoder().encode(`${headerB64}.${payloadB64}`),
		);
		if (!valid) return null;

		const user = extractUserFromPayload(payload);
		return {
			subject: payload.sub,
			email: typeof payload.email === 'string' ? payload.email : null,
			issuer: payload.iss,
			audience: tokenAudience,
			tier: user?.tier ?? 'free',
			source: user?.source ?? 'space',
			claims: payload,
		};
	} catch {
		return null;
	}
};

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
 * Validate a third-party JWT with cryptographic signature verification via JWKS.
 *
 * First-party CREATE SOMETHING Identity tokens are intentionally rejected here
 * because this compatibility API has no required application audience. Owned
 * consumers must use `verifyIdentityToken` with explicit issuer, JWKS URL, and
 * one exact audience.
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
		if (header.alg !== 'ES256' && header.alg !== 'RS256') return null;

		const payload = parseJwtPayload(token);
		if (!payload) return null;
		if (payload.iss?.replace(/\/+$/, '') === SESSION_CONFIG.IDENTITY_ENDPOINT) return null;
		const provider = getJwtProvider(payload, env);
		if (payload.iss !== provider.issuer) return null;

		const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
		if (provider.audience && !audience.includes(provider.audience)) return null;

		// Get public key from JWKS (with KV caching)
		const keys = await fetchJWKS(provider.jwksUrl, env);
		const jwk = keys.find((k) => k.kid === kid);
		if (!jwk) return null;

		// Import public key
		const publicKey = await crypto.subtle.importKey(
			'jwk',
			header.alg === 'RS256'
				? { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: jwk.alg }
				: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, alg: jwk.alg },
			getVerificationAlgorithm(header.alg),
			true,
			['verify']
		);

		// Verify signature
		const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
		const signature = base64UrlDecode(signatureB64);

		const valid = await crypto.subtle.verify(
			getVerificationParams(header.alg),
			publicKey,
			signature,
			data
		);

		if (!valid) return null;

		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) return null;

		return extractUserFromPayload(payload, env);
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
	moduleCache.clear();

	void env;
}
