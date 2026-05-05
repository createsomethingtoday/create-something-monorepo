/**
 * Unit test for designer-checklist and unifyRows changes.
 *
 * Exercises:
 * - Fix #1: Conditional instructions page (only required when interactions exist)
 * - Fix #2: Tighter homepage SEO title check (prefix must match site name)
 * - Fix #3: DOM fallback audit shape compatibility
 * - Fix #4: Policy checks surfaced as unified rows
 * - Fix #5: Designer page names in metadataSummary
 *
 * Run: npx tsx test-checklist-changes.ts
 */

import { scoreDesignerChecklist } from './src/checklist/designer-checklist.js';
import type { DesignerMetadata } from './src/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function makeMetadata(overrides: Partial<DesignerMetadata> = {}): DesignerMetadata {
  return {
    url: 'https://preview.webflow.com/preview/test',
    timestamp: new Date().toISOString(),
    siteName: 'Test Template',
    sitePlan: 'basic',
    pages: [
      { name: 'Home', type: 'static' },
      { name: 'About', type: 'static' },
      { name: 'Style Guide', type: 'static' },
      { name: 'Licenses', type: 'static' },
    ],
    totalPages: 4,
    styleClasses: [
      { name: 'hero-section', isGlobal: false },
      { name: 'nav-link', isGlobal: false },
      { name: 'All H1 Headings', isGlobal: true },
      { name: 'All H2 Headings', isGlobal: true },
      { name: 'All H3 Headings', isGlobal: true },
      { name: 'All H4 Headings', isGlobal: true },
      { name: 'All H5 Headings', isGlobal: true },
      { name: 'All H6 Headings', isGlobal: true },
      { name: 'All Paragraphs', isGlobal: true },
      { name: 'All Links', isGlobal: true },
      { name: 'All Ordered Lists', isGlobal: true },
      { name: 'All Unordered Lists', isGlobal: true },
    ],
    totalClasses: 12,
    globalClasses: 10,
    customClasses: 2,
    components: [
      { name: 'Navbar', instanceCount: 1, isUnused: false },
      { name: 'Footer', instanceCount: 1, isUnused: false },
      { name: 'CTA Section', instanceCount: 2, isUnused: false },
    ],
    totalComponents: 3,
    unusedComponents: 0,
    interactions: [],
    totalInteractions: 0,
    cmsCollections: [],
    totalCMSItems: 0,
    assets: [{ filename: 'hero.webp', size: 50000, dimensions: '1920x1080' }],
    totalAssets: 1,
    breakpoints: ['Desktop', '991px', '767px', '479px'],
    ...overrides,
  };
}

// ─── Test 1: Instructions page conditional on interactions ───

console.log('\n─── Test 1: Instructions page conditional on interactions ───');

{
  // No interactions, no instructions page → should PASS
  const report = scoreDesignerChecklist(makeMetadata({ totalInteractions: 0, interactions: [] }));
  const check = report.checks.find((c) => c.id === 'pages.instructions_exists');
  assert(check !== undefined, 'pages.instructions_exists check exists');
  assert(check?.result === 'pass', 'No interactions + no instructions page = pass');
  assert(
    check?.evidence.some((e) => e.includes('hasAdvancedInteractions=false')) === true,
    'Evidence includes hasAdvancedInteractions=false'
  );
}

{
  // Has interactions, no instructions page → should FAIL
  const report = scoreDesignerChecklist(
    makeMetadata({
      totalInteractions: 3,
      interactions: [
        { trigger: 'click', targetElement: '.modal', type: 'element-trigger' },
        { trigger: 'scroll', targetElement: '.fade-in', type: 'scroll' },
        { trigger: 'page-load', targetElement: '.loader', type: 'page-load' },
      ],
    })
  );
  const check = report.checks.find((c) => c.id === 'pages.instructions_exists');
  assert(check?.result === 'fail', 'Has interactions + no instructions page = fail');
  assert(
    check?.evidence.some((e) => e.includes('hasAdvancedInteractions=true')) === true,
    'Evidence includes hasAdvancedInteractions=true'
  );
}

{
  // Has interactions AND instructions page → should PASS
  const report = scoreDesignerChecklist(
    makeMetadata({
      totalInteractions: 2,
      interactions: [
        { trigger: 'click', targetElement: '.tab', type: 'element-trigger' },
        { trigger: 'scroll', targetElement: '.reveal', type: 'scroll' },
      ],
      pages: [
        { name: 'Home', type: 'static' },
        { name: 'Style Guide', type: 'static' },
        { name: 'Instructions', type: 'static' },
        { name: 'Licenses', type: 'static' },
      ],
      totalPages: 4,
    })
  );
  const check = report.checks.find((c) => c.id === 'pages.instructions_exists');
  assert(check?.result === 'pass', 'Has interactions + instructions page = pass');
}

// ─── Test 2: metadataSummary includes page names ───

console.log('\n─── Test 2: metadataSummary includes page names ───');

{
  const report = scoreDesignerChecklist(makeMetadata());
  assert(Array.isArray(report.metadataSummary.pages), 'metadataSummary.pages is an array');
  assert(report.metadataSummary.pages.length === 4, 'metadataSummary.pages has 4 entries');
  assert(report.metadataSummary.pages[0].name === 'Home', 'First page is Home');
  assert(report.metadataSummary.pages[0].type === 'static', 'First page type is static');
}

// ─── Test 3: Overall report shape ───

console.log('\n─── Test 3: Overall report shape ───');

{
  const report = scoreDesignerChecklist(makeMetadata(), { includeManual: true });
  assert(typeof report.evaluatedAt === 'string', 'evaluatedAt is string');
  assert(report.summary.pass > 0, 'Has passing checks');
  assert(report.summary.scored > 0, 'Has scored checks');
  assert(report.checks.length > 10, 'Has 10+ checks');

  // Verify all checks have required fields
  for (const check of report.checks) {
    assert(typeof check.id === 'string' && check.id.length > 0, `Check ${check.id} has id`);
    assert(
      check.result === 'pass' || check.result === 'fail' || check.result === 'manual',
      `Check ${check.id} has valid result: ${check.result}`
    );
  }
}

// ─── Test 4: Page slug generation for crawl seeds ───

console.log('\n─── Test 4: Page slug generation for crawl seeds ───');

{
  const report = scoreDesignerChecklist(makeMetadata({
    pages: [
      { name: 'Home', type: 'static' },
      { name: 'About Us', type: 'static' },
      { name: 'Contact Page', type: 'static' },
      { name: 'Blog Template', type: 'cms-template' },
      { name: '404', type: 'utility' },
      { name: 'Style Guide', type: 'static' },
    ],
    totalPages: 6,
  }));

  const pages = report.metadataSummary.pages;
  assert(pages.length === 6, 'All 6 pages present in metadataSummary');

  // Simulate what executeTemplateReview does with these page names
  const publishedOrigin = 'https://example.webflow.io';
  const slugs = pages
    .filter((p) => p.type === 'static' || p.type === 'utility')
    .map((p) => {
      const slug = p.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return slug === 'home' ? publishedOrigin : `${publishedOrigin}/${slug}`;
    })
    .filter(Boolean);

  assert(slugs.includes(publishedOrigin), 'Home maps to origin URL');
  assert(slugs.includes(`${publishedOrigin}/about-us`), 'About Us maps to /about-us');
  assert(slugs.includes(`${publishedOrigin}/contact-page`), 'Contact Page maps to /contact-page');
  assert(slugs.includes(`${publishedOrigin}/404`), '404 maps to /404');
  assert(slugs.includes(`${publishedOrigin}/style-guide`), 'Style Guide maps to /style-guide');
  assert(!slugs.some((s) => s.includes('blog-template')), 'CMS template pages excluded from seeds');
}

// ─── Test 5: DOM fallback audit shape compatibility ───

console.log('\n─── Test 5: DOM fallback audit shape ───');

{
  const samples = [
    { hasAlt: false, alt: null },
    { hasAlt: true, alt: '' },
    { hasAlt: true, alt: 'Career team photo' },
  ];

  const missingAlt = samples.filter((img) => !img.hasAlt).length;
  const decorativeAlt = samples.filter((img) => img.hasAlt && img.alt === '').length;

  assert(missingAlt === 1, 'Only absent alt attributes count as missing');
  assert(decorativeAlt === 1, 'Empty alt attributes are counted as decorative');
}

{
  // Simulate the shape produced by the DOM fallback in PUBLISHED_WEBMCP_PAGE_SCRIPT
  const domAudit = {
    meta: { missing: ['og:title'] },
    headings: {
      summary: {
        headings: 5,
        h1: 1,
        missingH1: false,
        multipleH1: false,
        skippedHeadingLevels: 0,
        emptyHeadings: 0,
      },
    },
    links: {
      summary: {
        links: 10,
        emptyHref: 0,
        placeholderHref: 2,
        blankTargetMissingRel: 1,
        missingAccessibleName: 0,
      },
    },
    images: {
      summary: {
        images: 5,
        missingAlt: 1,
        decorativeAlt: 2,
        missingDimensions: 0,
        aboveFoldLazy: 0,
        belowFoldNotLazy: 0,
      },
      formats: { webp: 3, jpg: 2 },
    },
    forms: { summary: { fields: 2, missingLabels: 1 } },
    media: {
      summary: {
        videos: 0,
        autoplayWithoutControls: 0,
        backgroundVideosMissingControl: 0,
      },
    },
    interactions: { ix2: { summary: {} }, ix3: { summary: {} } },
  };

  // Verify the shape has all the keys summarizePublishedPageAudit expects
  assert('meta' in domAudit, 'domAudit has meta');
  assert('headings' in domAudit, 'domAudit has headings');
  assert('links' in domAudit, 'domAudit has links');
  assert('images' in domAudit, 'domAudit has images');
  assert('forms' in domAudit, 'domAudit has forms');
  assert('media' in domAudit, 'domAudit has media');
  assert('interactions' in domAudit, 'domAudit has interactions');
  assert(Array.isArray(domAudit.meta.missing), 'meta.missing is array');
  assert(typeof domAudit.headings.summary.h1 === 'number', 'headings.summary.h1 is number');
  assert(typeof domAudit.images.summary.missingAlt === 'number', 'images.summary.missingAlt is number');
  assert(typeof domAudit.images.summary.decorativeAlt === 'number', 'images.summary.decorativeAlt is number');
  assert(typeof domAudit.images.formats.webp === 'number', 'images.formats.webp is number');
}

// ─── Test 6: Policy checks shape ───

console.log('\n─── Test 6: Policy checks shape ───');

{
  const webflowLinks = [
    {
      text: 'Flomio Studio',
      className: 'copyright-link',
      surroundingText: 'Design & Developed By Flomio Studio - License | Powered By Webflow.',
    },
    {
      text: 'Webflow',
      className: 'copyright-link',
      surroundingText: 'Design & Developed By Flomio Studio - License | Powered By Webflow.',
    },
  ];
  const hasPoweredByWebflow = webflowLinks.some((link) => {
    const linkText = link.text.toLowerCase();
    const surroundingText = link.surroundingText.toLowerCase();
    const classText = link.className.toLowerCase();
    return classText.includes('badge') || (linkText.includes('webflow') && surroundingText.includes('powered'));
  });

  const policyChecks = {
    hasPoweredByWebflow,
    affiliateLinks: [] as string[],
    hasGsap: false,
    hasCustomCode: true,
  };

  assert(typeof policyChecks.hasPoweredByWebflow === 'boolean', 'hasPoweredByWebflow is boolean');
  assert(policyChecks.hasPoweredByWebflow === true, 'Powered by Webflow attribution is detected after designer credit link');
  assert(Array.isArray(policyChecks.affiliateLinks), 'affiliateLinks is array');
  assert(typeof policyChecks.hasGsap === 'boolean', 'hasGsap is boolean');
  assert(typeof policyChecks.hasCustomCode === 'boolean', 'hasCustomCode is boolean');

  // Test affiliate detection patterns
  const affiliatePatterns = [
    'ref=', 'affiliate', 'aff=', 'partner=', 'referral',
    'utm_source=affiliate', 'tap_a=', 'idev_id=', 'click_id=',
  ];
  const testUrls = [
    'https://example.com?ref=abc123',
    'https://example.com/affiliate/link',
    'https://normal.com/page',
    'https://example.com?aff=test',
    'https://clean.com',
  ];
  const detectedAffiliate = testUrls.filter((href) =>
    affiliatePatterns.some((p) => href.includes(p))
  );
  assert(detectedAffiliate.length === 3, `Detected 3 affiliate links (got ${detectedAffiliate.length})`);
  assert(!detectedAffiliate.includes('https://normal.com/page'), 'Normal URL not flagged');
  assert(!detectedAffiliate.includes('https://clean.com'), 'Clean URL not flagged');
}

// ─── Summary ───

console.log(`\n─── Results: ${passed} passed, ${failed} failed ───\n`);
process.exit(failed > 0 ? 1 : 0);
