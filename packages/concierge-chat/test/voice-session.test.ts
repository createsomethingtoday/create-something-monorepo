import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENAI_REALTIME_CLIENT_SECRET_URL,
  VOICE_CONCIERGE_MODEL,
  createVoiceSessionResponse
} from '../src/lib/server/voice-session';

const standardKey = 'sk-test-server-key-that-must-never-reach-the-browser';

test('the voice session exchanges the standard key for a short-lived client secret', async () => {
  let capturedRequest: Request | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return Response.json({
      value: 'ek_test_ephemeral_value',
      expires_at: 1_900_000_000
    });
  };

  const response = await createVoiceSessionResponse({ apiKey: standardKey, fetchImpl });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  assert.deepEqual(body, {
    value: 'ek_test_ephemeral_value',
    expiresAt: 1_900_000_000,
    model: VOICE_CONCIERGE_MODEL
  });
  assert.ok(capturedRequest);
  assert.equal(capturedRequest.url, OPENAI_REALTIME_CLIENT_SECRET_URL);
  assert.equal(capturedRequest.headers.get('authorization'), `Bearer ${standardKey}`);

  const upstreamBody = (await capturedRequest.json()) as {
    session?: { instructions?: string; model?: string; type?: string };
  };
  assert.equal(upstreamBody.session?.type, 'realtime');
  assert.equal(upstreamBody.session?.model, VOICE_CONCIERGE_MODEL);
  assert.match(upstreamBody.session?.instructions ?? '', /You are not a recruiter/i);
  assert.doesNotMatch(JSON.stringify(body), /sk-test-server-key/);
});

test('the voice session fails closed without a standard key', async () => {
  let called = false;
  const fetchImpl: typeof fetch = async () => {
    called = true;
    return Response.json({});
  };

  const response = await createVoiceSessionResponse({ apiKey: undefined, fetchImpl });
  assert.equal(response.status, 503);
  assert.equal(called, false);
  assert.match(await response.text(), /not configured/i);
});

test('upstream failures are sanitized', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(`rejected ${standardKey}`, { status: 401 });

  const response = await createVoiceSessionResponse({ apiKey: standardKey, fetchImpl });
  const responseText = await response.text();

  assert.equal(response.status, 502);
  assert.doesNotMatch(responseText, /rejected|sk-test-server-key/i);
  assert.match(responseText, /could not start/i);
});
