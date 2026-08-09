import assert from 'node:assert/strict';
import test from 'node:test';

import { createBrowserRoutingHealth } from './browser-routing-health.js';
import { isWorkerRequestAuthorized } from './worker-auth.js';

const env = {
  CLOUDFLARE_ACCOUNT_ID: 'account-123',
  CLOUDFLARE_BROWSER_RUN_API_TOKEN: 'browser-run-secret',
  STEEL_API_KEY: 'steel-rollback-secret',
  WEBFLOW_SITE_ANALYZER_MCP_API_KEY: 'mcp-secret',
};

test('health reports Browser Run routing readiness without exposing secrets', () => {
  const body = createBrowserRoutingHealth({
    cloudflareBrowserRunEnabled: true,
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareBrowserRunApiToken: env.CLOUDFLARE_BROWSER_RUN_API_TOKEN,
    steelApiKey: env.STEEL_API_KEY,
  }, null);
  const serialized = JSON.stringify(body);

  assert.deepEqual(body, {
    configured: true,
    primary: 'cloudflare-kitesurf',
    policy: {
      statelessPublic: ['cloudflare-kitesurf', 'cloudflare-chromium'],
      sessionful: ['cloudflare-chromium'],
    },
    incumbentRollbackConfigured: true,
  });
  assert.doesNotMatch(serialized, /browser-run-secret|steel-rollback-secret|mcp-secret/);
});

test('MCP remains fail-closed when Browser Run is configured', () => {
  const missing = new Request('https://analyzer.example/mcp', { method: 'POST' });
  const invalid = new Request('https://analyzer.example/mcp', {
    method: 'POST',
    headers: { Authorization: 'Bearer incorrect' },
  });

  assert.equal(isWorkerRequestAuthorized(missing, env), false);
  assert.equal(isWorkerRequestAuthorized(invalid, env), false);
});

test('MCP Worker fails closed when the server auth secret is absent', () => {
  const request = new Request('https://analyzer.example/mcp', {
    method: 'POST',
    headers: { Authorization: 'Bearer attacker-controlled' },
  });

  assert.equal(isWorkerRequestAuthorized(request, {}), false);
});
