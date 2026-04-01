import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizationHeaderValue,
  createZipRecruiterClient,
  ZipRecruiterApiError,
} from '../src/services/api.ts';

test('authorizationHeaderValue uses Basic auth without rewriting the provided key', () => {
  assert.equal(authorizationHeaderValue('meowmeowmeow'), 'Basic meowmeowmeow');
});

test('getJob URL-encodes unicode job ids', async () => {
  let capturedUrl = '';

  const client = createZipRecruiterClient({
    apiKey: 'token',
    fetchImpl: async (input) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  await client.getJob('nurse/å role');

  assert.match(capturedUrl, /nurse%2F%C3%A5%20role$/);
});

test('request errors are normalized into ZipRecruiterApiError', async () => {
  const client = createZipRecruiterClient({
    apiKey: 'token',
    fetchImpl: async () =>
      new Response(JSON.stringify({ status: 404, errors: [{ message: 'Application does not exist' }] }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
  });

  await assert.rejects(
    () => client.sendHiringSignal({ zr_application_id: 'missing', event: 'received', event_timestamp: new Date().toISOString() }),
    (error: unknown) => {
      assert.ok(error instanceof ZipRecruiterApiError);
      assert.equal(error.status, 404);
      return true;
    },
  );
});
