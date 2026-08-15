import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import identityWorker, { requiresS256PkceForOAuthResource } from '../src/index.ts';

function makeEnv() {
  const clients = new Map<string, Record<string, unknown>>([
    ['chatgpt', { client_id: 'chatgpt', redirect_uris_json: JSON.stringify(['https://chat.openai.com/a/callback']) }],
    ['workflow-shadow-pilot', { client_id: 'workflow-shadow-pilot', redirect_uris_json: JSON.stringify(['http://127.0.0.1:65221/callback']) }],
  ]);
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'https://chatgpt.com',
    MCP_HUB_URL: 'https://mj.mcp.createsomething.agency/mcp',
    DB: {
      prepare(sql: string) {
        let values: unknown[] = [];
        return {
          bind(...input: unknown[]) { values = input; return this; },
          async first() {
            if (sql.includes('FROM oauth_clients')) return clients.get(String(values[0])) ?? null;
            return null;
          },
          async run() {
            if (sql.includes('INSERT INTO oauth_clients')) {
              clients.set(String(values[0]), {
                client_id: values[0], client_name: values[1], redirect_uris_json: values[2],
                token_endpoint_auth_method: values[3], grant_types_json: values[4],
                response_types_json: values[5], scope: values[6],
              });
            }
            return { success: true, meta: { changes: 1 } };
          },
        };
      },
    },
  } as any;
}

function makeAgentAuthEnv() {
  let signingKey: Record<string, unknown> | null = null;

  return {
    ...makeEnv(),
    DB: {
      prepare(sql: string) {
        let values: unknown[] = [];
        return {
          bind(...input: unknown[]) {
            values = input;
            return this;
          },
          async first() {
            if (sql.includes('FROM rate_limits')) return null;
            if (sql.includes('FROM signing_keys')) return signingKey;
            return null;
          },
          async all() {
            return { results: signingKey ? [signingKey] : [] };
          },
          async run() {
            if (sql.includes('INSERT INTO signing_keys')) {
              signingKey = {
                id: values[0],
                private_key: values[1],
                public_key: values[2],
                algorithm: values[3],
                active: 1,
                created_at: new Date().toISOString(),
              };
            }
            return { success: true };
          },
        };
      },
    },
  } as any;
}

test('production configuration permits ChatGPT OAuth browser requests', async () => {
  const wranglerConfig = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
  const allowedOrigins = wranglerConfig.match(/^ALLOWED_ORIGINS\s*=\s*"([^"]+)"$/m)?.[1]?.split(',') ?? [];

  assert.ok(allowedOrigins.includes('https://chatgpt.com'));
});

test('identity worker serves oauth authorization server metadata', async () => {
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/.well-known/oauth-authorization-server'),
    makeEnv(),
  );

  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.authorization_endpoint, 'https://id.createsomething.space/oauth/authorize');
  assert.equal(body.token_endpoint, 'https://id.createsomething.space/oauth/token');
  assert.deepEqual(body.scopes_supported, [
    'openid',
    'profile',
    'email',
    'mcp',
    'offline_access',
    'template-review:read',
    'template-review:write',
    'template-review:queue-read',
    'offer-savings:read',
    'offer-savings:write',
    'cracked-sync:read',
    'cracked-sync:write',
  ]);
  assert.deepEqual(body.agent_auth, {
    skill: 'https://createsomething.agency/auth.md',
    register_uri: 'https://id.createsomething.space/agent/auth',
    identity_types_supported: ['anonymous'],
    anonymous: {
      credential_types_supported: ['access_token'],
      claim_uri: 'https://id.createsomething.space/agent/claim',
    },
  });
});

test('identity worker registers a short-lived anonymous credential only for .agency discovery', async () => {
  const env = makeAgentAuthEnv();
  const registration = await identityWorker.fetch(
    new Request('https://id.createsomething.space/agent/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.25',
      },
      body: JSON.stringify({
        type: 'anonymous',
        requested_credential_type: 'access_token',
        resource: 'https://createsomething.agency',
      }),
    }),
    env,
  );

  assert.equal(registration.status, 201);
  assert.equal(registration.headers.get('cache-control'), 'no-store');
  const body = await registration.json() as Record<string, unknown>;
  assert.equal(body.credential_type, 'access_token');
  assert.equal(body.token_type, 'Bearer');
  assert.equal(body.expires_in, 900);
  assert.equal(body.scope, 'mcp');
  assert.equal(body.resource, 'https://createsomething.agency');
  const accessToken = String(body.access_token);
  const claims = JSON.parse(Buffer.from(accessToken.split('.')[1]!, 'base64url').toString()) as Record<string, unknown>;
  assert.match(String(claims.sub), /^agent_/);
  assert.equal(claims.kind, 'agent_auth_access_token');
  assert.deepEqual(claims.aud, ['https://createsomething.agency']);
  assert.equal(claims.exp, Number(claims.iat) + 900);

  const claim = await identityWorker.fetch(
    new Request('https://id.createsomething.space/agent/claim', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    env,
  );
  assert.equal(claim.status, 200);
  assert.deepEqual(await claim.json(), {
    claim_type: 'anonymous_agent_access',
    subject: claims.sub,
    credential_type: 'access_token',
    resource: 'https://createsomething.agency',
    scope: 'mcp',
    expires_at: new Date(Number(claims.exp) * 1000).toISOString(),
    boundary: 'This claim does not create an account or grant write authority.',
  });
});

test('anonymous agent registration rejects resources outside the public discovery boundary', async () => {
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/agent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'anonymous',
        requested_credential_type: 'access_token',
        resource: 'https://example.com',
      }),
    }),
    makeEnv(),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'invalid_resource',
    message: 'The requested resource is not available for anonymous registration',
    status: 400,
  });
});

test('the .agency OAuth resource requires S256 PKCE before it can issue an access token', () => {
  assert.equal(requiresS256PkceForOAuthResource('https://createsomething.agency'), true);
  assert.equal(requiresS256PkceForOAuthResource('https://createsomething.agency/'), true);
	assert.equal(requiresS256PkceForOAuthResource('https://webflow-template-review-mcp.createsomething.workers.dev/mcp'), true);
});

test('identity worker creates dynamically registered ChatGPT OAuth clients', async () => {
  const redirectUri = 'https://chatgpt.com/connector_platform_oauth_redirect';
  const response = await identityWorker.fetch(
    new Request('https://id.createsomething.space/oauth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://chatgpt.com',
      },
      body: JSON.stringify({
        client_name: 'ChatGPT',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: 'offer-savings:read offer-savings:write',
      }),
    }),
    makeEnv(),
  );

  assert.equal(response.status, 201);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://chatgpt.com');
  const body = await response.json() as Record<string, unknown>;
  assert.match(String(body.client_id), /^oauth_chatgpt_/);
  assert.deepEqual(body.redirect_uris, [redirectUri]);
  assert.equal(body.token_endpoint_auth_method, 'none');
  assert.deepEqual(body.grant_types, ['authorization_code', 'refresh_token']);
  assert.deepEqual(body.response_types, ['code']);
  assert.equal(body.scope, 'offer-savings:read offer-savings:write');
});

test('identity worker uses an explicit issuer for preview metadata', async () => {
  const response = await identityWorker.fetch(
    new Request('https://identity-worker-preview.example/.well-known/oauth-authorization-server'),
    { ...makeEnv(), OAUTH_ISSUER: 'https://identity-preview.example/' },
  );
  const body = await response.json() as Record<string, unknown>;
  assert.equal(body.issuer, 'https://identity-preview.example');
  assert.equal(body.jwks_uri, 'https://identity-preview.example/.well-known/jwks.json');
});

test('identity worker renders oauth authorize page', async () => {
  const response = await identityWorker.fetch(
    new Request(
      'https://id.createsomething.space/oauth/authorize?response_type=code&client_id=chatgpt&redirect_uri=https%3A%2F%2Fchat.openai.com%2Fa%2Fcallback&scope=openid%20mcp&code_challenge=test-challenge&code_challenge_method=S256',
    ),
    makeEnv(),
  );

  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /Authorize MCP Access/);
  assert.match(text, /name="client_id" value="chatgpt"/);
  assert.match(text, /--color-performance-paper:\s*#f3f3f0/);
  assert.match(text, /--color-performance-panel:\s*#ffffff/);
  assert.match(text, /--color-performance-ink:\s*#090909/);
  assert.match(text, /--color-performance-pressure:\s*#e54800/);
  assert.match(text, /--radius-performance-sm:\s*0/);
  assert.match(text, /background:\s*var\(--color-performance-paper\)/);
  assert.match(text, /border-radius:\s*var\(--radius-performance-sm\)/);
  assert.doesNotMatch(text, /--bg-1|--card-border|backdrop-filter/);
});

test('Template Review authorize page describes the resource-bound application grant', async () => {
  const resource = 'https://webflow-template-review-mcp.createsomething.workers.dev/mcp';
  const response = await identityWorker.fetch(
    new Request(
		`https://id.createsomething.space/oauth/authorize?response_type=code&client_id=workflow-shadow-pilot&redirect_uri=${encodeURIComponent('http://127.0.0.1:65221/callback')}&scope=${encodeURIComponent('openid profile email mcp template-review:queue-read')}&resource=${encodeURIComponent(resource)}&code_challenge=test-challenge&code_challenge_method=S256`,
    ),
    makeEnv(),
  );

  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /Application MCP Access/);
  assert.match(text, /short-lived access token bound to this resource and the requested scopes/);
  assert.match(text, new RegExp(`Resource: ${resource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(text, /Scopes: openid profile email mcp template-review:queue-read/);
  assert.doesNotMatch(text, /managed MCP bearer token/);
  assert.doesNotMatch(text, /Hub:/);
});
