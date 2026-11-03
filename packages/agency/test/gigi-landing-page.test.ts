import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gigiBeta } from '../src/lib/data/gigiBeta';
import { gigiLandingHtml, gigiLandingHeaders } from '../src/lib/server/gigi-landing-page';
import { gigiLandingStyles } from '../src/lib/server/gigi-landing-styles';
import { readFileSync } from 'node:fs';

test('landing downloads use the same immutable release as the detailed beta page', () => {
  const downloads = [...gigiLandingHtml.matchAll(/<a[^>]*download="([^"]+)"[^>]*>/g)];
  assert.equal(downloads.length, 3);
  for (const [anchor, filename] of downloads) {
    assert.equal(filename, gigiBeta.filename);
    assert.ok(anchor.includes(`href="${gigiBeta.url}"`));
  }
  assert.ok(gigiLandingHtml.includes(`Beta ${gigiBeta.version}`));
  assert.match(gigiLandingHtml, /href="\/gigi\/beta"/);
  assert.ok(gigiLandingHtml.includes('macOS 13 or later'));
  assert.ok(gigiLandingHtml.includes('Apple Silicon'));
});

test('landing preserves beta privacy and avoids active content or tracking', () => {
  assert.equal(gigiLandingHeaders['X-Robots-Tag'], 'noindex, nofollow');
  assert.equal(gigiLandingHeaders['Cache-Control'], 'no-store');
  assert.equal(gigiLandingHeaders['Referrer-Policy'], 'no-referrer');
  assert.match(gigiLandingHeaders['Content-Security-Policy'], /default-src 'none'/);
  assert.match(gigiLandingHtml, /content="script-src 'none'"/);
  assert.doesNotMatch(gigiLandingHtml, /<script|<iframe|<form|<img|@import|url\(|on(click|load)=/i);
  assert.doesNotMatch(gigiLandingHtml, /\/Users\/|libfile_|localhost|Design concept/);
});

test('landing uses current Today structure and clearly labels example records', () => {
  assert.equal((gigiLandingHtml.match(/<h1>/g) || []).length, 1);
  assert.match(gigiLandingHtml, /Your gigs\. Your people\./);
  for (const label of ['Today', 'Music', 'Gigs', 'People', 'Upcoming work', 'Open tasks', 'Unpaid records', 'Sample records, not a screenshot']) assert.ok(gigiLandingHtml.includes(label), label);
  assert.doesNotMatch(gigiLandingHtml, /<aside|DAILY WORK|Your work, at a glance/);
  for (const caveat of ['No automatic cloud sync or iOS app', 'Intel Macs are not supported', 'No sign-in is needed for local records', 'separately installed Codex CLI', 'provider account', 'not off-device backups', 'Real Google setup and import on this release remain unverified']) assert.ok(gigiLandingHtml.includes(caveat), caveat);
});

test('anchors, FAQ and keyboard path remain useful without JavaScript', () => {
  const ids = [...gigiLandingHtml.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of gigiLandingHtml.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
  assert.match(gigiLandingHtml, /class="skip" href="#main"/);
  assert.equal((gigiLandingHtml.match(/<details>/g) || []).length, 4);
  assert.match(gigiLandingStyles, /:focus-visible/);
  assert.match(gigiLandingStyles, /prefers-reduced-motion/);
});

test('checked-in styles match the CSS-compatible Sass source', () => {
  assert.equal(gigiLandingStyles, readFileSync(new URL('../src/lib/server/gigi-landing.scss', import.meta.url), 'utf8'));
});
