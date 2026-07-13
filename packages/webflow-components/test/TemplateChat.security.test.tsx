import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateChat } from '../src/components/chat/TemplateChat';
import { completeTurnstileChallenge, type TurnstileApi } from '../src/components/chat/turnstileChallenge';
import {
  fetchAuthorizedAgentRequest,
  prepareAgentMessages,
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

test('authorized chat clears expired continuity and retries once with a rebuilt body', async () => {
  const bodies: unknown[] = [];
  let contextToken: string | null = 'expired-context';
  let cleared = 0;
  const response = await fetchAuthorizedAgentRequest({
    url: 'https://example.com/api/templates/agent/chat',
    init: () => ({
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Compare those templates' }],
        context: { context_token: contextToken ?? undefined },
      }),
    }),
    getSessionToken: async () => 'valid-session',
    clearSessionToken: () => assert.fail('session is still valid'),
    clearContextToken: () => {
      cleared += 1;
      contextToken = null;
    },
    fetchImpl: async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return bodies.length === 1
        ? new Response(
            JSON.stringify({
              code: 'invalid_context',
              error: 'Template Finder continuity is invalid or expired.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          )
        : new Response(null, { status: 200 });
    },
  });

  assert.equal(response.status, 200);
  assert.equal(cleared, 1);
  assert.deepEqual(bodies, [
    {
      messages: [{ role: 'user', content: 'Compare those templates' }],
      context: { context_token: 'expired-context' },
    },
    {
      messages: [{ role: 'user', content: 'Compare those templates' }],
      context: {},
    },
  ]);
});

test('agent message preparation stays inside the worker request contract', () => {
  const messages = Array.from({ length: 30 }, (_, index) => ({
    role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content: `${index}:`.padEnd(5_000, 'x'),
  }));

  const prepared = prepareAgentMessages(messages);
  assert.equal(prepared.length, 10);
  assert.equal(prepared.at(-1)?.role, 'assistant');
  assert.ok(prepared.every((message) => message.content.length <= 4_000));
  assert.ok(prepared.reduce((total, message) => total + message.content.length, 0) <= 40_000);
  assert.ok(JSON.stringify({ messages: prepared }).length < 64 * 1024);
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

test('Turnstile runs on render and defers widget removal until after its callback returns', async () => {
  const calls: string[] = [];
  let renderOptions: Parameters<TurnstileApi['render']>[1] | undefined;
  const turnstile: TurnstileApi = {
    render(_container, options) {
      renderOptions = options;
      queueMicrotask(() => {
        calls.push('callback:start');
        options.callback('challenge-once');
        calls.push('callback:end');
      });
      return 'widget-1';
    },
    remove(widgetId) {
      calls.push(`remove:${widgetId}`);
    },
  };

  const token = await completeTurnstileChallenge(turnstile, {} as HTMLElement, 'public-site-key');
  assert.equal(token, 'challenge-once');
  assert.equal('execution' in (renderOptions ?? {}), false);
  assert.deepEqual(calls, ['callback:start', 'callback:end']);

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ['callback:start', 'callback:end', 'remove:widget-1']);
});
