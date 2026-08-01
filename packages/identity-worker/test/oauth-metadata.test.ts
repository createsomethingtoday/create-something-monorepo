import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import identityWorker from '../src/index.ts';

function makeEnv() {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'https://chatgpt.com',
    MCP_HUB_URL: 'https://mj.mcp.createsomething.agency/mcp',
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
      'https://id.createsomething.space/oauth/authorize?response_type=code&client_id=chatgpt&redirect_uri=https%3A%2F%2Fchat.openai.com%2Fa%2Fcallback&scope=openid%20mcp',
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
      `https://id.createsomething.space/oauth/authorize?response_type=code&client_id=workflow-shadow-pilot&redirect_uri=${encodeURIComponent('http://127.0.0.1:65221/callback')}&scope=${encodeURIComponent('openid profile email mcp template-review:queue-read')}&resource=${encodeURIComponent(resource)}`,
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
