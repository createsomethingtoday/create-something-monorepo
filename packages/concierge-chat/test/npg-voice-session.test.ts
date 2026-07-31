import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OPENAI_REALTIME_CLIENT_SECRET_URL,
  VOICE_CONCIERGE_MODEL,
  createNpgClientServiceSessionResponse
} from '../src/lib/server/voice-session';

const standardKey = 'sk-test-npg-server-key-that-must-never-reach-the-browser';

test('the NPG session exchanges the standard key for a bounded short-lived client secret', async () => {
  let capturedRequest: Request | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return Response.json({ value: 'ek_test_npg_ephemeral', expires_at: 1_900_000_100 });
  };

  const response = await createNpgClientServiceSessionResponse({ apiKey: standardKey, fetchImpl });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    value: 'ek_test_npg_ephemeral',
    expiresAt: 1_900_000_100,
    model: VOICE_CONCIERGE_MODEL
  });
  assert.ok(capturedRequest);
  assert.equal(capturedRequest.url, OPENAI_REALTIME_CLIENT_SECRET_URL);
  const upstreamBody = (await capturedRequest.json()) as { session?: { instructions?: string } };
  assert.match(upstreamBody.session?.instructions ?? '', /NPG Client Service Representative/i);
  assert.match(upstreamBody.session?.instructions ?? '', /nothing has been sent/i);
  assert.doesNotMatch(JSON.stringify(body), /sk-test-npg-server-key/i);
});

test('the NPG session fails closed when the server key is unavailable', async () => {
  const response = await createNpgClientServiceSessionResponse({ apiKey: undefined });

  assert.equal(response.status, 503);
  assert.match(await response.text(), /not configured/i);
});
