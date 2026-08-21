import assert from 'node:assert/strict';
import test from 'node:test';

import { createOAuthClient, findOAuthClientById } from '../src/db/queries';
import { isOAuthClientRedirectAllowed } from '../src/index.ts';

function createClientDb() {
	const clients = new Map<string, Record<string, unknown>>();
	return {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					return {
						async run() {
							clients.set(String(values[0]), {
								client_id: values[0], client_name: values[1], redirect_uris_json: values[2],
								token_endpoint_auth_method: values[3], grant_types_json: values[4],
								response_types_json: values[5], scope: values[6],
							});
							return { meta: { changes: 1 } };
						},
						async first<T>() { return (clients.get(String(values[0])) ?? null) as T | null; },
					};
				},
			};
		},
	} as unknown as D1Database;
}

test('dynamic OAuth registration is persisted and redirect matching is exact', async () => {
	const db = createClientDb();
	await createOAuthClient(db, {
		client_id: 'oauth_client_a',
		client_name: 'Client A',
		redirect_uris: ['https://chatgpt.com/connector/callback'],
		token_endpoint_auth_method: 'none',
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],
		scope: 'openid mcp offline_access',
	});
	const client = await findOAuthClientById(db, 'oauth_client_a');
	assert.ok(client);
	assert.equal(isOAuthClientRedirectAllowed(client, 'https://chatgpt.com/connector/callback'), true);
	assert.equal(isOAuthClientRedirectAllowed(client, 'https://chatgpt.com/connector/callback/'), false);
	assert.equal(isOAuthClientRedirectAllowed(client, 'https://attacker.example/callback'), false);
	assert.equal(await findOAuthClientById(db, 'missing'), null);
});
