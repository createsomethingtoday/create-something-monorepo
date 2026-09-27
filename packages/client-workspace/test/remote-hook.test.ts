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

test('dual-mode workspace still bootstraps the native app on its exact loopback origin', async () => {
  const previous = {
    remote: process.env.CLIENT_WORKSPACE_REMOTE,
    desktop: process.env.CLIENT_WORKSPACE_DESKTOP,
    remoteOrigin: process.env.CLIENT_WORKSPACE_REMOTE_ORIGIN,
    loopbackOrigin: process.env.CLIENT_WORKSPACE_LOOPBACK_ORIGIN,
    capability: process.env.CLIENT_WORKSPACE_CAPABILITY_TOKEN
  };
  process.env.CLIENT_WORKSPACE_REMOTE = '1';
  process.env.CLIENT_WORKSPACE_DESKTOP = '1';
  process.env.CLIENT_WORKSPACE_REMOTE_ORIGIN = 'https://client-agent.example.test';
  process.env.CLIENT_WORKSPACE_LOOPBACK_ORIGIN = 'http://127.0.0.1:5290';
  process.env.CLIENT_WORKSPACE_CAPABILITY_TOKEN = 'a'.repeat(64);
  try {
    const url = new URL(`http://127.0.0.1:5290/?cap=${'a'.repeat(64)}`);
    const response = await handle({
      event: {
        request: new Request(url, { headers: { host: '127.0.0.1:5290' } }),
        url,
        cookies: { get: () => undefined }
      } as never,
      resolve: async () => new Response('workspace')
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie') ?? '', /cs_workspace_capability=/);
  } finally {
    for (const [key, value] of Object.entries({
      CLIENT_WORKSPACE_REMOTE: previous.remote,
      CLIENT_WORKSPACE_DESKTOP: previous.desktop,
      CLIENT_WORKSPACE_REMOTE_ORIGIN: previous.remoteOrigin,
      CLIENT_WORKSPACE_LOOPBACK_ORIGIN: previous.loopbackOrigin,
      CLIENT_WORKSPACE_CAPABILITY_TOKEN: previous.capability
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
