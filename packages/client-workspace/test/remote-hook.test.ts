import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handle, remoteMutationAllowed } from '../src/hooks.server.js';

test('remote mutations require the exact configured browser Origin', () => {
  const expected = 'https://client-agent.example.test';
  assert.equal(remoteMutationAllowed('GET', null, expected), true);
  assert.equal(remoteMutationAllowed('POST', expected, expected), true);
  assert.equal(remoteMutationAllowed('POST', null, expected), false);
  assert.equal(remoteMutationAllowed('POST', 'https://attacker.example.test', expected), false);
  assert.equal(remoteMutationAllowed('POST', expected, ''), false);
});

test('remote workspace rejects requests before route resolution without Access', async () => {
  const oldMode = process.env.CLIENT_WORKSPACE_REMOTE;
  process.env.CLIENT_WORKSPACE_REMOTE = '1';
  let resolved = false;
  try {
    const url = new URL('https://client-agent.example.test/');
    const response = await handle({
      event: { request: new Request(url), url } as never,
      resolve: async () => {
        resolved = true;
        return new Response('workspace');
      }
    });
    assert.equal(response.status, 403);
    assert.equal(resolved, false);
  } finally {
    if (oldMode === undefined) delete process.env.CLIENT_WORKSPACE_REMOTE;
    else process.env.CLIENT_WORKSPACE_REMOTE = oldMode;
  }
});
