import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';

type SigningKeyRow = {
	id: string;
	private_key: string;
	public_key: string;
	algorithm: string;
	active: number;
	created_at: string;
};

class FakeD1Statement {
	private boundArgs: unknown[] = [];

	constructor(
		private readonly db: FakeD1Database,
		private readonly sql: string,
	) {}

	bind(...args: unknown[]) {
		this.boundArgs = args;
		return this;
	}

	async first<T>() {
		if (this.sql.includes('SELECT * FROM signing_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1')) {
			const active = this.db.signingKeys.filter((row) => row.active === 1);
			return (active.at(-1) ?? null) as T | null;
		}
		throw new Error(`Unsupported first() query in test DB: ${this.sql}`);
	}

	async all<T>() {
		if (this.sql.includes('SELECT id, public_key, algorithm FROM signing_keys WHERE active = 1')) {
			return {
				results: this.db.signingKeys
					.filter((row) => row.active === 1)
					.map(({ id, public_key, algorithm }) => ({ id, public_key, algorithm })) as T[],
			};
		}
		throw new Error(`Unsupported all() query in test DB: ${this.sql}`);
	}

	async run() {
		if (this.sql.includes('INSERT INTO signing_keys')) {
			const [id, privateKey, publicKey, algorithm] = this.boundArgs as [string, string, string, string];
			this.db.signingKeys.push({
				id,
				private_key: privateKey,
				public_key: publicKey,
				algorithm,
				active: 1,
				created_at: new Date().toISOString(),
			});
			return { success: true };
		}
		throw new Error(`Unsupported run() query in test DB: ${this.sql}`);
	}
}

class FakeD1Database {
	signingKeys: SigningKeyRow[] = [];

	prepare(sql: string) {
		return new FakeD1Statement(this, sql);
	}
}

function makeEnv() {
	return {
		DB: new FakeD1Database(),
		AVATARS: {} as any,
		ENVIRONMENT: 'test',
		ALLOWED_ORIGINS: 'https://chatgpt.com',
		MCP_HUB_URL: 'https://cs-mcp-hub-remote.createsomething.workers.dev/mcp',
	} as any;
}

async function registerClient(env: ReturnType<typeof makeEnv>, redirectUri: string) {
	const response = await identityWorker.fetch(
		new Request('https://id.createsomething.space/oauth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_name: 'chatgpt',
				redirect_uris: [redirectUri],
				grant_types: ['authorization_code', 'refresh_token'],
				response_types: ['code'],
				token_endpoint_auth_method: 'none',
			}),
		}),
		env,
	);

	assert.equal(response.status, 200);
	return response.json() as Promise<Record<string, unknown>>;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('identity worker serves oauth authorization server metadata', async () => {
	const response = await identityWorker.fetch(
		new Request('https://id.createsomething.space/.well-known/oauth-authorization-server'),
		makeEnv(),
	);

	assert.equal(response.status, 200);
	const body = await response.json() as Record<string, unknown>;
	assert.equal(body.authorization_endpoint, 'https://id.createsomething.space/oauth/authorize');
	assert.equal(body.token_endpoint, 'https://id.createsomething.space/oauth/token');
	assert.deepEqual(body.scopes_supported, ['openid', 'profile', 'email', 'mcp', 'offline_access']);
	assert.deepEqual(body.grant_types_supported, ['authorization_code', 'refresh_token']);
});

test('identity worker renders oauth authorize page for a registered client and requested resource', async () => {
	const env = makeEnv();
	const redirectUri = 'https://chat.openai.com/a/callback';
	const registration = await registerClient(env, redirectUri);
	const clientId = String(registration.client_id);

	const response = await identityWorker.fetch(
		new Request(
			`https://id.createsomething.space/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20mcp&resource=${encodeURIComponent('https://mj.mcp.createsomething.agency/mcp')}`,
		),
		env,
	);

	assert.equal(response.status, 200);
	const text = await response.text();
	assert.match(text, /Authorize MCP Access/);
	assert.match(text, new RegExp(`name="client_id" value="${escapeRegExp(clientId)}"`));
	assert.match(text, /Hub: https:\/\/mj\.mcp\.createsomething\.agency\/mcp/);
});

test('identity worker rejects authorize redirect_uris that were not registered', async () => {
	const env = makeEnv();
	const registration = await registerClient(env, 'https://chat.openai.com/a/callback');

	const response = await identityWorker.fetch(
		new Request(
			`https://id.createsomething.space/oauth/authorize?response_type=code&client_id=${encodeURIComponent(String(registration.client_id))}&redirect_uri=${encodeURIComponent('https://chat.openai.com/a/other-callback')}&scope=openid%20mcp`,
		),
		env,
	);

	assert.equal(response.status, 400);
	const body = await response.json() as Record<string, unknown>;
	assert.equal(body.error, 'invalid_redirect_uri');
});

test('identity worker rejects non-loopback insecure redirect_uris at registration time', async () => {
	const env = makeEnv();
	const response = await identityWorker.fetch(
		new Request('https://id.createsomething.space/oauth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_name: 'chatgpt',
				redirect_uris: ['http://example.com/callback'],
			}),
		}),
		env,
	);

	assert.equal(response.status, 400);
	const body = await response.json() as Record<string, unknown>;
	assert.equal(body.error, 'invalid_redirect_uri');
});
