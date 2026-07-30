import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  clarityInspectionMedia,
  performanceWaterRouteAssignments,
  settlementResolvedMedia,
  traceDyeInjectionMedia,
  turbulenceExceptionMedia
} from '../src/lib/data/performanceMedia.ts';

const agencyRoot = resolve(import.meta.dirname, '..');
const assetRoot = resolve(agencyRoot, 'static/images/performance-lab');
const packageMetadata = resolve(
  agencyRoot,
  'content/assets/brand/agency-performance-lab-bench-water.v20260725/metadata.md'
);

const expectedStudies = [
  traceDyeInjectionMedia,
  turbulenceExceptionMedia,
  clarityInspectionMedia,
  settlementResolvedMedia
];

test('publishes a responsive, condition-specific descriptor for every bench-water study', () => {
  assert.deepEqual(
    expectedStudies.map((study) => study.condition),
    ['provenance', 'exception', 'inspection', 'resolved']
  );

  for (const study of expectedStudies) {
    assert.match(study.src, /^\/images\/performance-lab\/[a-z-]+\.webp$/);
    assert.match(study.mobileSrc, /^\/images\/performance-lab\/[a-z-]+-mobile\.webp$/);
    assert.ok(study.alt.length >= 60, `${study.src} needs descriptive alt text`);
    assert.ok(existsSync(resolve(assetRoot, study.src.split('/').at(-1)!)));
    assert.ok(existsSync(resolve(assetRoot, study.mobileSrc.split('/').at(-1)!)));
  }
});

test('assigns each study to matching routes without exceeding two public surface families', () => {
  const expectedAssignments = {
    '/map': 'clarityInspectionMedia',
    '/services': 'turbulenceExceptionMedia',
    '/control': 'turbulenceExceptionMedia',
    '/delivery': 'settlementResolvedMedia',
    '/proof/marketplace-workflow': 'traceDyeInjectionMedia',
    '/products/loom': 'traceDyeInjectionMedia'
  } as const;

  assert.deepEqual(performanceWaterRouteAssignments, expectedAssignments);

  const counts = new Map<string, number>();
  for (const descriptor of Object.values(performanceWaterRouteAssignments)) {
    counts.set(descriptor, (counts.get(descriptor) ?? 0) + 1);
  }
  for (const [descriptor, count] of counts) {
    assert.ok(count <= 2, `${descriptor} is reused across ${count} public surface families`);
  }

  for (const [route, descriptor] of Object.entries(expectedAssignments)) {
    const source = readFileSync(resolve(agencyRoot, `src/routes${route}/+page.svelte`), 'utf8');
    assert.match(source, new RegExp(`\\b${descriptor}\\b`), `${route} must use ${descriptor}`);
  }
});

test('keeps genuine wake claims on the existing trace-wake study', () => {
  for (const route of ['/field-reports/template-review', '/dify/mcp-control-plane']) {
    const source = readFileSync(resolve(agencyRoot, `src/routes${route}/+page.svelte`), 'utf8');
    assert.match(source, /trace-wake-natural\.webp/);
  }
});

test('records a completed original and mobile-crop inspection contract', () => {
  const metadata = readFileSync(packageMetadata, 'utf8');
  assert.match(metadata, /Status: \*\*accepted for local integration — not published\*\*/);
  assert.doesNotMatch(metadata, /- \[ \]/);

  for (const name of [
    'trace-dye-injection',
    'turbulence-exception',
    'clarity-inspection',
    'settlement-resolved'
  ]) {
    assert.match(metadata, new RegExp(`${name}\\.png`));
    assert.match(metadata, new RegExp(`${name}-mobile\\.webp`));
  }
});
