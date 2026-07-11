import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateChat } from '../src/components/chat/TemplateChat';
import {
  fetchAuthorizedAgentRequest,
  requestTemplateAgentSession,
  type FetchLike,
} from '../src/components/chat/templateAgentSession';

test('session mint sends the one-time Turnstile token and returns only a valid bearer', async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const fetchImpl: FetchLike = async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ session_token: 's'.repeat(64) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const token = await requestTemplateAgentSession('https://example.com/', 'challenge-once', fetchImpl);
  assert.equal(token, 's'.repeat(64));
  assert.equal(request?.url, 'https://example.com/api/templates/agent/session');
  assert.deepEqual(JSON.parse(String(request?.init?.body)), { turnstile_token: 'challenge-once' });
});

test('challenge rejection fails closed without returning a bearer', async () => {
  await assert.rejects(
    requestTemplateAgentSession(
      'https://example.com',
      'rejected-challenge',
      async () => new Response(JSON.stringify({ error: 'Bot verification failed.' }), { status: 403 }),
    ),
    /Session unavailable \(403\)/,
  );
});

test('authorized chat remints and retries exactly once after an expired session', async () => {
  const authorizations: string[] = [];
  let session = 0;
  let cleared = 0;
  const fetchImpl: FetchLike = async (_input, init) => {
    authorizations.push(new Headers(init?.headers).get('Authorization') ?? '');
    return new Response(null, { status: authorizations.length === 1 ? 401 : 200 });
  };

  const response = await fetchAuthorizedAgentRequest({
    url: 'https://example.com/api/templates/agent/chat',
    init: { method: 'POST', body: '{}' },
    getSessionToken: async () => `session-${++session}`,
    clearSessionToken: () => {
      cleared += 1;
    },
    fetchImpl,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(authorizations, ['Bearer session-1', 'Bearer session-2']);
  assert.equal(cleared, 1);
});

test('authorized chat never retries non-authentication failures', async () => {
  let calls = 0;
  const response = await fetchAuthorizedAgentRequest({
    url: 'https://example.com/api/templates/agent/chat',
    init: { method: 'POST' },
    getSessionToken: async () => 'valid-session',
    clearSessionToken: () => assert.fail('must not clear a valid session'),
    fetchImpl: async () => {
      calls += 1;
      return new Response(null, { status: 429 });
    },
  });
  assert.equal(response.status, 429);
  assert.equal(calls, 1);
});

test('TemplateChat renders a Turnstile mount without exposing a secret', () => {
  const html = renderToStaticMarkup(
    <TemplateChat defaultOpen enableAnalytics={false} turnstileSiteKey="public-site-key" />,
  );
  assert.match(html, /class="tmchat-turnstile"/);
  assert.doesNotMatch(html, /public-site-key/);
});
