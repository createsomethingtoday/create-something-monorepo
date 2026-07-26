import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAdminRequest } from '../src/auth.js';

test('admin auth accepts bearer token', async () => {
  const request = new Request('https://operator.example.test/admin/telegram/setup', {
    method: 'POST',
    headers: { authorization: 'Bearer admin-token' }
  });

  assert.equal(await isAdminRequest(request, { OPERATOR_ADMIN_TOKEN: 'admin-token' }), true);
});

test('admin auth accepts x-operator-token for script compatibility', async () => {
  const request = new Request('https://operator.example.test/admin/telegram/setup', {
    method: 'POST',
    headers: { 'x-operator-token': 'admin-token' }
  });

  assert.equal(await isAdminRequest(request, { OPERATOR_ADMIN_TOKEN: 'admin-token' }), true);
});

test('admin auth rejects missing or mismatched token', async () => {
  const request = new Request('https://operator.example.test/admin/telegram/setup', {
    method: 'POST',
    headers: { authorization: 'Bearer wrong-token' }
  });

  assert.equal(await isAdminRequest(request, { OPERATOR_ADMIN_TOKEN: 'admin-token' }), false);
  assert.equal(await isAdminRequest(request, {}), false);
});

test('admin auth rejects tokens carried in the URL', async () => {
  const request = new Request(
    'https://operator.example.test/admin/telegram/setup?token=admin-token',
    { method: 'POST' }
  );

  assert.equal(await isAdminRequest(request, { OPERATOR_ADMIN_TOKEN: 'admin-token' }), false);
});
