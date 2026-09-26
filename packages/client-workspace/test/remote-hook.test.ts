import assert from 'node:assert/strict';
import { test } from 'node:test';

import { handle } from '../src/hooks.server.js';

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
