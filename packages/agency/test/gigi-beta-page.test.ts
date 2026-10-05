import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gigiBeta, gigiWalkthroughs } from '../src/lib/data/gigiBeta';
import { gigiBetaHtml, gigiBetaHeaders } from '../src/lib/server/gigi-beta-page';
import searchRoutes from '../src/lib/data/searchRoutes.json' with { type: 'json' };
import { isCacheablePublicHtmlResponse } from '../src/lib/server/public-html-cache';
import { readFileSync } from 'node:fs';

test('standalone page retains the owning Agency Canon operator palette', () => {
  const canonical = readFileSync(new URL('../../canon/src/lib/styles/operator.css', import.meta.url), 'utf8');
  const tokens = [...gigiBetaHtml.matchAll(/(--(?:color|radius)-operator-[\w-]+): ([^;]+);/g)];
  assert.ok(tokens.length >= 10);
  for (const [, name, value] of tokens) assert.ok(canonical.includes(`${name}: ${value};`), name);
});

test('download contract pins exact qualified installer, platform and checksum', () => {
  assert.equal(gigiBeta.bytes, 75369025);
  assert.equal(gigiBeta.sha256, '00e75c41b298b07712ce5939ccb6339f60c6d235360a0a133e52d72e4dbd2893');
  assert.equal(gigiBeta.url, `https://media.createsomething.io/releases/gigi/0.1.0/${gigiBeta.sha256}/GiGi-0.1.0-arm64.dmg`);
  for (const text of ['macOS 13', 'Apple Silicon', 'Intel Macs are not supported', gigiBeta.url, gigiBeta.sha256, '75,369,025']) assert.ok(gigiBetaHtml.includes(text), text);
});

test('beta stays unlisted and has no active content or tracking shell', () => {
  assert.equal(gigiBetaHeaders['X-Robots-Tag'], 'noindex, nofollow');
  assert.match(gigiBetaHtml, /<meta http-equiv="Content-Security-Policy" content="script-src 'none'">/);
  assert.match(gigiBetaHeaders['Content-Security-Policy'], /default-src 'none'/);
  assert.match(gigiBetaHeaders['Content-Security-Policy'], /form-action 'none'/);
  assert.doesNotMatch(gigiBetaHtml, /<script|<iframe|<form|<img|@import|url\(|on(click|load)=/i);
  assert.equal(gigiBetaHeaders['Referrer-Policy'], 'no-referrer');
  assert.ok(!searchRoutes.some((route) => route.path.startsWith('/gigi')));
  assert.equal(isCacheablePublicHtmlResponse(new Response(gigiBetaHtml, { headers: gigiBetaHeaders })), false);
});

test('onboarding and recovery limits are explicit', () => {
  for (const text of ['First-time Mac setup is still being tested', 'No sign-in is needed', 'currency', 'separately installed Codex CLI', 'Updates are manual', 'Removing the app preserves', 'Anyone with the link', 'not off-device backups']) assert.ok(gigiBetaHtml.includes(text), text);
  assert.doesNotMatch(gigiBetaHtml, /mailto:|file:\/\/|libfile_|keychain-profile|\/Users\//);
});

test('walkthroughs pin reviewed footage and use user-initiated native playback', () => {
  assert.equal(gigiWalkthroughs.length, 2);
  for (const video of gigiWalkthroughs) {
    assert.ok(video.url.includes(`/${video.sha256}/`));
    assert.ok(gigiBetaHtml.includes(video.url));
  }
  assert.equal((gigiBetaHtml.match(/<video controls playsinline preload="none"/g) || []).length, 2);
  assert.doesNotMatch(gigiBetaHtml, /autoplay|<iframe|<script/i);
  assert.match(gigiBetaHeaders['Content-Security-Policy'], /media-src https:\/\/media\.createsomething\.io/);
  assert.ok(gigiBetaHtml.includes('earlier beta builds'));
  assert.ok(gigiBetaHtml.includes('not acceptance of a fresh installation'));
});
