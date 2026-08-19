import assert from 'node:assert/strict';
import test from 'node:test';

import identityWorker from '../src/index.ts';
import { IDENTITY_TOKEN_AUDIENCES } from '../src/services/tokens.ts';

function encodeBase64Url(value: string | ArrayBuffer): string {
	return Buffer.from(typeof value === 'string' ? value : new Uint8Array(value)).toString('base64url');
}

async function createAudienceMatrixFixture() {
	const keyPair = await crypto.subtle.generateKey(
		{ name: 'ECDSA', namedCurve: 'P-256' },
		true,
		['sign', 'verify'],
	);
	const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
	const user = {
		id: 'user_mcp',
		email: 'mcp-user@createsomething.agency',
		password_hash: 'unused',
		name: 'MCP User',
		tier: 'agency',
		source: 'agency',
		email_verified: 1,
		workway_user_id: null,
		analytics_opt_out: 0,
		created_at: '2026-08-15T00:00:00.000Z',
		updated_at: '2026-08-15T00:00:00.000Z',
		deleted_at: null,
		deletion_scheduled_at: null,
	};
	let accountCreated = false;
	let sessionWrites = 0;
	const db = {
		prepare(sql: string) {
			let values: unknown[] = [];
			return {
				bind(...input: unknown[]) {
					values = input;
					return this;
				},
				async first() {
					if (sql.includes('FROM users WHERE id')) return user;
					if (sql.includes('FROM mcp_accounts')) {
						return accountCreated ? {
							account_id: 'acct_mcp',
							user_id: user.id,
							tenant_id: String(values[1] ?? 'tenant_acme'),
							created_at: '2026-08-15T00:00:00.000Z',
							updated_at: '2026-08-15T00:00:00.000Z',
						} : null;
					}
					return null;
				},
				async all() {
					if (sql.includes('FROM signing_keys')) {
						return {
							results: [{
								id: 'mcp-audience-key',
								public_key: JSON.stringify(publicJwk),
								algorithm: 'ES256',
							}],
						};
					}
					return { results: [] };
				},
				async run() {
					if (sql.includes('INSERT OR IGNORE INTO mcp_accounts')) accountCreated = true;
					if (sql.includes('INSERT INTO mcp_sessions')) sessionWrites += 1;
					return { success: true, meta: { changes: 1 } };
				},
			};
		},
	} as unknown as D1Database;

	async function sign(audience: string): Promise<string> {
		const now = Math.floor(Date.now() / 1000);
		const header = encodeBase64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'mcp-audience-key' }));
		const payload = encodeBase64Url(JSON.stringify({
			sub: user.id,
			email: user.email,
			tier: user.tier,
			source: user.source,
			iss: 'https://id.createsomething.space',
			aud: [audience],
			iat: now - 60,
			exp: now + 300,
			kind: 'identity_access_token',
			session_version: 2,
			email_verified: true,
		}));
		const input = `${header}.${payload}`;
		const signature = await crypto.subtle.sign(
			{ name: 'ECDSA', hash: 'SHA-256' },
			keyPair.privateKey,
			new TextEncoder().encode(input),
		);
		return `${input}.${encodeBase64Url(signature)}`;
	}

	return { db, sign, getSessionWrites: () => sessionWrites };
}

test('MCP session creation accepts only the dedicated v2 application audience', async () => {
	const { db, sign } = await createAudienceMatrixFixture();
	const audiences = [...new Set([...IDENTITY_TOKEN_AUDIENCES, 'mcp-session'])];

	for (const audience of audiences) {
		const accessToken = await sign(audience);
		const response = await identityWorker.fetch(new Request(
			'https://id.createsomething.space/v1/mcp/sessions',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: 'not-json',
			},
		), { DB: db, ENVIRONMENT: 'test', ALLOWED_ORIGINS: '' } as never);

		assert.equal(
			response.status,
			audience === 'mcp-session' ? 400 : 401,
			`${audience} must ${audience === 'mcp-session' ? 'pass' : 'fail'} the MCP session authentication boundary`,
		);
	}
});

test('the dedicated audience can complete the intended self-service MCP onboarding flow', async () => {
	const { db, sign, getSessionWrites } = await createAudienceMatrixFixture();
	const accessToken = await sign('mcp-session');
	const response = await identityWorker.fetch(new Request(
		'https://id.createsomething.space/v1/mcp/sessions',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				tenant_id: 'tenant_acme',
				host: 'mcp.createsomething.agency',
				toolkit_profile: ['webflow'],
				tool_mode: 'read_write',
			}),
		},
	), {
		DB: db,
		ENVIRONMENT: 'test',
		ALLOWED_ORIGINS: '',
		MCP_POLICY_FALLBACK_ENABLED: 'true',
	} as never);

	const responseBody = await response.json() as { token?: string; [key: string]: unknown };
	assert.equal(response.status, 200, JSON.stringify(responseBody));
	assert.equal(getSessionWrites(), 1);
	assert.match(responseBody.token ?? '', /^ms_tok_/);
});

test('MCP session resolution still fails closed on live Agency entitlement', async () => {
	const session = {
		id: 'ms_entitlement',
		user_id: 'user_mcp',
		tenant_id: 'tenant_acme',
		account_id: 'acct_mcp',
		host: 'mcp.createsomething.agency',
		bound_host: null,
		tool_mode: 'read_write',
		toolkit_profile_json: JSON.stringify(['webflow']),
		allowed_tool_prefixes_json: JSON.stringify(['webflow_']),
		token_hash: 'unused-by-fixture',
		expires_at: '2999-01-01T00:00:00.000Z',
		revoked_at: null,
		created_at: '2026-08-15T00:00:00.000Z',
		updated_at: '2026-08-15T00:00:00.000Z',
	};
	const db = {
		prepare(sql: string) {
			return {
				bind() { return this; },
				async first() {
					if (sql.includes('FROM mcp_sessions')) return session;
					return null;
				},
				async run() { return { success: true, meta: { changes: 1 } }; },
			};
		},
	} as unknown as D1Database;
	const originalFetch = globalThis.fetch;
	let entitlementChecks = 0;
	globalThis.fetch = async () => {
		entitlementChecks += 1;
		return new Response(JSON.stringify({ allowed: false, reason: 'agency_entitlement_inactive' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	};

	try {
		const response = await identityWorker.fetch(new Request(
			'https://id.createsomething.space/v1/mcp/sessions/resolve',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Session-Resolve-Token': 'resolve-secret',
				},
				body: JSON.stringify({ token: 'ms_tok_entitlement' }),
			},
		), {
			DB: db,
			ENVIRONMENT: 'test',
			ALLOWED_ORIGINS: '',
			MCP_SESSION_RESOLVE_TOKEN: 'resolve-secret',
			AGENCY_INTERNAL_API_URL: 'https://createsomething.agency',
			AGENCY_INTERNAL_API_KEY: 'test-agency-key',
		} as never);
		const body = await response.json() as { valid: boolean; reason: string };

		assert.equal(response.status, 200);
		assert.equal(entitlementChecks, 1);
		assert.equal(body.valid, false);
		assert.equal(body.reason, 'agency_entitlement_inactive');
	} finally {
		globalThis.fetch = originalFetch;
	}
});
