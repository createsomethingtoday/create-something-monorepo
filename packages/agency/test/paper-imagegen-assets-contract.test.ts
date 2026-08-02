import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  paperAttachedReceiptMedia,
  paperClampedDecisionMedia,
  paperFoldedHandoffMedia,
  paperProductSystemMedia,
  performancePaperRouteAssignments
} from '../src/lib/data/performanceMedia.ts';

const agencyRoot = resolve(import.meta.dirname, '..');
const assetRoot = resolve(agencyRoot, 'static/images/performance-lab');
const metadataPath = resolve(
  agencyRoot,
  'content/assets/brand/agency-paper-under-pressure-imagegen.v20260802/metadata.md'
);

const studies = [
  paperFoldedHandoffMedia,
  paperClampedDecisionMedia,
  paperAttachedReceiptMedia,
  paperProductSystemMedia
];

test('publishes responsive Paper campaign descriptors with immutable assets', () => {
  assert.deepEqual(
    studies.map((study) => study.material),
    ['paper', 'paper', 'paper', 'paper']
  );

  for (const study of studies) {
    assert.match(study.src, /^\/images\/performance-lab\/paper-[a-z-]+\.webp$/);
    assert.match(study.mobileSrc, /^\/images\/performance-lab\/paper-[a-z-]+-mobile\.webp$/);
    assert.ok(study.alt.length >= 80, `${study.src} needs descriptive alt text`);
    assert.ok(existsSync(resolve(assetRoot, study.src.split('/').at(-1)!)));
    assert.ok(existsSync(resolve(assetRoot, study.mobileSrc.split('/').at(-1)!)));
  }
});

test('assigns one distinct Paper study to each campaign route', () => {
  assert.deepEqual(performancePaperRouteAssignments, {
    '/': 'paperFoldedHandoffMedia',
    '/services': 'paperClampedDecisionMedia',
    '/products': 'paperProductSystemMedia',
    '/field-reports': 'paperAttachedReceiptMedia'
  });

  for (const [route, descriptor] of Object.entries(performancePaperRouteAssignments)) {
    const relativeRoute = route === '/' ? '' : route;
    const source = readFileSync(resolve(agencyRoot, `src/routes${relativeRoute}/+page.svelte`), 'utf8');
    assert.match(source, new RegExp(`\\b${descriptor}\\b`), `${route} must use ${descriptor}`);
    assert.doesNotMatch(source, /controlled-flow-natural|turbulenceExceptionMedia|ControlledWaterwayStory/);
  }
});

test('records complete generation, inspection, rights, and hash evidence', () => {
  const metadata = readFileSync(metadataPath, 'utf8');

  for (const required of [
    'billing_hard_limit_reached',
    'did not expose a model',
    'CRE-1590',
    'product-system-desktop.png',
    'product-system-mobile.png',
    '2cf05defe0abfdcef62822da8f60f13d87f4db817dc381320bc7eaa1caafde72',
    '8577e3037944cf131c7976c67df4c2749640e34835a81225be63cffcd41a697d',
    'weaker connector legibility',
    'SHA-256',
    'Rights and use',
    'Refresh condition',
    'source/prompts.md'
  ]) {
    assert.ok(metadata.includes(required), `metadata must record ${required}`);
  }

  assert.doesNotMatch(metadata, /- \[ \]/);
});
