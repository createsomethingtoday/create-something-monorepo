import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSkippedDesignerChecklistReport,
  scoreDesignerChecklist,
} from '../src/checklist/designer-checklist.ts';
import type { DesignerMetadata } from '../src/types.ts';

function createMetadataWithMissingPageInventory(): DesignerMetadata {
  return {
    url: 'https://preview.webflow.com/preview/humana-ai',
    timestamp: '2026-04-07T15:53:42.215Z',
    siteName: 'Webflow - Humana | Intelligence Platform',
    sitePlan: 'CMS',
    pages: [],
    totalPages: 0,
    styleClasses: [
      { name: 'All H1 Headings', isGlobal: true },
      { name: 'All H2 Headings', isGlobal: true },
      { name: 'All H3 Headings', isGlobal: true },
      { name: 'All H4 Headings', isGlobal: true },
      { name: 'All H5 Headings', isGlobal: true },
      { name: 'All H6 Headings', isGlobal: true },
      { name: 'All Paragraphs', isGlobal: true },
      { name: 'All Links', isGlobal: true },
      { name: 'All Unordered Lists', isGlobal: true },
      { name: 'All Ordered Lists', isGlobal: true },
    ],
    totalClasses: 10,
    globalClasses: 10,
    customClasses: 0,
    components: [
      { name: 'Navbar', instanceCount: 1, isUnused: false },
      { name: 'Footer', instanceCount: 1, isUnused: false },
      { name: 'Primary CTA', instanceCount: 1, isUnused: false },
    ],
    totalComponents: 3,
    unusedComponents: 0,
    interactions: [{ trigger: 'Page load', targetElement: 'Global', type: 'page-load' }],
    totalInteractions: 1,
    cmsCollections: [{ name: 'Guidelines', itemCount: 6 }],
    totalCMSItems: 6,
    assets: [{ filename: 'hero.webp', type: 'image' }],
    totalAssets: 1,
    breakpoints: [
      'Desktop: Base breakpoint',
      'Tablet: 991px and down',
      'Mobile (L): 767px and down',
      'Mobile: 479px and down',
    ],
  };
}

function findCheck(checks: ReturnType<typeof scoreDesignerChecklist>['checks'], id: string) {
  const match = checks.find((check) => check.id === id);
  assert.ok(match, `Expected check ${id} to exist`);
  return match;
}

test('scoreDesignerChecklist downgrades page-dependent checks when Designer page inventory is unavailable', () => {
  const report = scoreDesignerChecklist(createMetadataWithMissingPageInventory(), {
    includeManual: true,
    source: 'provided-metadata',
  });

  assert.equal(findCheck(report.checks, 'pages.title_case_naming').result, 'manual');
  assert.equal(findCheck(report.checks, 'pages.style_guide_exists').result, 'manual');
  assert.equal(findCheck(report.checks, 'pages.instructions_exists').result, 'manual');
  assert.equal(findCheck(report.checks, 'pages.licenses_exists').result, 'manual');
  assert.equal(findCheck(report.checks, 'cms.collection_pages_present').result, 'manual');

  const evidence = findCheck(report.checks, 'pages.style_guide_exists').evidence;
  assert.deepEqual(evidence, ['Designer page list is unavailable from the current extraction.']);
});

test('createSkippedDesignerChecklistReport downgrades every Designer check to manual with a shared reason', () => {
  const report = createSkippedDesignerChecklistReport('Designer checklist skipped in best-effort mode.');

  assert.equal(report.source, 'skipped');
  assert.ok(report.checks.length > 0);
  assert.equal(report.summary.pass, 0);
  assert.equal(report.summary.fail, 0);
  assert.equal(report.summary.manual, report.checks.length);

  for (const check of report.checks) {
    assert.equal(check.result, 'manual');
    assert.deepEqual(check.evidence, ['Designer checklist skipped in best-effort mode.']);
  }
});
