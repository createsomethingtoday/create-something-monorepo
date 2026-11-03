import assert from 'node:assert/strict';
import test from 'node:test';

import { createOAuthClient, findOAuthClientById } from '../src/db/queries';
import identityWorker, { isOAuthClientRedirectAllowed } from '../src/index.ts';

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

test('OAuth access review preserves escaped parameters and shows access before credentials', async () => {
	const db = createClientDb();
	await createOAuthClient(db, {
		client_id: 'oauth_review', client_name: 'Review client',
		redirect_uris: ['https://chatgpt.com/connector/callback'],
		token_endpoint_auth_method: 'none', grant_types: ['authorization_code'],
		response_types: ['code'], scope: 'openid mcp',
	});
	const params = new URLSearchParams({
		response_type: 'code', client_id: 'oauth_review',
		redirect_uri: 'https://chatgpt.com/connector/callback',
		code_challenge: 'test-pkce-challenge', code_challenge_method: 'S256',
		state: '\"><script>alert(1)</script>',
	});
	const response = await identityWorker.fetch(
		new Request('https://id.createsomething.space/oauth/authorize?' + params),
		{ DB: db } as any,
	);
	assert.equal(response.status, 200);
	assert.equal(response.headers.get('Cache-Control'), 'no-store');
	const html = await response.text();
	assert.match(html, /<form method="post" action="\/oauth\/authorize">/);
	assert.match(html, /name="state" value="&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;"/);
	assert.match(html, /name="code_challenge" value="test-pkce-challenge"/);
	assert.match(html, /autocomplete="current-password" required/);
	assert.match(html, /Requested access<\/h2>/);
	assert.ok(html.indexOf('Requested access</h2>') < html.indexOf('<form'));
	assert.doesNotMatch(html, /fontshare|@import|<script|linear-gradient/);
});


test('GiGi OAuth signup entry is enabled only for its exact resource and preserves the original request', async () => {
  const db = createClientDb();
  await createOAuthClient(db, {client_id:'gigi_signup_review',client_name:'GiGi review',redirect_uris:['http://127.0.0.1:12345/callback'],token_endpoint_auth_method:'none',grant_types:['authorization_code'],response_types:['code'],scope:'openid mcp'});
  const params = new URLSearchParams({response_type:'code',client_id:'gigi_signup_review',redirect_uri:'http://127.0.0.1:12345/callback',code_challenge:'test-pkce-challenge',code_challenge_method:'S256',state:'original-state',resource:'https://gigi-connector.createsomething.workers.dev'});
  const page = async (enabled:boolean,resource:string) => {
    params.set('resource',resource);
    const response = await identityWorker.fetch(new Request('https://id.createsomething.space/oauth/authorize?'+params),{DB:db,GIGI_ENROLLMENT_ENABLED:String(enabled)} as any);
    assert.equal(response.status,200);
    return response.text();
  };
  const html = await page(true,'https://gigi-connector.createsomething.workers.dev');
  assert.match(html,/href="\/signup\?app=gigi" target="_blank" rel="noopener noreferrer">Create account/);
  assert.match(html,/name="state" value="original-state"/);
  assert.match(html,/name="code_challenge" value="test-pkce-challenge"/);
  assert.match(html,/href="\/recover\?app=gigi"/);
  assert.doesNotMatch(await page(false,'https://gigi-connector.createsomething.workers.dev'),/Create account/);
  assert.doesNotMatch(await page(true,'https://gigi-connector.createsomething.workers.dev/other'),/Create account/);
});
