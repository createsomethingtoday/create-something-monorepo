import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ELEVENLABS_CONVERSATION_TOKEN_URL,
  createElevenLabsVoiceSessionResponse
} from '../src/lib/server/elevenlabs-voice-session';

const apiKey = 'xi-test-server-key-that-must-never-reach-the-browser';
const agentId = 'agent_3501kz9ts50ef8svj797p494898n';

test('the Abundance voice session exchanges its server key for a short-lived conversation token', async () => {
  let capturedRequest: Request | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedRequest = new Request(input, init);
    return Response.json({ token: 'conversation_test_ephemeral_token' });
  };

  const response = await createElevenLabsVoiceSessionResponse({ apiKey, agentId, fetchImpl });
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store, private');
  assert.deepEqual(body, { conversationToken: 'conversation_test_ephemeral_token' });
  assert.ok(capturedRequest);
  assert.equal(
    capturedRequest.url,
    `${ELEVENLABS_CONVERSATION_TOKEN_URL}?agent_id=${encodeURIComponent(agentId)}`
  );
  assert.equal(capturedRequest.method, 'GET');
  assert.equal(capturedRequest.headers.get('xi-api-key'), apiKey);
  assert.doesNotMatch(JSON.stringify(body), /xi-test-server-key/);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(agentId));
});

test('the Abundance voice session fails closed without both server settings', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return Response.json({});
  };

  const missingKey = await createElevenLabsVoiceSessionResponse({
    apiKey: undefined,
    agentId,
    fetchImpl
  });
  const missingAgent = await createElevenLabsVoiceSessionResponse({
    apiKey,
    agentId: undefined,
    fetchImpl
  });

  assert.equal(missingKey.status, 503);
  assert.equal(missingAgent.status, 503);
  assert.equal(calls, 0);
  assert.match(await missingKey.text(), /not configured/i);
  assert.match(await missingAgent.text(), /not configured/i);
});

test('ElevenLabs failures are sanitized', async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(`rejected ${apiKey} for ${agentId}`, { status: 401 });

  const response = await createElevenLabsVoiceSessionResponse({ apiKey, agentId, fetchImpl });
  const responseText = await response.text();

  assert.equal(response.status, 502);
  assert.doesNotMatch(responseText, /rejected|xi-test-server-key|agent_3501/i);
  assert.match(responseText, /could not start/i);
});

test('malformed token responses fail closed', async () => {
  const fetchImpl: typeof fetch = async () => Response.json({ token: 123 });

  const response = await createElevenLabsVoiceSessionResponse({ apiKey, agentId, fetchImpl });

  assert.equal(response.status, 502);
  assert.match(await response.text(), /could not start/i);
});
