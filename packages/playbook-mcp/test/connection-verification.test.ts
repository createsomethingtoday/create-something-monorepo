import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCatalogHealthCheck, readJsonBodyLimited } from '../src/connection-verification.js';

test('connection verification accepts catalog transports and rejects arbitrary destinations', () => {
  assert.deepEqual(parseCatalogHealthCheck('https://playbook.mcp.createsomething.ltd/mcp'), {
    cleanedUrl: 'https://playbook.mcp.createsomething.ltd/mcp',
    healthUrl: 'https://playbook.mcp.createsomething.ltd/',
    urlsToTry: [
      'https://playbook.mcp.createsomething.ltd/',
      'https://playbook.mcp.createsomething.ltd/mcp',
    ],
    strippedSuffix: true,
  });

  assert.throws(
    () => parseCatalogHealthCheck('http://169.254.169.254/latest/meta-data'),
    /HTTPS catalog URL/,
  );
  assert.throws(
    () => parseCatalogHealthCheck('https://example.com/mcp'),
    /catalog origin/,
  );
  assert.throws(
    () => parseCatalogHealthCheck('https://playbook.mcp.createsomething.ltd/admin'),
    /health or MCP transport paths/,
  );
});

test('connection verification caps JSON bodies', async () => {
  const response = new Response(JSON.stringify({ payload: 'x'.repeat(256) }), {
    headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(() => readJsonBodyLimited(response, 64), /exceeds 64 bytes/);
});
