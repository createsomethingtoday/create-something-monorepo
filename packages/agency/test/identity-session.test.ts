import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyAgencyIdentitySession } from '../src/lib/server/agency-identity-session.ts';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString(
		'base64url',
	);
}

async function createIdentityToken(input: { issuer: string; audience: string }) {
	const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify',
	]);
	const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
		kid: string;
		alg: string;
		use: string;
	};
	publicJwk.kid = 'agency-identity-test-key';
	publicJwk.alg = 'ES256';
	publicJwk.use = 'sig';
	const now = Math.floor(Date.now() / 1000);
	const signingInput = [
		encodeBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: publicJwk.kid })),
		encodeBase64Url(
			JSON.stringify({
				sub: 'usr_customer',
				email: 'owner@example.com',
				tier: 'agency',
				source: 'space',
				iss: input.issuer,
				aud: [input.audience],
				kind: 'identity_access_token',
				session_version: 2,
				email_verified: true,
				iat: now - 30,
				exp: now + 300,
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

test('agency accepts only a cryptographically valid Identity customer-workspace session', async () => {
	const issuer = 'https://identity.example.test';
	const audience = 'client-workspace';
	const { token, jwks } = await createIdentityToken({ issuer, audience });
	const platform = {
		env: {
			CS_IDENTITY_ISSUER: issuer,
			CS_IDENTITY_JWKS_URL: `${issuer}/.well-known/jwks.json`,
			CS_IDENTITY_AUDIENCE: audience,
		},
	} as never;

	const user = await verifyAgencyIdentitySession({
		cookies: { get: (name: string) => (name === 'cs_access_token' ? token : undefined) },
		platform,
		fetch: async () => Response.json(jwks),
	});
	assert.deepEqual(user, {
		id: 'usr_customer',
		email: 'owner@example.com',
		tier: 'agency',
		source: 'space',
	});

	const wrongAudience = await verifyAgencyIdentitySession({
		cookies: { get: (name: string) => (name === 'cs_access_token' ? token : undefined) },
		platform: {
			env: {
				CS_IDENTITY_ISSUER: issuer,
				CS_IDENTITY_JWKS_URL: `${issuer}/.well-known/jwks.json`,
				CS_IDENTITY_AUDIENCE: 'another-application',
			},
		} as never,
		fetch: async () => Response.json(jwks),
	});
	assert.equal(wrongAudience, null);

	const ambiguousAudience = await verifyAgencyIdentitySession({
		cookies: { get: (name: string) => (name === 'cs_access_token' ? token : undefined) },
		platform: {
			env: {
				CS_IDENTITY_ISSUER: issuer,
				CS_IDENTITY_JWKS_URL: `${issuer}/.well-known/jwks.json`,
				CS_IDENTITY_AUDIENCE: 'client-workspace,agency',
			},
		} as never,
		fetch: async () => Response.json(jwks),
	});
	assert.equal(ambiguousAudience, null);
});
