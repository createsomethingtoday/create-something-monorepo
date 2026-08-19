import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_MAX_SEGMENTS,
  DEFAULT_SCREENSHOT_SETTLE_MS,
  MAX_CAPTURED_SEGMENTS,
  normalizePublishedSiteScreenshotInput,
  PublishedSiteScreenshotError,
} from '../src/published-site-screenshots.js';

test('normalizes defaults: desktop + mobile, above-the-fold, settle delay', () => {
  const request = normalizePublishedSiteScreenshotInput({ published_url: 'https://blaxi.webflow.io/' });
  assert.equal(request.url, 'https://blaxi.webflow.io/');
  assert.deepEqual(
    request.viewports.map((viewport) => viewport.name),
    ['desktop', 'mobile'],
  );
  assert.equal(request.fullPage, false);
  assert.equal(request.settleMs, DEFAULT_SCREENSHOT_SETTLE_MS);
  assert.equal(request.maxSegments, DEFAULT_MAX_SEGMENTS);
  assert.equal(request.captureSegments, 1);
});

test('full_page decouples capture coverage from the inline segment cap', () => {
  const request = normalizePublishedSiteScreenshotInput({
    published_url: 'https://blaxi.webflow.io/',
    full_page: true,
    max_segments: 3,
  });
  assert.equal(request.maxSegments, 3);
  assert.equal(request.captureSegments, MAX_CAPTURED_SEGMENTS);
});

test('dedupes repeated viewports and keeps preset dimensions', () => {
  const request = normalizePublishedSiteScreenshotInput({
    published_url: 'https://blaxi.webflow.io/pricing',
    viewports: ['mobile', 'mobile', 'desktop'],
  });
  assert.deepEqual(
    request.viewports.map((viewport) => [viewport.name, viewport.width, viewport.height]),
    [
      ['mobile', 390, 844],
      ['desktop', 1440, 900],
    ],
  );
});

test('rejects non-webflow.io hosts', () => {
  for (const url of [
    'https://example.com/',
    'https://webflow.io/',
    'https://evil.com/?u=https://blaxi.webflow.io',
    'https://blaxi.webflow.io.evil.com/',
    'http://blaxi.webflow.io/',
  ]) {
    assert.throws(
      () => normalizePublishedSiteScreenshotInput({ published_url: url }),
      PublishedSiteScreenshotError,
      `expected rejection for ${url}`,
    );
  }
});

test('rejects out-of-range settle_ms', () => {
  assert.throws(
    () => normalizePublishedSiteScreenshotInput({ published_url: 'https://blaxi.webflow.io/', settle_ms: 60_000 }),
    PublishedSiteScreenshotError,
  );
});

test('rejects out-of-range max_segments and accepts the cap', () => {
  assert.throws(
    () => normalizePublishedSiteScreenshotInput({ published_url: 'https://blaxi.webflow.io/', max_segments: 9 }),
    PublishedSiteScreenshotError,
  );
  assert.throws(
    () => normalizePublishedSiteScreenshotInput({ published_url: 'https://blaxi.webflow.io/', max_segments: 0 }),
    PublishedSiteScreenshotError,
  );
  const request = normalizePublishedSiteScreenshotInput({
    published_url: 'https://blaxi.webflow.io/',
    full_page: true,
    max_segments: 8,
  });
  assert.equal(request.maxSegments, 8);
  assert.equal(request.fullPage, true);
});
