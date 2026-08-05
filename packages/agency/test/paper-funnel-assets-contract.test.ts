import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const expectedAssignments = {
  '/': 'paperOperatingRouteMedia',
  '/services': 'paperClampedDecisionMedia',
  '/products': 'paperProductSystemMedia',
  '/field-reports': 'paperAttachedReceiptMedia',
  '/map': 'paperFoldedHandoffMedia',
  '/control': 'paperClampedDecisionMedia',
  '/delivery': 'paperAttachedReceiptMedia',
  '/proof/marketplace-workflow': 'paperAttachedReceiptMedia',
  '/field-reports/template-review': 'paperAttachedReceiptMedia',
  '/products/loom': 'paperAttachedReceiptMedia'
} as const;

const retiredWaterLanguage = /trace-dye|turbulence|clarity-inspection|settlement-resolved|trace-wake|controlled-flow|\bwater\b|\bwake\b|\bchannel\b|\bdam\b|\bdye\b|\bsluice\b/i;

test('keeps the public campaign policy on semantic Paper studies', () => {
  assert.deepEqual(performancePaperRouteAssignments, expectedAssignments);

  for (const study of [
    paperOperatingRouteMedia,
    paperFoldedHandoffMedia,
    paperClampedDecisionMedia,
    paperAttachedReceiptMedia,
    paperProductSystemMedia
  ]) {
    assert.equal(study.material, 'paper');
    assert.match(study.src, /^\/images\/performance-lab\/paper-[a-z-]+\.webp$/);
    assert.match(study.mobileSrc, /^\/images\/performance-lab\/paper-[a-z-]+-mobile\.webp$/);
  }
});

test('replaces the retired water analogy across every scoped public route', () => {
  for (const [route, descriptor] of Object.entries(expectedAssignments)) {
    const relativeRoute = route === '/' ? '' : route;
    const source = readFileSync(resolve(agencyRoot, `src/routes${relativeRoute}/+page.svelte`), 'utf8');

    assert.match(source, new RegExp(`\\b${descriptor}\\b`), `${route} must use ${descriptor}`);
    assert.doesNotMatch(source, retiredWaterLanguage, `${route} still exposes the retired water analogy`);
  }

  const mediaPolicy = readFileSync(resolve(agencyRoot, 'src/lib/data/performanceMedia.ts'), 'utf8');
  assert.doesNotMatch(mediaPolicy, retiredWaterLanguage);
});

test('keeps draft, request, and booking commitments as distinct public actions', () => {
  const copy = readFileSync(resolve(agencyRoot, 'src/lib/data/marketingCopy.ts'), 'utf8');
  const funnel = readFileSync(resolve(agencyRoot, 'src/lib/components/FunnelLadder.svelte'), 'utf8');
  const booking = readFileSync(resolve(agencyRoot, 'src/routes/book/+page.svelte'), 'utf8');

  assert.match(copy, /startWithWorkflowLabel: 'Start a private workflow draft'/);
  assert.match(copy, /workflowTeardownLabel: 'Request a workflow map'/);
  assert.match(copy, /bookMappingSessionLabel: 'Book a mapping session'/);
  assert.match(funnel, /title: 'Private workflow draft'/);
  assert.match(funnel, /title: 'Workflow-map request'/);
  assert.match(funnel, /title: 'Mapping session'/);
  assert.match(booking, /Start a private workflow draft/);
});

test('uses direct reader-facing language through the draft and booking handoff', () => {
  const funnel = readFileSync(resolve(agencyRoot, 'src/lib/components/FunnelLadder.svelte'), 'utf8');
  const map = readFileSync(resolve(agencyRoot, 'src/routes/map/+page.svelte'), 'utf8');
  const booking = readFileSync(resolve(agencyRoot, 'src/routes/book/+page.svelte'), 'utf8');
  const visibleCopy = [funnel, map, booking].join('\n');

  assert.match(funnel, /Start with a reusable checklist\. Make a private draft\./);
  assert.match(map, /A short summary can travel to a mapping session/);
  assert.match(booking, /Review what will be shared/);
  assert.doesNotMatch(visibleCopy, /bounded (summary|handoff|context|fields)|owned scheduler/i);
});
