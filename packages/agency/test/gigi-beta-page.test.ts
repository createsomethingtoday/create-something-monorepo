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
  assert.equal(gigiBeta.version, '0.2.20');
  assert.equal(gigiBeta.filename, 'GiGi-0.2.20-arm64-private-beta.dmg');
  assert.equal(gigiBeta.bytes, 84785972);
  assert.equal(gigiBeta.sha256, '42e5fe8d9f3a2aa8c82d5077eb7fb4c9da31cb475ff997c77babaef05e1cdaea');
  assert.equal(gigiBeta.url, `https://media.createsomething.io/releases/gigi/0.2.20/GiGi-0.2.20-arm64-private-beta.dmg`);
  for (const text of ['macOS 13', 'Apple Silicon', 'Intel Macs are not supported', gigiBeta.url, gigiBeta.sha256, '84,785,972', '84.8 MB']) assert.ok(gigiBetaHtml.includes(text), text);
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


test('setup and classification release keeps session and acceptance boundaries explicit', () => {
  const changes = gigiBetaHtml.match(/<section aria-labelledby="changes">([\s\S]*?)<\/section>/)?.[1] ?? '';
  for (const text of ['Included from 0.2.8', 'Work kind', 'leaves existing records unchanged', 'not automatically a performance', 'Configuration stays unchanged', 'already-open agent session', 'before pagination', 'Original Type values']) assert.ok(changes.includes(text), text);
  for (const text of ['final compiled app code and data in isolated QA wrappers', 'One real Codex-generated illustration', 'using the installed 0.2.8 MCP', 'Follow-up 0.2.9 checks', 'already-running agent session remain unverified', 'GiGi 0.2.8: Earlier checks', 'Previous installer:', '0.2.18/GiGi-0.2.18-arm64-private-beta.dmg']) assert.ok(gigiBetaHtml.includes(text), text);
});

test("current release clearly defers phone qualification and preserves rollback", () => {
 assert.ok(gigiBetaHtml.includes("Phone workflow unverified for 0.2.20"));
 assert.ok(gigiBetaHtml.includes("Physical-phone qualification is deferred"));
 assert.ok(gigiBetaHtml.includes("GiGi 0.2.18 for Apple Silicon"));
});


test('connection guidance separates admission from Google consent and limits acceptance claims', () => {
 for (const text of ['GiGi sign-in, app access and Google consent', 'Existing connections and pending consent are preserved', 'reconnecting Google does not repair admission', '734 automated tests with no skips', 'no Google provider calls', 'Grant’s specific denial remain unverified', '0.2.12 improvements', '0.2.13 agent continuation']) assert.ok(gigiBetaHtml.includes(text), text);
});

test('download page offers public signup without claiming Google onboarding qualification', () => {
 assert.match(gigiBetaHtml, /href="https:\/\/id\.createsomething\.space\/signup\?app=gigi"/);
 assert.ok(gigiBetaHtml.includes('No invitation is needed'));
 assert.ok(gigiBetaHtml.includes('No new installer is required'));
 assert.ok(gigiBetaHtml.includes('verify your email'));
 assert.ok(gigiBetaHtml.includes('Sign in to GiGi sources'));
 assert.ok(gigiBetaHtml.includes('Public Google consent and first-import qualification remain unverified'));
 assert.doesNotMatch(gigiBetaHtml, /use the invited GiGi account|ask the beta operator to review access/);
});

test('customization describes visible controls and portable device-local preferences', () => {
  const section = gigiBetaHtml.match(/<section aria-labelledby="customization">([\s\S]*?)<\/section>/)?.[1] ?? '';
  for (const text of ['Make GiGi yours', 'Studio', 'Paper', 'Midnight', 'spacing', 'list or cards', 'starting page', 'JSON', 'device and workspace', 'Appearance &amp; views', 'Reset', 'Work, Library and Workspace', 'keyboard navigation']) assert.ok(section.includes(text), text);
  assert.ok(section.includes('do not sync between devices'));
  assert.ok(section.includes('do not include records, accounts or permissions'));
  assert.ok(gigiBetaHtml.includes('Earlier release notes'));
  assert.ok(gigiBetaHtml.includes('Earlier workflow evidence'));
});

test('current release qualification distinguishes native synthetic checks from fresh setup', () => {
  for (const text of ['GiGi 0.2.20 passed 329 desktop', 'Native minimum-window resizing and native error persistence remain unverified', 'isolated native workspace', 'verified readback', 'notification permission recovery', 'matched the qualified build', 'notification-click routing remains a manual acceptance check']) assert.ok(gigiBetaHtml.includes(text), text);
  assert.ok(!gigiBetaHtml.includes('Release qualification for this customization update is in progress'));
});

test('assistance release explains attention, consent and app-running notification limits',()=>{
 for(const text of ['Needs your attention','quiet hours','opt-in','while GiGi is running','never approves a change','Detailed previews','Snooze']) assert.ok(gigiBetaHtml.includes(text),text);
});
