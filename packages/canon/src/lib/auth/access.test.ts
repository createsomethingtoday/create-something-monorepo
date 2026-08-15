import { describe, expect, it } from 'vitest';
import { resolveApplicationAccess } from './access.js';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

async function createSignedIdentity(input: {
	email: string;
	issuer: string;
	audience: string;
	now: number;
}) {
	const keyPair = await crypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify'],
	);
	const publicJwk = (await crypto.subtle.exportKey('jwk', keyPair.publicKey)) as JsonWebKey & {
		kid: string;
		alg: string;
		use: string;
	};
	publicJwk.kid = 'access-test-key';
	publicJwk.alg = 'ES256';
	publicJwk.use = 'sig';
	const signingInput = [
		encodeBase64Url(JSON.stringify({ alg: 'ES256', kid: publicJwk.kid, typ: 'JWT' })),
		encodeBase64Url(
			JSON.stringify({
				sub: 'user_staff',
				email: input.email,
				tier: 'agency',
				source: 'io',
				kind: 'identity_access_token',
				session_version: 2,
				email_verified: true,
				iss: input.issuer,
				aud: [input.audience],
				iat: input.now,
				exp: input.now + 300,
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

describe('resolveApplicationAccess', () => {
	it('allows a verified identity only when the application policy matches', async () => {
		const issuer = 'https://identity.example.test';
		const audience = 'ona-agents';
		const now = 1_800_000_000;
		const { token, jwks } = await createSignedIdentity({
			email: 'operator@createsomething.io',
			issuer,
			audience,
			now,
		});

		const access = await resolveApplicationAccess({
			request: new Request('https://agents.example.test/agents', {
				headers: { Authorization: `Bearer ${token}` },
			}),
			signInUrl: '/sign-in',
			verification: {
				issuer,
				audience,
				jwksUrl: `${issuer}/.well-known/jwks.json`,
				fetch: async () => Response.json(jwks),
				now: () => now,
			},
			policy: {
				allowedEmailDomains: ['createsomething.io'],
			},
		});

		expect(access).toMatchObject({
			status: 'allowed',
			source: 'identity',
			subject: 'user_staff',
			email: 'operator@createsomething.io',
			signInUrl: '/sign-in',
		});
	});

	it('blocks a valid identity that does not match an explicit allow rule', async () => {
		const issuer = 'https://identity-blocked.example.test';
		const audience = 'ona-agents';
		const now = 1_800_000_000;
		const { token, jwks } = await createSignedIdentity({
			email: 'outsider@example.com',
			issuer,
			audience,
			now,
		});
		const access = await resolveApplicationAccess({
			request: new Request('https://agents.example.test/agents', {
				headers: { Authorization: `Bearer ${token}` },
			}),
			verification: {
				issuer,
				audience,
				jwksUrl: `${issuer}/.well-known/jwks.json`,
				fetch: async () => Response.json(jwks),
				now: () => now,
			},
			policy: { allowedEmailDomains: ['createsomething.io'] },
		});

		expect(access.status).toBe('blocked');
		expect(access.source).toBe('identity');
	});

	it('reports anonymous requests and fails closed when preview is enabled in production', async () => {
		const verification = {
			issuer: 'https://identity.example.test',
			audience: 'ona-agents',
			jwksUrl: 'https://identity.example.test/.well-known/jwks.json',
		};
		const anonymous = await resolveApplicationAccess({
			request: new Request('https://agents.example.test/agents'),
			verification,
			policy: { allowedEmailDomains: ['createsomething.io'] },
		});
		const previewInProduction = await resolveApplicationAccess({
			request: new Request('https://agents.example.test/agents'),
			verification,
			policy: { allowedEmailDomains: ['createsomething.io'] },
			preview: { enabled: true, environment: 'production' },
		});

		expect(anonymous.status).toBe('anonymous');
		expect(previewInProduction.status).toBe('unconfigured');
	});
});
