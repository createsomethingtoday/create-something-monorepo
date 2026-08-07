import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ELEVENLABS_CONVERSATION_TOKEN_URL,
  createElevenLabsVoiceSessionResponse,
  createVoiceSessionRatePolicies,
  createVoiceSessionRequestDeniedResponse,
  isAllowedVoiceSessionRequest
} from '../src/lib/server/elevenlabs-voice-session';
import { enforcePublicWritePolicies } from '../src/lib/server/public-write-limits';

const apiKey = 'xi-test-server-key-that-must-never-reach-the-browser';
const agentId = 'agent_3501kz9ts50ef8svj797p494898n';

test('voice session requests allow same-origin browsers and reject cross-site callers', async () => {
  const url = new URL('https://abundance-concierge-chat.pages.dev/api/voice/session');
  const sameOrigin = new Request(url, {
    method: 'POST',
    headers: {
      origin: 'https://abundance-concierge-chat.pages.dev',
      'sec-fetch-site': 'same-origin'
    }
  });
  const crossSite = new Request(url, {
    method: 'POST',
    headers: {
      origin: 'https://quota-burner.example',
      'sec-fetch-site': 'cross-site'
    }
  });

  assert.equal(isAllowedVoiceSessionRequest(sameOrigin, url), true);
  assert.equal(isAllowedVoiceSessionRequest(crossSite, url), false);

  const denied = createVoiceSessionRequestDeniedResponse();
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('cache-control'), 'no-store, private');
  assert.doesNotMatch(await denied.text(), /agent_|api.?key/i);
});

test('voice session issuance blocks a ninth request inside the ten-minute burst window', async () => {
  const subject = `ip:test-${Date.now()}-${Math.random()}`;
  const attempts = [];

  for (let index = 0; index < 9; index += 1) {
    attempts.push(
      await enforcePublicWritePolicies({ policies: createVoiceSessionRatePolicies(subject) })
    );
  }

  assert.ok(attempts.slice(0, 8).every((result) => result.ok));
  assert.equal(attempts[8].ok, false);
  assert.equal(attempts[8].blockedPolicy?.scope, 'voice_session.ip.10m');
  assert.ok((attempts[8].blockedPolicy?.retryAfterSeconds ?? 0) > 0);
});

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
