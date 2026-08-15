import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';

const env = {
	ENVIRONMENT: 'test',
	ALLOWED_ORIGINS: 'https://createsomething.ltd',
	DB: {
		prepare() {
			throw new Error('database must not be reached before the server-only boundary is satisfied');
		},
	},
} as never;

test('browser-origin cross-domain exchange is rejected without credentialed CORS', async () => {
	const response = await identityWorker.fetch(new Request(
		'https://id.createsomething.space/v1/auth/cross-domain/exchange',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: 'https://createsomething.ltd',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'cross-site',
			},
			body: JSON.stringify({ token: 'browser-visible-code', target: 'ltd' }),
		},
	), env);

	assert.equal(response.status, 403);
	assert.equal(response.headers.has('Access-Control-Allow-Origin'), false);
	assert.equal(response.headers.has('Access-Control-Allow-Credentials'), false);
});

test('server exchange requires the exact target before touching credential storage', async () => {
	const response = await identityWorker.fetch(new Request(
		'https://id.createsomething.space/v1/auth/cross-domain/exchange',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token: 'server-code' }),
		},
	), env);

	assert.equal(response.status, 400);
	assert.equal((await response.json() as { error: string }).error, 'invalid_target');
	assert.equal(response.headers.has('Access-Control-Allow-Origin'), false);
});

test('cross-domain exchange preflight is not CORS-enabled', async () => {
	const response = await identityWorker.fetch(new Request(
		'https://id.createsomething.space/v1/auth/cross-domain/exchange',
		{
			method: 'OPTIONS',
			headers: {
				Origin: 'https://createsomething.ltd',
				'Access-Control-Request-Method': 'POST',
			},
		},
	), env);

	assert.equal(response.status, 405);
	assert.equal(response.headers.has('Access-Control-Allow-Origin'), false);
});
