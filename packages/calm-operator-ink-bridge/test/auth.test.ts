import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAuthorized } from '../src/auth.js';

function requestWithToken(token: string): Request {
  return new Request('https://ink.example.test/ink/brief', {
    headers: { 'x-ink-token': token }
  });
}

test('device auth accepts device token', async () => {
  const authorized = await isAuthorized(
    requestWithToken('device-token'),
    { INK_DEVICE_TOKEN: 'device-token' },
    'device'
  );

  assert.equal(authorized, true);
});

test('device auth does not accept source token', async () => {
  const authorized = await isAuthorized(
    requestWithToken('source-token'),
    { INK_SOURCE_TOKEN: 'source-token' },
    'device'
  );

  assert.equal(authorized, false);
});

test('source auth accepts source token', async () => {
  const authorized = await isAuthorized(
    requestWithToken('source-token'),
    { INK_SOURCE_TOKEN: 'source-token' },
    'source'
  );

  assert.equal(authorized, true);
});

test('bridge token remains compatibility token for device and source roles', async () => {
  const env = { INK_BRIDGE_TOKEN: 'bridge-token' };

  assert.equal(await isAuthorized(requestWithToken('bridge-token'), env, 'device'), true);
  assert.equal(await isAuthorized(requestWithToken('bridge-token'), env, 'source'), true);
});

test('runner auth accepts only the dedicated runner token', async () => {
  const env = {
    INK_RUNNER_TOKEN: 'runner-token',
    INK_DEVICE_TOKEN: 'device-token',
    INK_SOURCE_TOKEN: 'source-token',
    INK_BRIDGE_TOKEN: 'bridge-token'
  };

  assert.equal(await isAuthorized(requestWithToken('runner-token'), env, 'runner'), true);
  assert.equal(await isAuthorized(requestWithToken('device-token'), env, 'runner'), false);
  assert.equal(await isAuthorized(requestWithToken('source-token'), env, 'runner'), false);
  assert.equal(await isAuthorized(requestWithToken('bridge-token'), env, 'runner'), false);
});
