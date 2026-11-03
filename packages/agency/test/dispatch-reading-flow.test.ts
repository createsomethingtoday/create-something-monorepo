import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { usesRouteOwnedAgencyPerformanceEnding } from '../src/lib/atlas/surface-policy';

const route = readFileSync(new URL('../src/routes/dispatch/+page.svelte', import.meta.url), 'utf8');

test('Dispatch owns its ending, including normalized entry URLs, without claiming other routes', () => {
  for (const path of ['/dispatch', '/dispatch/?source=nav', '/dispatch#featured-report']) {
    assert.equal(usesRouteOwnedAgencyPerformanceEnding(path), true, path);
  }
  assert.equal(usesRouteOwnedAgencyPerformanceEnding('/dispatch/unknown'), false);
});

test('Dispatch serves the approved headline before the browser copy treatment runs', () => {
  assert.match(route, /title="The work, with evidence\."/);
  assert.match(route, /lede="What happened, what we learned, and where each result has limits\."/);
});

test('Dispatch preserves the selected-case evidence and reporting boundaries', () => {
  assert.match(route, /49 of 50 selected cases/);
  assert.match(route, /Automated judgment did not earn promotion/);
  assert.match(route, /time savings remain unmeasured/);
  assert.match(route, /Client-private records stay private/);
  assert.match(route, /Email is capped at two validated sends per month/);
});
