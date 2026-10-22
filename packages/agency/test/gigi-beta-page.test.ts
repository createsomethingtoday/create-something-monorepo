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
  assert.equal(gigiBeta.version, '0.2.8');
  assert.equal(gigiBeta.filename, 'GiGi-0.2.8-arm64-private-beta.dmg');
  assert.equal(gigiBeta.bytes, 98601117);
  assert.equal(gigiBeta.sha256, '2be3b50358f220fbfc6dd6ca9310747a1e32b151ac8b9b646223b0a2d303ab4d');
  assert.equal(gigiBeta.url, `https://media.createsomething.io/releases/gigi/0.2.8/${gigiBeta.sha256}/GiGi-0.2.8-arm64-private-beta.dmg`);
  for (const text of ['macOS 13', 'Apple Silicon', 'Intel Macs are not supported', gigiBeta.url, gigiBeta.sha256, '98,601,117', '98.6 MB']) assert.ok(gigiBetaHtml.includes(text), text);
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

test('release acceptance distinguishes this installer from historical workflow evidence', () => {
  assert.ok(gigiBetaHtml.includes('Native checks used an isolated test workspace'));
  assert.ok(gigiBetaHtml.includes('GiGi 0.2.1 previously passed unsaved-record protection'));
  assert.ok(gigiBetaHtml.includes('Earlier builds passed native onboarding'));
  assert.ok(gigiBetaHtml.includes('No real Instagram publication has been verified for this release'));
  assert.ok(gigiBetaHtml.includes('bounded Gmail and Calendar imports'));
  assert.ok(gigiBetaHtml.includes('Phone remote access passed on an earlier build'));
  assert.ok(gigiBetaHtml.includes('not repeated for this installer'));
  assert.doesNotMatch(gigiBetaHtml, /Remaining native workflow checks.*pending/);
});


test('creative work scope preserves local media and explicit publishing boundaries', () => {
  for (const text of [
    'Music library', 'Instagram drafts', 'including MP4s', 'bounded and cancellable',
    'does not upload, move or delete your original media', 'index and saved artwork, not the media originals',
    'not copies of earlier file contents', 'Missing or changed files',
    'one JPEG image', 'direct public HTTPS URL', 'approved image host',
    'Business or Creator account', 'Personal accounts, Reels, Stories, carousels and scheduling are not supported',
    'explicitly confirm publication', 'outcome is unknown', 'local drafting remains available'
  ]) assert.ok(gigiBetaHtml.includes(text), text);
});


test('release describes bounded agent actions and separates saved tasks from sources', () => {
  for (const text of ['full local contact collection', 'before pagination', 'missing or invalid dates last', 'native picker', 'they cannot publish', 'earlier review request stale', 'does not automatically turn messages or events into tasks', 'does not change history configuration or repair an account connection', 'synthetic requests']) assert.ok(gigiBetaHtml.includes(text), text);
});


test('search release explains token matching, bounded waits and synthetic acceptance', () => {
  for (const text of ['Included from 0.2.3', 'Included from 0.2.2', 'middle name', 'without changing saved contacts', 'retry or clear', 'native read may still finish', '5,000 contacts and 200 linked companies', 'stale requests, timeouts and database contention', 'do not establish Grant’s live outcome or repair account connections', 'on GiGi 0.2.2']) assert.ok(gigiBetaHtml.includes(text), text);
});


test('Today layout release describes presentation changes without overstating workflow acceptance', () => {
  for (const text of ['Included from 0.2.5', 'compact top navigation', 'centered Today board', 'keyboard shortcut', 'retain their behavior', 'Visual checks used an isolated synthetic workspace', 'compact and expanded windows', 'Search checks from 0.2.3', 'do not establish Grant’s live outcome']) assert.ok(gigiBetaHtml.includes(text), text);
});


test('Sources release explains scoped preview, approval, sign-out and synthetic evidence', () => {
  const changes = gigiBetaHtml.match(/<section aria-labelledby="changes">([\s\S]*?)<\/section>/)?.[1] ?? '';
  for (const text of [
    'Included from 0.2.6', 'bounded Gmail or primary Calendar selection',
    'Ask GiGi', 'external MCP agent', 'UTC date scope',
    'scanned pages, not complete history', 'approve the local import',
    'created, existing and failed records', 'already saved records',
    'Sign out of GiGi sources', 'Google consent and imported records',
    'Included from 0.2.5'
  ]) assert.ok(changes.includes(text), text);
  assert.ok(gigiBetaHtml.includes('synthetic native companion/database fixtures and synthetic UI'));
  assert.ok(gigiBetaHtml.includes('do not establish real Google import, Grant’s access or fresh-installation acceptance'));
  assert.doesNotMatch(changes, /automatically import all|complete mailbox history|Linq.*connected|Grant.*verified/i);
});

test('Gigs release explains collection-wide ordering and bounded acceptance', () => {
  const changes = gigiBetaHtml.match(/<section aria-labelledby="changes">([\s\S]*?)<\/section>/)?.[1] ?? '';
  for (const text of [
    'Included from 0.2.7', 'Upcoming', 'Past', 'All', 'Needs date',
    'linked people or places', 'Status, Type and date range',
    'before pagination', 'matching counts', 'filters and scroll position',
    'same local-day and date-range rules as Schedule'
  ]) assert.ok(changes.includes(text), text);
  assert.ok(gigiBetaHtml.includes('59 synthetic gigs'));
  assert.ok(gigiBetaHtml.includes('Reset and detail/Back scroll recovery'));
  assert.ok(gigiBetaHtml.includes('do not establish real Google import, Grant’s access or fresh-installation acceptance'));
});


test('artwork release preserves local previews and external generation boundaries', () => {
  const changes = gigiBetaHtml.match(/<section aria-labelledby="changes">([\s\S]*?)<\/section>/)?.[1] ?? '';
  assert.ok(changes.includes(`What changed in ${gigiBeta.version}`));
  for (const text of ['Calendar entries', 'ongoing events', 'fit the whole image', 'AI illustrations', 'no publish control', 'external Codex', 'Embedded Ask GiGi cannot generate images', 'automatic flyer discovery', '8 MiB', '24 megapixels', '8,192 pixels', '128 MiB', 'including previews', 'Unknown rights remain unknown']) assert.ok(changes.includes(text), text);
  assert.ok(gigiBetaHtml.includes('Create a backup in GiGi, then quit the app before installing a new release.'));
  for (const text of ['mocked generation', 'no real image generation was invoked', 'do not establish a fresh Mac installation', 'local draft snapshots', 'provenance conflicts', 'backup restoration']) assert.ok(gigiBetaHtml.includes(text), text);
});
