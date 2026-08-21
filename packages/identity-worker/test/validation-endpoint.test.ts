import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

async function createValidationFixture(
	permissions: string[],
	claims: Record<string, unknown> = {},
	userOverrides: Record<string, unknown> = {},
) {
	const keyPair = await crypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify'],
	);
	const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
	const now = Math.floor(Date.now() / 1000);
	const header = encodeBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'validation-key' }));
	const payload = encodeBase64Url(JSON.stringify({
		sub: 'user_ltd',
		email: 'token-email@createsomething.ltd',
		tier: 'free',
		source: 'space',
		iss: 'https://id.createsomething.space',
		aud: ['ltd'],
		iat: now - 60,
		exp: now + 300,
		kind: 'identity_access_token',
		session_version: 2,
		email_verified: true,
		...claims,
	}));
	const input = `${header}.${payload}`;
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		keyPair.privateKey,
		new TextEncoder().encode(input),
	);
	const accessToken = `${input}.${encodeBase64Url(signature)}`;
	const user = {
		id: 'user_ltd',
		email: 'live-email@createsomething.ltd',
		password_hash: 'unused',
		name: 'Live User',
		tier: 'agency',
		source: 'space',
		email_verified: 1,
		workway_user_id: null,
		analytics_opt_out: 0,
		created_at: '2026-08-15T00:00:00.000Z',
		updated_at: '2026-08-15T00:00:00.000Z',
		deleted_at: null,
		deletion_scheduled_at: null,
		...userOverrides,
	};
	const db = {
		prepare(sql: string) {
			if (sql.includes('FROM api_keys')) {
				return {
					bind() {
						return {
							async first() {
								return {
									id: 'key_1',
									service: 'validation-test',
									key_hash: 'ignored',
									permissions: JSON.stringify(permissions),
									revoked_at: null,
								};
							},
						};
					},
				};
			}
			if (sql.includes('FROM signing_keys')) {
				return {
					async all() {
						return {
							results: [{
								id: 'validation-key',
								public_key: JSON.stringify(publicJwk),
								algorithm: 'ES256',
							}],
						};
					},
				};
			}
			if (sql.includes('FROM users WHERE id')) {
				return {
					bind() {
						return { async first() { return user; } };
					},
				};
			}
			throw new Error(`Unexpected validation query: ${sql}`);
		},
	} as unknown as D1Database;

	return { accessToken, db };
}

test('service validation requires the dedicated validate_identity_session permission', async () => {
	const { accessToken, db } = await createValidationFixture([]);
	const response = await identityWorker.fetch(new Request('https://id.createsomething.space/v1/validate', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-api-key': 'service-key' },
		body: JSON.stringify({ access_token: accessToken, audience: 'ltd' }),
	}), { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);

	assert.equal(response.status, 403);
	assert.equal((await response.json() as { error: string }).error, 'forbidden');
});

test('service validation rejects a signed credential that is not the exact requested Identity session', async () => {
	const { accessToken, db } = await createValidationFixture(
		['validate_identity_session'],
		{ kind: 'oauth_authorization_code', aud: ['oauth'] },
	);
	const response = await identityWorker.fetch(new Request('https://id.createsomething.space/v1/validate', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-api-key': 'service-key' },
		body: JSON.stringify({ access_token: accessToken, audience: 'ltd' }),
	}), { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);

	assert.equal(response.status, 401);
	assert.equal((await response.json() as { error: string }).error, 'invalid_token');
});

test('service validation returns current database identity rather than stale token claims', async () => {
	const { accessToken, db } = await createValidationFixture(['validate_identity_session']);
	const response = await identityWorker.fetch(new Request('https://id.createsomething.space/v1/validate', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-api-key': 'service-key' },
		body: JSON.stringify({ access_token: accessToken, audience: 'ltd' }),
	}), { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);

	assert.equal(response.status, 200);
	assert.deepEqual((await response.json() as { user: unknown }).user, {
		id: 'user_ltd',
		email: 'live-email@createsomething.ltd',
		tier: 'agency',
		source: 'space',
	});
});

test('service validation rejects a deleted or unverified current identity', async () => {
	for (const userOverrides of [
		{ deleted_at: '2026-08-15T01:00:00.000Z' },
		{ email_verified: 0 },
	]) {
		const { accessToken, db } = await createValidationFixture(
			['validate_identity_session'],
			{},
			userOverrides,
		);
		const response = await identityWorker.fetch(new Request('https://id.createsomething.space/v1/validate', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-api-key': 'service-key' },
			body: JSON.stringify({ access_token: accessToken, audience: 'ltd' }),
		}), { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);

		assert.equal(response.status, 401);
	}
});

test('service validation requires the caller to name one recognized audience', async () => {
	const { accessToken, db } = await createValidationFixture(['validate_identity_session']);
	const response = await identityWorker.fetch(new Request('https://id.createsomething.space/v1/validate', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-api-key': 'service-key' },
		body: JSON.stringify({ access_token: accessToken }),
	}), { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);

	assert.equal(response.status, 400);
});
