import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearJWKSCache, validateToken, verifyIdentityToken } from './server.js';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

async function createIdentityToken(input: {
	issuer: string;
	audience: string;
	expiresAt: number;
	kid?: string;
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
	publicJwk.kid = input.kid ?? 'identity-test-key';
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

describe('validateToken', () => {
	afterEach(async () => {
		vi.unstubAllGlobals();
		await clearJWKSCache();
	});

	it('refuses first-party Identity credentials without an explicit application audience', async () => {
		const issuer = 'https://id.createsomething.space';
		const nowSeconds = Math.floor(Date.now() / 1000);
		const { token, jwks } = await createIdentityToken({
			issuer,
			audience: 'ltd',
			expiresAt: nowSeconds + 300,
		});
		vi.stubGlobal('fetch', async () => Response.json(jwks));

		expect(await validateToken(token)).toBeNull();
	});
});


describe('bounded JWKS rotation', () => {
	afterEach(async () => { vi.restoreAllMocks(); await clearJWKSCache(); });
	const issuer = 'https://rotation.test';
	const now = 1_800_000_000;
	const config = { issuer, audience: 'io', jwksUrl: `${issuer}/jwks`, now: () => now };
	async function token(kid: string) {
		return createIdentityToken({ issuer, audience: 'io', expiresAt: now + 300, kid });
	}
	it('refreshes stale module and KV keys once after rotation and shares concurrent refresh', async () => {
		let clock = now * 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => clock);
		const old = await token('old'); const next = await token('next');
		const fetcher = vi.fn().mockResolvedValueOnce(Response.json(old.jwks));
		const cache = { AUTH_CACHE: {
			get: vi.fn(async () => ({ keys: old.jwks.keys, fetchedAt: clock - 31_000 })),
			put: vi.fn(async () => {}), delete: vi.fn(async () => {})
		} };
		// Warm the cache from KV; a subsequent unknown key must bypass it.
		expect(await verifyIdentityToken(old.token, { ...config, cache, fetch: fetcher })).not.toBeNull();
		expect(fetcher).not.toHaveBeenCalled();
		fetcher.mockReset();
		let release!: (r: Response) => void;
		fetcher.mockImplementation(() => new Promise<Response>(resolve => { release = resolve; }));
		const requests = Array.from({ length: 25 }, () => verifyIdentityToken(next.token, { ...config, cache, fetch: fetcher }));
		await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
		release(Response.json(next.jwks));
		expect((await Promise.all(requests)).every(Boolean)).toBe(true);
		// Eventually consistent KV still has the old key; the refreshed module wins.
		expect(await verifyIdentityToken(next.token, { ...config, cache, fetch: fetcher })).not.toBeNull();
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(cache.AUTH_CACHE.put).toHaveBeenCalledTimes(1);
	});
	it('does not overwrite a concurrent network rotation with a delayed stale KV result', async () => {
		const old = await token('old'); const next = await token('next');
		const stale = { keys: old.jwks.keys, fetchedAt: Date.now() - 31_000 };
		let release!: (value: typeof stale) => void;
		const get = vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValue(stale);
		const cache = { AUTH_CACHE: { get, put: vi.fn(async () => {}), delete: vi.fn(async () => {}) } };
		const fetcher = vi.fn(async () => Response.json(next.jwks));
		const delayed = verifyIdentityToken(next.token, { ...config, cache, fetch: fetcher });
		await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
		expect(await verifyIdentityToken(next.token, { ...config, cache, fetch: fetcher })).not.toBeNull();
		release(stale);
		expect(await delayed).not.toBeNull();
		expect(await verifyIdentityToken(next.token, { ...config, cache, fetch: fetcher })).not.toBeNull();
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it('bounds cold misses and arbitrary unknown kids per URL, then permits recovery', async () => {
		let clock = now * 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => clock);
		const good = await token('good'); const rotated = await token('rotated');
		const fetcher = vi.fn(async () => Response.json(good.jwks));
		expect((await Promise.all(Array.from({ length: 25 }, () => verifyIdentityToken(good.token, { ...config, fetch: fetcher })))).every(Boolean)).toBe(true);
		expect(fetcher).toHaveBeenCalledTimes(1);
		for (let n = 0; n < 20; n++) {
			const parts = rotated.token.split('.'); parts[0] = encodeBase64Url(JSON.stringify({ alg: 'ES256', kid: `missing-${n}` }));
			expect(await verifyIdentityToken(parts.join('.'), { ...config, fetch: fetcher })).toBeNull();
		}
		expect(fetcher).toHaveBeenCalledTimes(1);
		clock += 30_001;
		fetcher.mockImplementation(async () => Response.json(rotated.jwks));
		expect(await verifyIdentityToken(rotated.token, { ...config, fetch: fetcher })).not.toBeNull();
		expect(fetcher).toHaveBeenCalledTimes(2);
		const args = fetcher.mock.calls[1] as unknown as [string, RequestInit];
		expect(args[1].signal).toBeInstanceOf(AbortSignal);
		expect(args[1].redirect).toBe('error');
	});
	it('fails closed on outage and invalid documents without retry storms or expired-key fallback', async () => {
		let clock = now * 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => clock);
		const good = await token('good'); const next = await token('next');
		const fetcher = vi.fn(async () => Response.json(good.jwks));
		expect(await verifyIdentityToken(good.token, { ...config, fetch: fetcher })).not.toBeNull();
		clock += 30_001;
		fetcher.mockImplementation(async () => { throw new Error('synthetic outage'); });
		expect((await Promise.all(Array.from({ length: 20 }, () => verifyIdentityToken(next.token, { ...config, fetch: fetcher })))).every(v => v === null)).toBe(true);
		expect(fetcher).toHaveBeenCalledTimes(2);
		for (const response of [() => Response.json({ keys: null }), () => Response.json({ keys: Array(65).fill(good.jwks.keys[0]) }), () => new Response('x'.repeat(131_073)), () => Response.json({ keys: [{ ...next.jwks.keys[0], alg: 'RS256' }] })]) {
			clock += 30_001; fetcher.mockImplementation(async () => response());
			expect(await verifyIdentityToken(next.token, { ...config, fetch: fetcher })).toBeNull();
		}
		clock += 3_600_001;
		fetcher.mockImplementation(async () => new Response('', { status: 503 }));
		expect(await verifyIdentityToken(good.token, { ...config, fetch: fetcher })).toBeNull();
	});
	it('checks issuer, audience and algorithm before any key refresh', async () => {
		const good = await token('good'); const fetcher = vi.fn();
		expect(await verifyIdentityToken(good.token, { ...config, issuer: 'https://wrong.test', fetch: fetcher })).toBeNull();
		expect(await verifyIdentityToken(good.token, { ...config, audience: 'ltd', fetch: fetcher })).toBeNull();
		const parts = good.token.split('.'); parts[0] = encodeBase64Url(JSON.stringify({ alg: 'none', kid: 'new' }));
		expect(await verifyIdentityToken(parts.join('.'), { ...config, fetch: fetcher })).toBeNull();
		expect(fetcher).not.toHaveBeenCalled();
	});
});
