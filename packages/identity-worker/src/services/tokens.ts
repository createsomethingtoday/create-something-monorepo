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
import {
	IDENTITY_SESSION_VERSION,
	IDENTITY_APPLICATION_AUDIENCES,
	isIdentityApplicationAudience,
	type IdentityApplicationAudience,
} from '@create-something/auth-platform';
export const IDENTITY_TOKEN_AUDIENCES = Object.values(IDENTITY_APPLICATION_AUDIENCES);

// Token configuration
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const ISSUER = 'https://id.createsomething.space';
/**
 * Generate access and refresh tokens for a user
 */
export async function generateTokens(
	db: D1Database,
	user: User,
	audience: IdentityApplicationAudience
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
	if (!isIdentityApplicationAudience(audience) || user.deleted_at || user.email_verified !== 1) {
		throw new Error('active_verified_identity_required');
	}
	const signingKey = await getOrCreateSigningKey(db);
	const now = Math.floor(Date.now() / 1000);

	// Generate access token (JWT)
	const payload: JWTPayload = {
		sub: user.id,
		email: user.email,
		tier: user.tier,
		source: user.source,
		iss: ISSUER,
		aud: [audience],
		iat: now,
		exp: now + ACCESS_TOKEN_TTL,
		kind: 'identity_access_token',
		email_verified: true,
		session_version: IDENTITY_SESSION_VERSION,
	};

	const accessToken = await signJWT(payload as unknown as Record<string, unknown>, signingKey);

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
		audience,
	});

	return {
		accessToken,
		refreshToken,
		expiresIn: ACCESS_TOKEN_TTL,
	};
}

export async function createSignedToken(
	db: D1Database,
	payload: Record<string, unknown>
): Promise<string> {
	const signingKey = await getOrCreateSigningKey(db);
	return signJWT(payload, signingKey);
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
	if (!isIdentityApplicationAudience(storedToken.audience) || user.deleted_at || user.email_verified !== 1) return null;
	const audience = storedToken.audience;

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
		aud: [audience],
		iat: now,
		exp: now + ACCESS_TOKEN_TTL,
		kind: 'identity_access_token',
		email_verified: true,
		session_version: IDENTITY_SESSION_VERSION,
	};

	const accessToken = await signJWT(payload as unknown as Record<string, unknown>, signingKey);

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
		audience,
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
	publicKey: CryptoKey,
	expectedIssuer = ISSUER
): Promise<JWTPayload | null> {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		// Verify signature
		const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
		const joseSignature = base64UrlDecode(signatureB64);
		const valid =
			await crypto.subtle.verify(
				{ name: 'ECDSA', hash: 'SHA-256' },
				publicKey,
				joseSignature,
				data
			)
			|| await crypto.subtle.verify(
				{ name: 'ECDSA', hash: 'SHA-256' },
				publicKey,
				joseToDerSignature(joseSignature),
				data
			);

		if (!valid) return null;

		// Parse and validate payload
		const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload;

		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) return null;

		// Check issuer
		if (payload.iss !== expectedIssuer.replace(/\/+$/, '')) return null;

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

async function signJWT(payload: Record<string, unknown>, signingKey: SigningKey): Promise<string> {
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

	const runtimeSignature = new Uint8Array(signature);
	const joseSignature = normalizeRuntimeSignatureToJose(runtimeSignature, 64);
	const signatureB64 = base64UrlEncode(joseSignature);

	return `${headerB64}.${payloadB64}.${signatureB64}`;
}

function derToJoseSignature(der: Uint8Array, outputLength: number): Uint8Array {
	if (der.length === outputLength) {
		return der;
	}
	if (der[0] !== 0x30) {
		throw new Error('Invalid DER signature');
	}

	let offset = 2;
	if ((der[1] & 0x80) !== 0) {
		const lengthBytes = der[1] & 0x7f;
		offset = 2 + lengthBytes;
	}

	if (der[offset] !== 0x02) {
		throw new Error('Invalid DER signature');
	}
	const rLength = der[offset + 1];
	const r = der.slice(offset + 2, offset + 2 + rLength);
	offset = offset + 2 + rLength;

	if (der[offset] !== 0x02) {
		throw new Error('Invalid DER signature');
	}
	const sLength = der[offset + 1];
	const s = der.slice(offset + 2, offset + 2 + sLength);

	const jose = new Uint8Array(outputLength);
	const half = outputLength / 2;
	jose.set(trimAndPadSignaturePart(r, half), 0);
	jose.set(trimAndPadSignaturePart(s, half), half);
	return jose;
}

function joseToDerSignature(jose: Uint8Array): Uint8Array {
	if (jose.length % 2 !== 0) {
		throw new Error('Invalid JOSE signature length');
	}

	const half = jose.length / 2;
	const r = jose.slice(0, half);
	const s = jose.slice(half);
	const derR = encodeDerInteger(r);
	const derS = encodeDerInteger(s);
	const totalLength = derR.length + derS.length;

	if (totalLength < 128) {
		const out = new Uint8Array(2 + totalLength);
		out[0] = 0x30;
		out[1] = totalLength;
		out.set(derR, 2);
		out.set(derS, 2 + derR.length);
		return out;
	}

	const out = new Uint8Array(3 + totalLength);
	out[0] = 0x30;
	out[1] = 0x81;
	out[2] = totalLength;
	out.set(derR, 3);
	out.set(derS, 3 + derR.length);
	return out;
}

function normalizeRuntimeSignatureToJose(signature: Uint8Array, outputLength: number): Uint8Array {
	if (signature.length === outputLength) {
		return signature;
	}
	return derToJoseSignature(signature, outputLength);
}

function trimAndPadSignaturePart(part: Uint8Array, size: number): Uint8Array {
	let trimmed = part;
	while (trimmed.length > 0 && trimmed[0] === 0x00) {
		trimmed = trimmed.slice(1);
	}
	if (trimmed.length > size) {
		throw new Error('Invalid ECDSA signature component');
	}
	const out = new Uint8Array(size);
	out.set(trimmed, size - trimmed.length);
	return out;
}

function encodeDerInteger(part: Uint8Array): Uint8Array {
	let trimmed = part;
	while (trimmed.length > 1 && trimmed[0] === 0x00) {
		trimmed = trimmed.slice(1);
	}
	if ((trimmed[0] ?? 0) & 0x80) {
		const prefixed = new Uint8Array(trimmed.length + 1);
		prefixed[0] = 0x00;
		prefixed.set(trimmed, 1);
		trimmed = prefixed;
	}
	const out = new Uint8Array(2 + trimmed.length);
	out[0] = 0x02;
	out[1] = trimmed.length;
	out.set(trimmed, 2);
	return out;
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
