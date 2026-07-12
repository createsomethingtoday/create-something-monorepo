import assert from 'node:assert/strict';
import test from 'node:test';

import { validateJWT } from '../src/services/tokens';

const encode = (value: string | ArrayBuffer) => {
	const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
	return Buffer.from(bytes).toString('base64url');
};

async function sign(payload: Record<string, unknown>, privateKey: CryptoKey): Promise<string> {
	const header = encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
	const body = encode(JSON.stringify(payload));
	const data = new TextEncoder().encode(`${header}.${body}`);
	const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data);
	return `${header}.${body}.${encode(signature)}`;
}

test('signed OAuth access tokens enforce cryptographic expiration', async () => {
	const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
	const now = Math.floor(Date.now() / 1000);
	const base = {
		sub: 'identity-subject',
		email: 'reviewer@webflow.com',
		tier: 'free',
		source: 'io',
		iss: 'https://id.createsomething.space',
		aud: ['https://webflow-template-review-mcp.createsomething.workers.dev/mcp'],
		iat: now - 1,
	};

	const valid = await sign({ ...base, exp: now + 60 }, keys.privateKey);
	const expired = await sign({ ...base, exp: now - 1 }, keys.privateKey);

	assert.ok(await validateJWT(valid, keys.publicKey));
	assert.equal(await validateJWT(expired, keys.publicKey), null);
});
