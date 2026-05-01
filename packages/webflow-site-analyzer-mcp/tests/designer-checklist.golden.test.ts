import assert from 'node:assert/strict';
import test from 'node:test';

import { scoreDesignerChecklist } from '../src/checklist/designer-checklist.js';
import type { DesignerChecklistReport, DesignerMetadata } from '../src/types.js';

function baseMetadata(overrides: Partial<DesignerMetadata> = {}): DesignerMetadata {
  const metadata: DesignerMetadata = {
    url: 'https://preview.webflow.com/preview/golden-template',
    timestamp: '2026-05-01T00:00:00.000Z',
    siteName: 'Golden Template',
    sitePlan: 'basic',
    pages: [
      { name: 'Home', type: 'static' },
      { name: 'About', type: 'static' },
      { name: 'Style Guide', type: 'static' },
      { name: 'Instructions', type: 'static' },
      { name: 'Licenses', type: 'static' },
      { name: 'Blog Template', type: 'cms-template' }
    ],
    totalPages: 6,
    styleClasses: [
      { name: 'hero-section', isGlobal: false },
      { name: 'nav-link', isGlobal: false },
      { name: 'footer-link', isGlobal: false },
      { name: 'cta-button', isGlobal: false },
      { name: 'All H1 Headings', isGlobal: true },
      { name: 'All H2 Headings', isGlobal: true },
      { name: 'All H3 Headings', isGlobal: true },
      { name: 'All H4 Headings', isGlobal: true },
      { name: 'All H5 Headings', isGlobal: true },
      { name: 'All H6 Headings', isGlobal: true },
      { name: 'All Paragraphs', isGlobal: true },
      { name: 'All Links', isGlobal: true },
      { name: 'All Ordered Lists', isGlobal: true },
      { name: 'All Unordered Lists', isGlobal: true }
    ],
    totalClasses: 14,
    globalClasses: 10,
    customClasses: 4,
    components: [
      { name: 'Navbar', instanceCount: 1, isUnused: false },
      { name: 'Footer', instanceCount: 1, isUnused: false },
      { name: 'CTA Section', instanceCount: 2, isUnused: false }
    ],
    totalComponents: 3,
    unusedComponents: 0,
    interactions: [{ trigger: 'page-load', targetElement: '.hero-section', type: 'page-load' }],
    totalInteractions: 1,
    cmsCollections: [{ name: 'Blog Posts', itemCount: 5 }],
    totalCMSItems: 5,
    assets: [{ filename: 'hero.webp', type: 'image' }],
    totalAssets: 1,
    breakpoints: ['Desktop', '991px', '767px', '479px']
  };

  return { ...metadata, ...overrides };
}

function score(overrides: Partial<DesignerMetadata> = {}): DesignerChecklistReport {
  return scoreDesignerChecklist(baseMetadata(overrides), {
    includeManual: true,
    source: 'provided-metadata'
  });
}

function resultMap(report: DesignerChecklistReport): Record<string, string> {
  return Object.fromEntries(report.checks.map((check) => [check.id, check.result]));
}

function check(report: DesignerChecklistReport, id: string) {
  const found = report.checks.find((item) => item.id === id);
  assert.ok(found, `Expected checklist check ${id} to exist`);
  return found;
}

test('golden passing Designer metadata scores exact automated pass/manual outcomes', () => {
  const report = score();

  assert.equal(report.source, 'provided-metadata');
  assert.equal(report.metadataSummary.siteName, 'Golden Template');
  assert.deepEqual(resultMap(report), {
    'components.nav_footer_cta': 'pass',
    'components.title_case_naming': 'pass',
    'components.unused_cleaned': 'pass',
    'interactions.cleaned_unused': 'manual',
    'variables.breakpoint_modes': 'pass',
    'variables.defined_reusable': 'manual',
    'variables.title_case_naming': 'manual',
    'styles.base_tag_selectors': 'pass',
    'styles.unused_classes_cleaned': 'manual',
    'styles.combo_class_depth': 'manual',
    'styles.class_naming_consistency': 'pass',
    'pages.title_case_naming': 'pass',
    'pages.style_guide_exists': 'pass',
    'pages.instructions_exists': 'pass',
    'pages.licenses_exists': 'pass',
    'cms.collection_pages_present': 'pass',
    'cms.collections_detected': 'pass',
    'cms.item_count_range': 'pass',
    'cms.collection_name_title_case': 'pass',
    'cms.collection_slug_singular': 'manual',
    'responsive.breakpoints_present': 'pass',
    'assets.modern_image_formats': 'pass',
    'ecommerce.settings_default': 'manual'
  });
  assert.deepEqual(report.summary, {
    pass: 16,
    fail: 0,
    manual: 7,
    scored: 16,
    passRate: 1
  });
});

test('components fixture distinguishes missing, invalid, and unused component failures', () => {
  const report = score({
    components: [
      { name: 'nav-main', instanceCount: 1, isUnused: false },
      { name: 'footer', instanceCount: 1, isUnused: false },
      { name: 'promo panel', instanceCount: 0, isUnused: true }
    ],
    totalComponents: 3,
    unusedComponents: 1
  });

  assert.equal(check(report, 'components.nav_footer_cta').result, 'fail');
  assert.deepEqual(check(report, 'components.nav_footer_cta').evidence, [
    'components=3',
    'hasNavOrHeader=true',
    'hasFooter=true',
    'hasCTA=false'
  ]);
  assert.equal(check(report, 'components.title_case_naming').result, 'fail');
  assert.deepEqual(check(report, 'components.title_case_naming').evidence, [
    'invalidCount=2',
    'examples=nav-main | promo panel'
  ]);
  assert.equal(check(report, 'components.unused_cleaned').result, 'fail');
  assert.deepEqual(check(report, 'components.unused_cleaned').evidence, ['unusedComponents=1']);
});

test('required pages fixture covers title case, style guide, instructions, and licenses failures', () => {
  const report = score({
    pages: [
      { name: 'home page', type: 'static' },
      { name: 'About', type: 'static' }
    ],
    totalPages: 2,
    interactions: [{ trigger: 'scroll', targetElement: '.fade-in', type: 'scroll' }],
    totalInteractions: 1
  });

  assert.equal(check(report, 'pages.title_case_naming').result, 'fail');
  assert.deepEqual(check(report, 'pages.title_case_naming').evidence, [
    'invalidCount=1',
    'examples=home page'
  ]);
  assert.equal(check(report, 'pages.style_guide_exists').result, 'fail');
  assert.deepEqual(check(report, 'pages.style_guide_exists').evidence, ['found=false']);
  assert.equal(check(report, 'pages.instructions_exists').result, 'fail');
  assert.deepEqual(check(report, 'pages.instructions_exists').evidence, [
    'found=false',
    'hasAdvancedInteractions=true',
    'totalInteractions=1'
  ]);
  assert.equal(check(report, 'pages.licenses_exists').result, 'fail');
  assert.deepEqual(check(report, 'pages.licenses_exists').evidence, ['found=false']);
});

test('CMS absent fixture is treated as not applicable evidence rather than an automated failure', () => {
  const report = score({
    cmsCollections: [],
    totalCMSItems: 0,
    pages: baseMetadata().pages.filter((page) => page.type !== 'cms-template'),
    totalPages: 5
  });

  for (const id of [
    'cms.collection_pages_present',
    'cms.collections_detected',
    'cms.item_count_range',
    'cms.collection_name_title_case'
  ]) {
    const cmsCheck = check(report, id);
    assert.equal(cmsCheck.result, 'pass');
    assert.ok(
      cmsCheck.evidence.some((entry) => entry.toLowerCase().includes('not applicable')),
      `${id} should explain that CMS is not applicable`
    );
  }
});

test('CMS present fixture fails exact automated collection page, item count, and naming checks', () => {
  const report = score({
    cmsCollections: [
      { name: 'blog posts', itemCount: 2 },
      { name: 'Authors', itemCount: 8 }
    ],
    totalCMSItems: 10,
    pages: baseMetadata().pages.filter((page) => page.type !== 'cms-template'),
    totalPages: 5
  });

  assert.equal(check(report, 'cms.collection_pages_present').result, 'fail');
  assert.deepEqual(check(report, 'cms.collection_pages_present').evidence, [
    'cmsTemplatePages=0',
    'cmsCollections=2'
  ]);
  assert.equal(check(report, 'cms.collections_detected').result, 'pass');
  assert.deepEqual(check(report, 'cms.collections_detected').evidence, ['collections=2']);
  assert.equal(check(report, 'cms.item_count_range').result, 'fail');
  assert.deepEqual(check(report, 'cms.item_count_range').evidence, [
    'outOfRange=blog posts:2, Authors:8'
  ]);
  assert.equal(check(report, 'cms.collection_name_title_case').result, 'fail');
  assert.deepEqual(check(report, 'cms.collection_name_title_case').evidence, [
    'invalid=blog posts'
  ]);
});

test('variables and unavailable graph-backed data remain manual so the analyzer does not claim full automation', () => {
  const report = score();

  for (const id of [
    'interactions.cleaned_unused',
    'variables.defined_reusable',
    'variables.title_case_naming',
    'styles.unused_classes_cleaned',
    'styles.combo_class_depth',
    'cms.collection_slug_singular',
    'ecommerce.settings_default'
  ]) {
    assert.equal(check(report, id).result, 'manual', `${id} should stay manual`);
  }

  assert.equal(report.summary.manual, 7);
  assert.ok(report.summary.scored < report.checks.length);
});

test('class naming and base tag fixtures produce exact style selector failures', () => {
  const report = score({
    styleClasses: [
      { name: 'Hero Section', isGlobal: false },
      { name: 'nav-link', isGlobal: false },
      { name: 'footer_link', isGlobal: false },
      { name: 'ctaButton', isGlobal: false },
      { name: 'All H1 Headings', isGlobal: true },
      { name: 'All H2 Headings', isGlobal: true },
      { name: 'All H3 Headings', isGlobal: true },
      { name: 'All H4 Headings', isGlobal: true },
      { name: 'All H5 Headings', isGlobal: true },
      { name: 'All H6 Headings', isGlobal: true },
      { name: 'All Paragraphs', isGlobal: true },
      { name: 'All Ordered Lists', isGlobal: true },
      { name: 'All Unordered Lists', isGlobal: true }
    ],
    totalClasses: 13,
    globalClasses: 9,
    customClasses: 4
  });

  assert.equal(check(report, 'styles.base_tag_selectors').result, 'fail');
  assert.deepEqual(check(report, 'styles.base_tag_selectors').evidence, ['missing=all links']);
  assert.equal(check(report, 'styles.class_naming_consistency').result, 'fail');
  assert.deepEqual(check(report, 'styles.class_naming_consistency').evidence, [
    'dominantPattern=title',
    'dominantRatio=0.25',
    'sampleSize=4'
  ]);
});

test('breakpoints fixture fails both variables and responsive breakpoint checks exactly', () => {
  const report = score({
    breakpoints: ['Desktop', '991px']
  });

  assert.equal(check(report, 'variables.breakpoint_modes').result, 'fail');
  assert.deepEqual(check(report, 'variables.breakpoint_modes').evidence, [
    'breakpoints=Desktop | 991px',
    'tablet=true',
    'mobileLandscape=false',
    'mobilePortrait=false'
  ]);
  assert.equal(check(report, 'responsive.breakpoints_present').result, 'fail');
  assert.deepEqual(check(report, 'responsive.breakpoints_present').evidence, [
    'breakpoints=Desktop | 991px'
  ]);
});

test('asset format fixture fails when only unsupported asset extensions are provided', () => {
  const report = score({
    assets: [
      { filename: 'hero.gif', type: 'image' },
      { filename: 'brand.svg', type: 'svg' },
      { filename: 'intro.mp4', type: 'video' }
    ],
    totalAssets: 3
  });

  assert.equal(check(report, 'assets.modern_image_formats').result, 'fail');
  assert.deepEqual(check(report, 'assets.modern_image_formats').evidence, [
    'assets=3',
    'hasModernFormats=false'
  ]);
});
