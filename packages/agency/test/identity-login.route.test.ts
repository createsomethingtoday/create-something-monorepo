import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { POST as login } from '../src/routes/api/auth/login/+server.ts';
import { POST as signup } from '../src/routes/api/auth/signup/+server.ts';

test('agency signs customers in through CREATE SOMETHING Identity', async () => {
	const cookieWrites: Array<{ name: string; value: string }> = [];
	let identityRequest: Request | null = null;

	const response = await login({
		request: new Request('https://createsomething.agency/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'owner@example.com',
				password: 'correct horse battery staple',
			}),
		}),
		cookies: {
			set(name: string, value: string) {
				cookieWrites.push({ name, value });
			},
		},
		fetch: async (request: RequestInfo | URL, init?: RequestInit) => {
			identityRequest = new Request(request, init);
			return Response.json({
				access_token: 'identity-access-token',
				refresh_token: 'identity-refresh-token',
				expires_in: 900,
				user: {
					id: 'usr_customer',
					email: 'owner@example.com',
					tier: 'agency',
					source: 'space',
				},
			});
		},
		platform: {
			env: {
				ENVIRONMENT: 'production',
				IDENTITY_API_URL: 'https://id.createsomething.space',
			},
		},
	} as never);

	assert.equal(response.status, 200);
	assert.ok(identityRequest);
	assert.equal(identityRequest.url, 'https://id.createsomething.space/v1/auth/login');
	assert.deepEqual(await identityRequest.json(), {
		email: 'owner@example.com',
		password: 'correct horse battery staple',
		audience: 'client-workspace',
	});
	assert.deepEqual(cookieWrites, [
		{ name: 'cs_access_token', value: 'identity-access-token' },
		{ name: 'cs_refresh_token', value: 'identity-refresh-token' },
	]);
	assert.deepEqual(await response.json(), {
		success: true,
		user: {
			id: 'usr_customer',
			email: 'owner@example.com',
			tier: 'agency',
			source: 'space',
		},
	});
});

test('agency signs customers up through an Identity-supported source', async () => {
	let identityRequest: Request | null = null;

	const response = await signup({
		request: new Request('https://createsomething.agency/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				email: 'new-owner@example.com',
				password: 'correct horse battery staple',
				name: 'New Owner',
				source: 'agency',
			}),
		}),
		cookies: { set() {} },
		fetch: async (request: RequestInfo | URL, init?: RequestInit) => {
			identityRequest = new Request(request, init);
			return Response.json({
				access_token: 'identity-access-token',
				refresh_token: 'identity-refresh-token',
				expires_in: 900,
				user: { id: 'usr_new', email: 'new-owner@example.com' },
			});
		},
		platform: {
			env: {
				ENVIRONMENT: 'production',
				IDENTITY_API_URL: 'https://id.createsomething.space',
			},
		},
	} as never);

	assert.equal(response.status, 200);
	assert.ok(identityRequest);
	assert.deepEqual(await identityRequest.json(), {
		email: 'new-owner@example.com',
		password: 'correct horse battery staple',
		name: 'New Owner',
		source: 'space',
	});
});

test('agency presents the first-party sign-in form with Performance styling', () => {
	const source = readFileSync(new URL('../src/routes/login/+page.svelte', import.meta.url), 'utf8');

	assert.match(source, /CREATE SOMETHING Identity/);
	assert.match(source, /LoginForm/);
	assert.match(source, /SignupForm/);
	assert.match(source, /property-performance/);
	assert.match(source, /auth-form-panel theme-light/);
	assert.match(source, /fetch\('\/api\/auth\/login'/);
	assert.match(source, /fetch\('\/api\/auth\/signup'/);
	assert.doesNotMatch(source, /Auth0/i);
	assert.doesNotMatch(source, /<main class="auth-shell/);
});

test('agency pins protected sessions to Identity even while retired configuration is being removed', () => {
	const hookSource = readFileSync(new URL('../src/hooks.server.ts', import.meta.url), 'utf8');
	const pageServerSource = readFileSync(
		new URL('../src/routes/login/+page.server.ts', import.meta.url),
		'utf8',
	);

	assert.match(hookSource, /authProvider:\s*\{ type: 'identity-worker' \}/);
	assert.match(hookSource, /verifyAgencyIdentitySession/);
	assert.match(hookSource, /authHandle,\s*identityVerificationHandle/);
	assert.match(pageServerSource, /locals\.user/);
	assert.doesNotMatch(pageServerSource, /createSessionManager|getAuth0Config/);
});

test('agency active customer session paths contain no Auth0 provider behavior', () => {
	const activePaths = [
		'../src/lib/server/mcp-token.ts',
		'../src/routes/auth/callback/+page.server.ts',
		'../src/routes/auth/callback/+page.svelte',
		'../src/routes/api/auth/login/+server.ts',
		'../src/routes/api/auth/signup/+server.ts',
		'../src/routes/api/auth/logout/+server.ts',
	];
	const source = activePaths
		.map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))
		.join('\n');

	assert.doesNotMatch(source, /Auth0|getAuth0Config|buildAuth0|exchangeAuth0/);
	assert.match(source, /session_source: 'identity'/);
	assert.match(source, /verifyAgencyIdentitySession/);
});
