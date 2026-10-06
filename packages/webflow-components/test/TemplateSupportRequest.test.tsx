import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplateSupportRequest } from '../src/components/marketplace/TemplateSupportRequest';
import {
  SUPPORT_REQUEST_ENDPOINT,
  createIdempotencyKey,
  describeRetryAfter,
  submitSupportRequest,
} from '../src/components/marketplace/supportRequest';

const payload = {
  template_slug: 'meridian',
  request_type: 'file_request' as const,
  buyer_name: 'Ada',
  buyer_email: 'ada@example.com',
  message: 'Where can I get the Figma file?',
  website: '',
  idempotency_key: 'tsr-test-key-0001',
};

function fetchReturning(status: number, body: unknown, calls: Array<{ url: string; init?: RequestInit }> = []) {
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

test('renders a labelled button and no creator email', () => {
  const html = renderToStaticMarkup(
    <TemplateSupportRequest templateSlug="meridian" creatorName="Kevin Dakin" enableAnalytics={false} />,
  );
  assert.match(html, />Contact Kevin Dakin</);
  assert.doesNotMatch(html, /mailto:/);
});

test('disables the button when no template slug can be resolved', () => {
  const html = renderToStaticMarkup(<TemplateSupportRequest enableAnalytics={false} />);
  assert.match(html, /disabled=""/);
});

test('posts the payload to the support endpoint and returns the request id', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const result = await submitSupportRequest(payload, fetchReturning(200, { success: true, data: { request_id: 'req-1' } }, calls));
  assert.deepEqual(result, { ok: true, requestId: 'req-1' });
  assert.equal(calls[0].url, SUPPORT_REQUEST_ENDPOINT);
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), payload);
});

test('maps server errors and keeps invalid field names', async () => {
  assert.deepEqual(
    await submitSupportRequest(payload, fetchReturning(400, { success: false, error: 'invalid_fields', fields: ['buyer_email'] })),
    { ok: false, error: 'invalid_fields', fields: ['buyer_email'] },
  );
  assert.deepEqual(
    await submitSupportRequest(payload, fetchReturning(429, { success: false, error: 'rate_limited', retry_after_seconds: 7200 })),
    { ok: false, error: 'rate_limited', retryAfterSeconds: 7200 },
  );
  assert.deepEqual(
    await submitSupportRequest(payload, fetchReturning(500, { error: 'something_new' })),
    { ok: false, error: 'send_failed' },
  );
  const offline = (async () => { throw new TypeError('offline'); }) as typeof fetch;
  assert.deepEqual(await submitSupportRequest(payload, offline), { ok: false, error: 'network_error' });
});

test('targets the CSP-allowed templates.webflow.com proxy', () => {
  assert.match(SUPPORT_REQUEST_ENDPOINT, /^https:\/\/templates\.webflow\.com\//);
});

test('describes retry windows and creates server-valid idempotency keys', () => {
  assert.equal(describeRetryAfter(90), 'Try again in about 2 minutes.');
  assert.equal(describeRetryAfter(23 * 3600), 'Try again in about 23 hours.');
  const key = createIdempotencyKey();
  assert.match(key, /^[A-Za-z0-9_-]{16,64}$/);
  assert.notEqual(key, createIdempotencyKey());
});

test('gives up on a stalled request after the timeout so the dialog cannot trap the buyer', async () => {
  const stalled = ((_url: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as typeof fetch;
  const started = Date.now();
  const result = await submitSupportRequest(payload, stalled, SUPPORT_REQUEST_ENDPOINT, 50);
  assert.deepEqual(result, { ok: false, error: 'network_error' });
  assert.ok(Date.now() - started < 2_000);
});
