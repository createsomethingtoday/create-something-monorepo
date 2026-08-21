import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildScreenshotViewUrl,
  handleScreenshotViewRequest,
  signScreenshotViewClaims,
} from '../src/screenshot-view.js';

const SECRET = 'test-secret';
const STORED = { bytes: new Uint8Array([1, 2, 3]).buffer as ArrayBuffer, mimeType: 'image/jpeg' };

test('signed view URL round-trips through the handler', async () => {
  const viewUrl = await buildScreenshotViewUrl({ origin: 'https://worker.example', secret: SECRET, id: 'abc' });
  const response = await handleScreenshotViewRequest(new URL(viewUrl), {
    secret: SECRET,
    getScreenshot: async (id) => (id === 'abc' ? STORED : null),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/jpeg');
  assert.equal((await response.arrayBuffer()).byteLength, 3);
});

test('rejects tampered signature and expired claims', async () => {
  const viewUrl = new URL(await buildScreenshotViewUrl({ origin: 'https://worker.example', secret: SECRET, id: 'abc' }));
  viewUrl.searchParams.set('id', 'other');
  const tampered = await handleScreenshotViewRequest(viewUrl, {
    secret: SECRET,
    getScreenshot: async () => STORED,
  });
  assert.equal(tampered.status, 403);

  const exp = Math.floor(Date.now() / 1000) - 10;
  const expiredUrl = new URL('https://worker.example/screenshot-view');
  expiredUrl.searchParams.set('id', 'abc');
  expiredUrl.searchParams.set('exp', String(exp));
  expiredUrl.searchParams.set('sig', await signScreenshotViewClaims(SECRET, { id: 'abc', exp }));
  const expired = await handleScreenshotViewRequest(expiredUrl, {
    secret: SECRET,
    getScreenshot: async () => STORED,
  });
  assert.equal(expired.status, 410);
});

test('missing stored screenshot returns 410', async () => {
  const viewUrl = await buildScreenshotViewUrl({ origin: 'https://worker.example', secret: SECRET, id: 'gone' });
  const response = await handleScreenshotViewRequest(new URL(viewUrl), {
    secret: SECRET,
    getScreenshot: async () => null,
  });
  assert.equal(response.status, 410);
});
