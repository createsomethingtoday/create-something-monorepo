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
		fetch: async (url) => String(url).endsWith('/v1/users/me')
			? Response.json({ id: 'usr_customer', analytics_opt_out: false })
			: Response.json(jwks),
	});
	assert.deepEqual(user, {
		id: 'usr_customer',
		email: 'owner@example.com',
		tier: 'agency',
		source: 'space',
		analytics_opt_out: false,
		analytics_preference_verified: true,
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

test('account privacy preference is freshly loaded for the verified subject, including failure paths', async () => {
	const issuer = 'https://identity-privacy.example.test';
	const { token, jwks } = await createIdentityToken({ issuer, audience: 'client-workspace' });
	const platform = { env: { CS_IDENTITY_ISSUER: issuer, CS_IDENTITY_JWKS_URL: `${issuer}/.well-known/jwks.json`, CS_IDENTITY_AUDIENCE: 'client-workspace' } } as never;
	let profile: unknown = { id: 'usr_customer', analytics_opt_out: false };
	let unavailable = false;
	const profileRequests: RequestInit[] = [];
	const fetchProfile: typeof fetch = async (url, init) => {
		if (!String(url).endsWith('/v1/users/me')) return Response.json(jwks);
		assert.equal(String(url), `${issuer}/v1/users/me`);
		assert.equal(new Headers(init?.headers).get('Authorization'), `Bearer ${token}`);
		assert.equal(init?.cache, 'no-store');
		assert.equal(init?.redirect, 'error');
		profileRequests.push(init ?? {});
		if (unavailable) return new Response(null, { status: 503 });
		return Response.json(profile);
	};
	const resolve = () => verifyAgencyIdentitySession({ cookies: { get: name => name === 'cs_access_token' ? token : undefined }, platform, fetch: fetchProfile });
	assert.equal((await resolve())?.analytics_opt_out, false);
	profile = { id: 'usr_customer', analytics_opt_out: true };
	assert.equal((await resolve())?.analytics_opt_out, true, 'same JWT must observe a newer account opt-out');
	assert.equal((await resolve())?.analytics_preference_verified, true);
	for (const invalid of [{ id: 'another_user', analytics_opt_out: false }, { id: 'usr_customer' }, { id: 'usr_customer', analytics_opt_out: 'false' }]) {
		profile = invalid;
		const user = await resolve();
		assert.equal(user?.id, 'usr_customer', 'privacy lookup must not change verified identity');
		assert.equal(user?.analytics_opt_out, true);
		assert.equal(user?.analytics_preference_verified, false);
	}
	unavailable = true;
	assert.equal((await resolve())?.analytics_preference_verified, false);
	assert.equal(profileRequests.length, 7);
});
