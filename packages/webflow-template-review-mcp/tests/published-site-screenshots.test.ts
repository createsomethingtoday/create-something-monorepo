import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCREENSHOT_DEFAULT_QUALITY,
  SCREENSHOT_MAX_QUALITY,
  SCREENSHOT_MIN_QUALITY,
  buildCaptureTarget,
  clampScreenshotQuality,
  resolveViewports,
} from '../src/published-site-screenshots.js';

test('buildCaptureTarget stays same-origin by construction', () => {
  const root = buildCaptureTarget('https://example-template.webflow.io/');
  assert.deepEqual(root, { ok: true, url: 'https://example-template.webflow.io/', origin: 'https://example-template.webflow.io' });

  const nested = buildCaptureTarget('https://example-template.webflow.io/', '/utility/style-guide');
  assert.equal(nested.ok, true);
  if (nested.ok) assert.equal(nested.url, 'https://example-template.webflow.io/utility/style-guide');

  const pathFromPublished = buildCaptureTarget('https://example-template.webflow.io/about');
  assert.equal(pathFromPublished.ok, true);
  if (pathFromPublished.ok) assert.equal(pathFromPublished.url, 'https://example-template.webflow.io/about');
});

test('buildCaptureTarget rejects escapes and non-https', () => {
  assert.equal(buildCaptureTarget('http://example-template.webflow.io/').ok, false);
  assert.equal(buildCaptureTarget('not a url').ok, false);
  assert.equal(buildCaptureTarget('https://example-template.webflow.io/', 'style-guide').ok, false);
  assert.equal(buildCaptureTarget('https://example-template.webflow.io/', '//evil.example/').ok, false);
});

test('clampScreenshotQuality bounds and defaults', () => {
  assert.equal(clampScreenshotQuality(undefined), SCREENSHOT_DEFAULT_QUALITY);
  assert.equal(clampScreenshotQuality(NaN), SCREENSHOT_DEFAULT_QUALITY);
  assert.equal(clampScreenshotQuality(1), SCREENSHOT_MIN_QUALITY);
  assert.equal(clampScreenshotQuality(100), SCREENSHOT_MAX_QUALITY);
  assert.equal(clampScreenshotQuality(65.4), 65);
});

test('resolveViewports defaults to desktop+mobile, dedupes, and never returns empty', () => {
  assert.deepEqual(resolveViewports().map((v) => v.name), ['desktop', 'mobile']);
  assert.deepEqual(resolveViewports(['mobile', 'mobile']).map((v) => v.name), ['mobile']);
  assert.deepEqual(resolveViewports(['bogus']).map((v) => v.name), ['desktop']);
});
