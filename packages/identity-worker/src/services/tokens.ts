/**
 * Token Services
 *
 * JWT generation and validation using ES256 (ECDSA P-256).
 *
 * Canon: Tokens are promises—short-lived, verifiable, transparent.
 */

import type { JWTPayload, JWK, JWKS, User, SigningKey, Env } from '../types';
import { generateSecureToken, hashToken, generateUUID } from './crypto';
import {
	getActiveSigningKey,
	getAllActivePublicKeys,
	createSigningKey,
	createRefreshToken,
	findRefreshTokenByHash,
	revokeRefreshToken,
	revokeTokenFamily,
} from '../db/queries';

// Token configuration
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const ISSUER = 'https://id.createsomething.space';
const AUDIENCES = ['workway', 'templates', 'io', 'space'];

/**
 * Generate access and refresh tokens for a user
 */
export async function generateTokens(
	db: D1Database,
	user: User
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
	const signingKey = await getOrCreateSigningKey(db);
	const now = Math.floor(Date.now() / 1000);

	// Generate access token (JWT)
	const payload: JWTPayload = {
		sub: user.id,
		email: user.email,
		tier: user.tier,
		source: user.source,
		iss: ISSUER,
		aud: AUDIENCES,
		iat: now,
		exp: now + ACCESS_TOKEN_TTL,
	};

	const accessToken = await signJWT(payload, signingKey);

	// Generate refresh token (opaque)
	const refreshToken = generateSecureToken(48);
	const tokenHash = await hashToken(refreshToken);
	const familyId = generateUUID();
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000).toISOString();

	await createRefreshToken(db, {
		id: generateUUID(),
		user_id: user.id,
		token_hash: tokenHash,
		family_id: familyId,
		expires_at: expiresAt,
	});

	return {
		accessToken,
		refreshToken,
		expiresIn: ACCESS_TOKEN_TTL,
	};
}

/**
 * Refresh tokens using a valid refresh token
 *
 * Implements token rotation: old token is revoked, new one issued.
 * If a revoked token is reused, the entire family is revoked (compromise detection).
 */
export async function refreshTokens(
	db: D1Database,
	refreshToken: string,
	user: User
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
	const tokenHash = await hashToken(refreshToken);
	const storedToken = await findRefreshTokenByHash(db, tokenHash);

	if (!storedToken) {
		// Token not found or already revoked
		// Could be token reuse attack - but we can't detect family without the token
		return null;
	}

	// Check expiration
	if (new Date(storedToken.expires_at) < new Date()) {
		await revokeRefreshToken(db, storedToken.id);
		return null;
	}

	// Check if token was revoked (reuse detection)
	if (storedToken.revoked_at) {
		// Token reuse detected! Revoke the entire family
		await revokeTokenFamily(db, storedToken.family_id);
		return null;
	}

	// Revoke current token
	await revokeRefreshToken(db, storedToken.id);

	// Generate new token pair with same family
	const signingKey = await getOrCreateSigningKey(db);
	const now = Math.floor(Date.now() / 1000);

	const payload: JWTPayload = {
		sub: user.id,
		email: user.email,
		tier: user.tier,
		source: user.source,
		iss: ISSUER,
		aud: AUDIENCES,
		iat: now,
		exp: now + ACCESS_TOKEN_TTL,
	};

	const accessToken = await signJWT(payload, signingKey);

	// New refresh token in same family
	const newRefreshToken = generateSecureToken(48);
	const newTokenHash = await hashToken(newRefreshToken);
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000).toISOString();

	await createRefreshToken(db, {
		id: generateUUID(),
		user_id: user.id,
		token_hash: newTokenHash,
		family_id: storedToken.family_id,
		expires_at: expiresAt,
	});

	return {
		accessToken,
		refreshToken: newRefreshToken,
		expiresIn: ACCESS_TOKEN_TTL,
	};
}

/**
 * Validate a JWT and return the payload
 */
export async function validateJWT(
	token: string,
	publicKey: CryptoKey
): Promise<JWTPayload | null> {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

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
		const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload;

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
 * Get JWKS (JSON Web Key Set) for public key distribution
 */
export async function getJWKS(db: D1Database): Promise<JWKS> {
	const keys = await getAllActivePublicKeys(db);

	const jwks: JWK[] = await Promise.all(
		keys.map(async (key) => {
			const publicKey = JSON.parse(key.public_key);
			return {
				kty: 'EC',
				crv: 'P-256',
				x: publicKey.x,
				y: publicKey.y,
				kid: key.id,
				alg: 'ES256',
				use: 'sig',
			};
		})
	);

	return { keys: jwks };
}

/**
 * Import a public key from JWK for validation
 */
export async function importPublicKey(jwk: JWK): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'jwk',
		{
			kty: jwk.kty,
			crv: jwk.crv,
			x: jwk.x,
			y: jwk.y,
		},
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['verify']
	);
}

// Internal helpers

async function getOrCreateSigningKey(db: D1Database): Promise<SigningKey> {
	let key = await getActiveSigningKey(db);

	if (!key) {
		// Generate new ES256 key pair
		const keyPair = (await crypto.subtle.generateKey(
			{ name: 'ECDSA', namedCurve: 'P-256' },
			true,
			['sign', 'verify']
		)) as CryptoKeyPair;

		const privateJWK = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
		const publicJWK = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

		const keyId = generateUUID();

		await createSigningKey(db, {
			id: keyId,
			private_key: JSON.stringify(privateJWK),
			public_key: JSON.stringify(publicJWK),
			algorithm: 'ES256',
		});

		key = (await getActiveSigningKey(db))!;
	}

	return key;
}

async function signJWT(payload: JWTPayload, signingKey: SigningKey): Promise<string> {
	const header = { alg: 'ES256', typ: 'JWT', kid: signingKey.id };

	const headerB64 = base64UrlEncode(JSON.stringify(header));
	const payloadB64 = base64UrlEncode(JSON.stringify(payload));

	const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

	const privateKey = await crypto.subtle.importKey(
		'jwk',
		JSON.parse(signingKey.private_key),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);

	const signatureB64 = base64UrlEncode(new Uint8Array(signature));

	return `${headerB64}.${payloadB64}.${signatureB64}`;
}

function base64UrlEncode(input: string | Uint8Array): string {
	const str = typeof input === 'string' ? btoa(input) : btoa(String.fromCharCode(...input));
	return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(input: string): Uint8Array {
	const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
	const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
