import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildScreenshotGalleryUrl,
  handleScreenshotGalleryRequest,
  type ScreenshotGalleryManifest,
} from '../src/screenshot-gallery.js';
import { signScreenshotViewClaims } from '../src/screenshot-view.js';

const SECRET = 'test-secret';

const MANIFEST: ScreenshotGalleryManifest = {
  final_url: 'https://lumark.webflow.io/',
  page_title: 'Lumark <script>alert(1)</script>',
  captured_at: '2026-08-19T18:00:00.000Z',
  screenshots: [
    { id: 'shot-a', viewport: 'desktop', width: 1440, height: 900, segment: 0, scroll_y: 0, page_height_px: 1966, truncated: false },
    { id: 'shot-b', viewport: 'desktop', width: 1440, height: 900, segment: 1, scroll_y: 900, page_height_px: 1966, truncated: false },
    { id: 'shot-c', viewport: 'mobile', width: 390, height: 844, segment: 0, scroll_y: 0, page_height_px: 1726, truncated: true },
  ],
};

const DEPS = {
  secret: SECRET,
  getManifest: async (id: string) => (id === 'gal-1' ? MANIFEST : null),
  buildImageUrl: async (shotId: string) => `https://worker.example/screenshot-view?id=${shotId}&exp=1&sig=x`,
};

test('signed gallery URL renders one HTML page grouped by viewport', async () => {
  const galleryUrl = await buildScreenshotGalleryUrl({ origin: 'https://worker.example', secret: SECRET, id: 'gal-1' });
  const response = await handleScreenshotGalleryRequest(new URL(galleryUrl), DEPS);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Content-Type') ?? '', /text\/html/);
  const html = await response.text();
  assert.match(html, /desktop \(1440×900\)/);
  assert.match(html, /mobile \(390×844\)/);
  assert.match(html, /truncated: page continues past the last segment/);
  assert.equal((html.match(/<img /g) ?? []).length, 3);
  assert.match(html, /screenshot-view\?id=shot-a/);
  assert.match(html, /Segment 1 — scroll_y 900px/);
  // Manifest strings are escaped, never emitted as markup.
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('rejects tampered id and cross-route signature reuse', async () => {
  const galleryUrl = new URL(await buildScreenshotGalleryUrl({ origin: 'https://worker.example', secret: SECRET, id: 'gal-1' }));
  galleryUrl.searchParams.set('id', 'gal-other');
  const tampered = await handleScreenshotGalleryRequest(galleryUrl, DEPS);
  assert.equal(tampered.status, 403);

  // A valid /screenshot-view signature must not open a gallery with the same id/exp.
  const exp = Math.floor(Date.now() / 1000) + 600;
  const crossUrl = new URL('https://worker.example/screenshot-gallery');
  crossUrl.searchParams.set('id', 'gal-1');
  crossUrl.searchParams.set('exp', String(exp));
  crossUrl.searchParams.set('sig', await signScreenshotViewClaims(SECRET, { id: 'gal-1', exp }));
  const cross = await handleScreenshotGalleryRequest(crossUrl, DEPS);
  assert.equal(cross.status, 403);
});

test('expired link and missing manifest both return 410', async () => {
  const expired = new URL(
    await buildScreenshotGalleryUrl({ origin: 'https://worker.example', secret: SECRET, id: 'gal-1', ttlSeconds: -10 }),
  );
  const expiredResponse = await handleScreenshotGalleryRequest(expired, DEPS);
  assert.equal(expiredResponse.status, 410);

  const missing = await handleScreenshotGalleryRequest(
    new URL(await buildScreenshotGalleryUrl({ origin: 'https://worker.example', secret: SECRET, id: 'gal-gone' })),
    DEPS,
  );
  assert.equal(missing.status, 410);
});
