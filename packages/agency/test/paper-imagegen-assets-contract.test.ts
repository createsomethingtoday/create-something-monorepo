import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  paperAttachedReceiptMedia,
  paperClampedDecisionMedia,
  paperFoldedHandoffMedia,
  paperOperatingRouteMedia,
  paperProductSystemMedia,
  performancePaperRouteAssignments
} from '../src/lib/data/performanceMedia.ts';

const agencyRoot = resolve(import.meta.dirname, '..');
const assetRoot = resolve(agencyRoot, 'static/images/performance-lab');
const metadataPath = resolve(
  agencyRoot,
  'content/assets/brand/agency-paper-under-pressure-imagegen.v20260802/metadata.md'
);
const operatingRouteMetadataPath = resolve(
  agencyRoot,
  'content/assets/brand/agency-operating-route-imagegen.v20260805/metadata.md'
);

const studies = [
  paperOperatingRouteMedia,
  paperFoldedHandoffMedia,
  paperClampedDecisionMedia,
  paperAttachedReceiptMedia,
  paperProductSystemMedia
];

test('publishes responsive Paper campaign descriptors with immutable assets', () => {
  assert.deepEqual(
    studies.map((study) => study.material),
    ['paper', 'paper', 'paper', 'paper', 'paper']
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
  const primaryCampaignAssignments = Object.fromEntries(
    Object.entries(performancePaperRouteAssignments).filter(([route]) =>
      ['/', '/services', '/products', '/field-reports'].includes(route)
    )
  );

  assert.deepEqual(primaryCampaignAssignments, {
    '/': 'paperOperatingRouteMedia',
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

test('records original ImageGen provenance for the Paper operating route', () => {
  const metadata = readFileSync(operatingRouteMetadataPath, 'utf8');

  for (const required of [
    'OpenAI ImageGen',
    'operating-route-desktop.png',
    'operating-route-mobile.png',
    'paper-operating-route.webp',
    'paper-operating-route-mobile.webp',
    '53b899b7a37457eead4fc5cb9cd1f9422f8e5bee73928559d046cd87bb669d1c',
    'd9cc104172aa70d2554594258b5a5c809d512a25ea6fb0920a16e9869fb6e807',
    'No third-party image input',
    'SHA-256',
    'Rights and use',
    'Refresh condition',
    'source/prompts.md'
  ]) {
    assert.ok(metadata.includes(required), `metadata must record ${required}`);
  }

  assert.doesNotMatch(metadata, /- \[ \]/);
});
