import assert from 'node:assert/strict';
import test from 'node:test';
import { createJevHttpDecisionSelector, createOpenAIHttpDecisionSelector } from '../src/decision-transport.js';
import type { DecisionRequest } from '../src/decisions.js';

const request: DecisionRequest = { id: 'test', scope: 'synthetic', policyVersion: 'v1', stateVersion: 'sha',
  question: 'Select the best source.', candidates: [{ id: 'source', description: 'Public source' }],
  fallbackId: 'source', mode: 'fresh' };
const openai = () => ({ model: 'gpt-6-luna', answers: [{ name: 'selection', type: 'choice', choice: 'source', confidence: 0.9,
  probabilities: [{ value: 'source', probability: 0.9 }, { value: 'no_match', probability: 0.1 }] }] });

test('OpenAI transport pins endpoint/auth, disables redirects, carries abort signal and ephemeral evidence only in request', async () => {
  const signal = new AbortController().signal;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/decisions');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'manual');
    assert.equal(init?.signal, signal);
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer synthetic-key');
    const body = JSON.parse(String(init?.body));
    assert.equal(JSON.parse(body.input).query, 'ephemeral query');
    return Response.json(openai());
  };
  assert.deepEqual(await createOpenAIHttpDecisionSelector('synthetic-key', fetcher, 'ephemeral query').select(request, signal), { choice: 'source' });
  assert.equal(JSON.stringify(request).includes('ephemeral query'), false);
});

test('Jev transport uses pinned upstream endpoint and request shape', async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer synthetic-key');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'jev-1.13.0');
    assert.equal(body.questions.selection.type, 'choice');
    return Response.json({ model: 'jev-1.13.0', answers: { selection: { type: 'choice', choice: 'source', confidence: 0.9,
      probabilities: { source: 0.9, no_match: 0.1 } } } });
  };
  assert.deepEqual(await createJevHttpDecisionSelector('synthetic-key', fetcher).select(request, new AbortController().signal), { choice: 'source' });
});

test('HTTP errors and redirects are not retried or exposed', async () => {
  for (const status of [302, 401, 429, 529]) {
    let calls = 0;
    const fetcher: typeof fetch = async () => { calls++; return new Response('secret upstream detail', { status }); };
    await assert.rejects(createOpenAIHttpDecisionSelector('synthetic-key', fetcher).select(request, new AbortController().signal),
      error => error instanceof Error && !error.message.includes('secret') && /provider/.test(error.message));
    assert.equal(calls, 1);
  }
});

test('oversized and malformed response bodies fail without retaining contents', async () => {
  for (const response of [new Response('x'.repeat(100_001)), new Response('secret malformed JSON'),
    new Response('{}', { headers: { 'content-length': '100001' } }), Response.json({ model: 'wrong' })]) {
    const fetcher: typeof fetch = async () => response;
    await assert.rejects(createOpenAIHttpDecisionSelector('synthetic-key', fetcher).select(request, new AbortController().signal));
  }
});

test('cancellation interrupts a hanging response body and pre-aborted calls never fetch', async () => {
  let cancelled = false;
  let calls = 0;
  const controller = new AbortController();
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  };
  const pending = createOpenAIHttpDecisionSelector('synthetic-key', fetcher).select(request, controller.signal);
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(pending);
  assert.equal(cancelled, true);
  await assert.rejects(createOpenAIHttpDecisionSelector('synthetic-key', fetcher).select(request, controller.signal));
  assert.equal(calls, 1);
});

test('missing credentials and oversized ephemeral evidence fail before transport', () => {
  assert.throws(() => createOpenAIHttpDecisionSelector(''));
  assert.throws(() => createOpenAIHttpDecisionSelector('synthetic-key', fetch, 'x'.repeat(6001)));
});
