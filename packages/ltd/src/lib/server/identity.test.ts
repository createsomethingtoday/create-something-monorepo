import { describe, expect, it } from 'vitest';
import { verifyLtdIdentityToken } from './identity';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

describe('verifyLtdIdentityToken', () => {
	it('accepts only the current verified Identity access token for the exact ltd audience', async () => {
		const keyPair = await crypto.subtle.generateKey(
			{ name: 'ECDSA', namedCurve: 'P-256' },
			true,
			['sign', 'verify'],
		);
		const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey) as JsonWebKey & {
			kid: string;
			alg: string;
			use: string;
		};
		publicJwk.kid = 'ltd-identity-test-key';
		publicJwk.alg = 'ES256';
		publicJwk.use = 'sig';
		const now = 1_800_000_000;
		const sign = async (overrides: Record<string, unknown> = {}) => {
			const header = encodeBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: publicJwk.kid }));
			const payload = encodeBase64Url(JSON.stringify({
				sub: 'user_ltd',
				email: 'operator@createsomething.ltd',
				tier: 'agency',
				source: 'space',
				iss: 'https://id.createsomething.space',
				aud: ['ltd'],
				iat: now - 60,
				exp: now + 300,
				kind: 'identity_access_token',
				session_version: 2,
				email_verified: true,
				...overrides,
			}));
			const input = `${header}.${payload}`;
			const signature = await crypto.subtle.sign(
				{ name: 'ECDSA', hash: 'SHA-256' },
				keyPair.privateKey,
				new TextEncoder().encode(input),
			);
			return `${input}.${encodeBase64Url(signature)}`;
		};
		const options = {
			fetch: async () => Response.json({ keys: [publicJwk] }),
			now: () => now,
		};

		expect(await verifyLtdIdentityToken(await sign(), options)).toMatchObject({ subject: 'user_ltd' });
		expect(await verifyLtdIdentityToken(await sign({ kind: 'agent_auth_access_token' }), options)).toBeNull();
		expect(await verifyLtdIdentityToken(await sign({ aud: ['agency'] }), options)).toBeNull();
		expect(await verifyLtdIdentityToken(await sign({ session_version: 1 }), options)).toBeNull();
		expect(await verifyLtdIdentityToken(await sign({ email_verified: false }), options)).toBeNull();
	});
});
