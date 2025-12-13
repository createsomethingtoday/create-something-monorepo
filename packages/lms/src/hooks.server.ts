/**
 * LMS Server Hooks
 *
 * Validates JWT tokens from Identity Worker and populates locals.user.
 * Handles automatic token refresh when access token expires.
 *
 * Canon: The authentication infrastructure disappears; only the unified self remains.
 */

import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const IDENTITY_WORKER = 'https://id.createsomething.space';
const ISSUER = 'https://id.createsomething.space';

// Cache JWKS for 5 minutes
let jwksCache: { keys: JWK[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL = 5 * 60 * 1000;

interface JWK {
	kty: string;
	crv: string;
	x: string;
	y: string;
	kid: string;
	alg: string;
	use: string;
}

interface JWTPayload {
	sub: string;
	email: string;
	tier: 'free' | 'pro' | 'agency';
	source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
	iss: string;
	aud: string[];
	iat: number;
	exp: number;
}

export const handle: Handle = async ({ event, resolve }) => {
	const accessToken = event.cookies.get('cs_access_token');
	const refreshToken = event.cookies.get('cs_refresh_token');

	if (accessToken) {
		// Try to validate the access token
		const payload = await validateJWT(accessToken);

		if (payload) {
			event.locals.user = {
				id: payload.sub,
				email: payload.email,
				tier: payload.tier,
				source: payload.source,
			};
		} else if (refreshToken) {
			// Access token invalid/expired, try to refresh
			const newTokens = await refreshTokens(refreshToken);

			if (newTokens) {
				// Set new cookies
				event.cookies.set('cs_access_token', newTokens.access_token, {
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					maxAge: newTokens.expires_in,
				});
				event.cookies.set('cs_refresh_token', newTokens.refresh_token, {
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'lax',
					maxAge: 7 * 24 * 60 * 60, // 7 days
				});

				// Parse the new token to get user info
				const newPayload = decodeJWT(newTokens.access_token);
				if (newPayload) {
					event.locals.user = {
						id: newPayload.sub,
						email: newPayload.email,
						tier: newPayload.tier,
						source: newPayload.source,
					};
				}
			} else {
				// Refresh failed, clear cookies
				event.cookies.delete('cs_access_token', { path: '/' });
				event.cookies.delete('cs_refresh_token', { path: '/' });
			}
		}
	}

	// Protected routes - require authentication
	const protectedPaths = ['/learn', '/progress', '/account'];
	const isProtected = protectedPaths.some((path) => event.url.pathname.startsWith(path));

	if (isProtected && !event.locals.user) {
		throw redirect(302, `/login?redirect=${encodeURIComponent(event.url.pathname)}`);
	}

	return resolve(event);
};

/**
 * Fetch JWKS from Identity Worker (with caching)
 */
async function getJWKS(): Promise<JWK[]> {
	if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_CACHE_TTL) {
		return jwksCache.keys;
	}

	try {
		const response = await fetch(`${IDENTITY_WORKER}/.well-known/jwks.json`);
		if (!response.ok) {
			console.error('Failed to fetch JWKS:', response.status);
			return jwksCache?.keys ?? [];
		}

		const data = (await response.json()) as { keys: JWK[] };
		jwksCache = { keys: data.keys, fetchedAt: Date.now() };
		return data.keys;
	} catch (error) {
		console.error('JWKS fetch error:', error);
		return jwksCache?.keys ?? [];
	}
}

/**
 * Validate a JWT and return the payload
 */
async function validateJWT(token: string): Promise<JWTPayload | null> {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		// Parse header to get kid
		const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
		const kid = header.kid;

		// Get public key from JWKS
		const keys = await getJWKS();
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
		if (payload.iss !== ISSUER) return null;

		return payload;
	} catch {
		return null;
	}
}

/**
 * Decode a JWT without verification (for reading payload after validation)
 */
function decodeJWT(token: string): JWTPayload | null {
	try {
		const [, payloadB64] = token.split('.');
		if (!payloadB64) return null;

		return JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload;
	} catch {
		return null;
	}
}

/**
 * Refresh tokens via Identity Worker
 */
async function refreshTokens(
	refreshToken: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
	try {
		const response = await fetch(`${IDENTITY_WORKER}/v1/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refresh_token: refreshToken }),
		});

		if (!response.ok) return null;

		return response.json();
	} catch {
		return null;
	}
}

/**
 * Base64URL decode
 */
function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
	const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
	const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
