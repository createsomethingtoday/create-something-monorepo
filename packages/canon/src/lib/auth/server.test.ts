import { describe, expect, it } from 'vitest';
import { verifyIdentityToken } from './server.js';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

async function createIdentityToken(input: {
	issuer: string;
	audience: string;
	expiresAt: number;
}) {
	const keyPair = await crypto.subtle.generateKey(
		{
			name: 'ECDSA',
			namedCurve: 'P-256',
		},
		true,
		['sign', 'verify'],
	);
	const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
		kid: string;
		alg: string;
		use: string;
	};
	publicJwk.kid = 'identity-test-key';
	publicJwk.alg = 'ES256';
	publicJwk.use = 'sig';

	const signingInput = [
		encodeBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: publicJwk.kid })),
		encodeBase64Url(
			JSON.stringify({
				sub: 'user_staff',
				email: 'operator@createsomething.io',
				tier: 'agency',
				source: 'io',
				kind: 'identity_access_token',
				session_version: 2,
				email_verified: true,
				iss: input.issuer,
				aud: [input.audience],
				iat: input.expiresAt - 300,
				exp: input.expiresAt,
			}),
		),
	].join('.');
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		keyPair.privateKey,
		new TextEncoder().encode(signingInput),
	);

	return {
		token: `${signingInput}.${encodeBase64Url(signature)}`,
		jwks: { keys: [publicJwk] },
	};
}

describe('verifyIdentityToken', () => {
	it('verifies an owned identity token through explicit provider configuration', async () => {
		const issuer = 'https://identity.example.test';
		const audience = 'ona-agents';
		const nowSeconds = 1_800_000_000;
		const { token, jwks } = await createIdentityToken({
			issuer,
			audience,
			expiresAt: nowSeconds + 300,
		});

		const identity = await verifyIdentityToken(token, {
			issuer,
			audience,
			jwksUrl: `${issuer}/.well-known/jwks.json`,
			fetch: async () => Response.json(jwks),
			now: () => nowSeconds,
		});

		expect(identity).toMatchObject({
			subject: 'user_staff',
			email: 'operator@createsomething.io',
			issuer,
			tier: 'agency',
			source: 'io',
		});
	});

	it('rejects provider, audience, expiry, and signature mismatches', async () => {
		const issuer = 'https://identity-negative.example.test';
		const audience = 'ona-agents';
		const nowSeconds = 1_800_000_000;
		const { token, jwks } = await createIdentityToken({
			issuer,
			audience,
			expiresAt: nowSeconds + 300,
		});
		const baseConfig = {
			issuer,
			audience,
			jwksUrl: `${issuer}/.well-known/jwks.json`,
			fetch: async () => Response.json(jwks),
			now: () => nowSeconds,
		};

		expect(await verifyIdentityToken(token, { ...baseConfig, issuer: 'https://wrong.test' })).toBeNull();
		expect(await verifyIdentityToken(token, { ...baseConfig, audience: 'another-app' })).toBeNull();
		expect(
			await verifyIdentityToken(token, { ...baseConfig, now: () => nowSeconds + 301 }),
		).toBeNull();
		const tokenParts = token.split('.');
		const tamperedToken = `${tokenParts[0]}.${tokenParts[1]}.${tokenParts[2]}A`;
		expect(await verifyIdentityToken(tamperedToken, baseConfig)).toBeNull();
	});
});
