import assert from 'node:assert/strict';
import test from 'node:test';

import {
  summarizePublishedPageAudit,
  unifyRows,
} from '../src/template-review-published.ts';
import type {
  DesignerChecklistCheck,
  DesignerChecklistReport,
  PublishedSnippetCrawlResult,
  PublishedSnippetPageResult,
  UnifiedReviewRow,
} from '../src/types.ts';

const REQUIRED_DESIGNER_CHECK_IDS = [
  'components.nav_footer_cta',
  'components.title_case_naming',
  'variables.defined_reusable',
  'variables.title_case_naming',
  'variables.breakpoint_modes',
  'styles.unused_classes_cleaned',
  'styles.base_tag_selectors',
  'styles.combo_class_depth',
  'cms.collection_pages_present',
] as const;

function createDesignerCheck(id: string): DesignerChecklistCheck {
  return {
    id,
    section: 'Synthetic',
    requirement: id,
    result: 'pass',
    evidence: [`${id}=pass`],
  };
}

function createDesignerReport(): DesignerChecklistReport {
  return {
    evaluatedAt: '2026-04-07T00:00:00.000Z',
    source: 'provided-metadata',
    metadataSummary: {
      siteName: 'Helpbot',
      sitePlan: 'Template',
      totalPages: 2,
      totalComponents: 4,
      unusedComponents: 0,
      totalInteractions: 1,
      totalCMSCollections: 1,
      totalCMSItems: 3,
      totalAssets: 6,
      breakpoints: ['Desktop', 'Tablet'],
      pages: [
        { name: 'Home', type: 'static' },
        { name: 'License', type: 'utility' },
      ],
    },
    summary: {
      pass: REQUIRED_DESIGNER_CHECK_IDS.length,
      fail: 0,
      manual: 0,
      scored: REQUIRED_DESIGNER_CHECK_IDS.length,
      passRate: 1,
    },
    checks: REQUIRED_DESIGNER_CHECK_IDS.map((id) => createDesignerCheck(id)),
  };
}

function createIssueHeavyAudit() {
  return {
    meta: {
      missing: ['description'],
    },
    headings: {
      summary: {
        headings: 6,
        h1: 1,
        missingH1: false,
        multipleH1: false,
        skippedHeadingLevels: 1,
        emptyHeadings: 1,
      },
      skippedHeadingLevels: Array.from({ length: 6 }, (_, index) => ({
        selector: `h3.feature-${index}`,
        text: `Skipped ${index}`,
      })),
      emptyHeadings: [{ selector: 'h2.empty', text: '' }],
    },
    links: {
      summary: {
        links: 4,
        emptyHref: 1,
        placeholderHref: 1,
        blankTargetMissingRel: 1,
        missingAccessibleName: 1,
      },
      emptyHref: [{ selector: 'a.empty', href: '' }],
      placeholderHref: [{ selector: 'a.placeholder', href: '#' }],
      blankTargetMissingRel: [
        { selector: 'a.external', href: 'https://example.com', target: '_blank', rel: '' },
      ],
      missingAccessibleName: [{ selector: 'a.icon-only', href: '/cta' }],
    },
    images: {
      summary: {
        images: 7,
        missingAlt: 6,
        missingDimensions: 1,
        aboveFoldLazy: 1,
        belowFoldNotLazy: 1,
      },
      missingAlt: Array.from({ length: 6 }, (_, index) => ({
        selector: `img.hero-${index}`,
        src: `/img-${index}.jpg`,
        alt: '',
      })),
      missingDimensions: [{ selector: 'img.card', src: '/card.jpg' }],
      aboveFoldLazy: [{ selector: 'img.hero', loading: 'lazy' }],
      belowFoldNotLazy: [{ selector: 'img.footer', loading: 'eager' }],
      formats: { webp: 2, jpeg: 5 },
    },
    forms: {
      summary: {
        fields: 2,
        missingLabels: 1,
      },
      missingLabels: [
        { selector: 'input.email', fieldTag: 'input', fieldType: 'email', name: 'email' },
      ],
    },
    media: {
      summary: {
        videos: 1,
        autoplayWithoutControls: 1,
        backgroundVideosMissingControl: 1,
      },
      autoplayWithoutControls: [{ selector: 'video.hero', autoplay: true, controls: false }],
      backgroundVideosMissingControl: [
        { selector: 'video.bg', autoplay: true, muted: true, loop: true, controls: false },
      ],
    },
    interactions: {
      ix2: {
        summary: {
          events: 2,
          actionLists: 2,
          usedActionLists: 1,
          unusedActionLists: 1,
          missingTargets: 1,
          missingActionLists: 1,
        },
        unusedActionLists: [{ actionListId: 'ix2-unused-1' }],
        missingTargets: [{ target: '.missing-ix2-target' }],
        missingActionLists: [{ actionListId: 'ix2-missing-1' }],
      },
      ix3: {
        summary: {
          interactions: 1,
          timelines: 1,
          missingTimelines: 1,
          deletedInteractions: 1,
          missingTargetSelectors: 1,
        },
        missingTimelines: [{ timelineId: 'ix3-timeline-1' }],
        deletedInteractions: [{ interactionId: 'ix3-deleted-1' }],
        missingTargetSelectors: [{ selector: '.missing-ix3-target' }],
      },
    },
  };
}

function createCleanAudit() {
  return {
    meta: {
      missing: [],
    },
    headings: {
      summary: {
        headings: 3,
        h1: 1,
        missingH1: false,
        multipleH1: false,
        skippedHeadingLevels: 0,
        emptyHeadings: 0,
      },
    },
    links: {
      summary: {
        links: 3,
        emptyHref: 0,
        placeholderHref: 0,
        blankTargetMissingRel: 0,
        missingAccessibleName: 0,
      },
    },
    images: {
      summary: {
        images: 2,
        missingAlt: 0,
        missingDimensions: 0,
        aboveFoldLazy: 0,
        belowFoldNotLazy: 0,
      },
      formats: { webp: 2 },
    },
    forms: {
      summary: {
        fields: 1,
        missingLabels: 0,
      },
    },
    media: {
      summary: {
        videos: 0,
        autoplayWithoutControls: 0,
        backgroundVideosMissingControl: 0,
      },
    },
    interactions: {
      ix2: {
        summary: {
          events: 0,
          actionLists: 0,
          usedActionLists: 0,
          unusedActionLists: 0,
          missingTargets: 0,
          missingActionLists: 0,
        },
      },
      ix3: {
        summary: {
          interactions: 0,
          timelines: 0,
          missingTimelines: 0,
          deletedInteractions: 0,
          missingTargetSelectors: 0,
        },
      },
    },
  };
}

function findRow(rows: UnifiedReviewRow[], id: string): UnifiedReviewRow {
  const row = rows.find((candidate) => candidate.id === id);
  assert.ok(row, `Expected row ${id} to exist`);
  return row;
}

function createPublishedResult(): PublishedSnippetCrawlResult {
  const homeSummary = summarizePublishedPageAudit(createIssueHeavyAudit());
  const licenseSummary = summarizePublishedPageAudit(createCleanAudit());

  const pages: PublishedSnippetPageResult[] = [
    {
      url: 'https://demo.webflow.io/',
      depth: 0,
      title: 'Helpbot - Webflow HTML website template',
      statusCode: 200,
      hasSnippet: false,
      hasInstalledSnippet: false,
      runtimeInjectionSucceeded: true,
      runtimeInjectionError: null,
      auditSource: 'runtime-injected',
      snippetVersion: 'wf-review@2.1.0',
      reviewApiVersion: 'wf-review@2.1.0',
      installedSnippetVersion: null,
      hasRequiredLicenseText: null,
      error: null,
      summary: homeSummary,
      policyChecks: {
        hasPoweredByWebflow: true,
        affiliateLinks: [],
        hasGsap: false,
        hasCustomCode: false,
      },
    },
    {
      url: 'https://demo.webflow.io/license',
      depth: 1,
      title: 'License',
      statusCode: 404,
      hasSnippet: true,
      hasInstalledSnippet: true,
      runtimeInjectionSucceeded: false,
      runtimeInjectionError: 'Eval blocked by page policy',
      auditSource: 'installed-fallback',
      snippetVersion: 'wf-review@0.1.5',
      reviewApiVersion: 'wf-review@0.1.5',
      installedSnippetVersion: 'wf-review@0.1.5',
      hasRequiredLicenseText: true,
      error: null,
      summary: licenseSummary,
      policyChecks: {
        hasPoweredByWebflow: true,
        affiliateLinks: [],
        hasGsap: false,
        hasCustomCode: false,
      },
    },
  ];

  return {
    startUrl: 'https://demo.webflow.io/',
    origin: 'https://demo.webflow.io',
    maxPages: 10,
    maxDepth: 1,
    visitedPages: pages.length,
    auditedPages: pages.length,
    pagesWithSnippet: 1,
    pagesWithInstalledSnippet: 1,
    pagesWithRuntimeInjection: 1,
    pagesWithInstalledFallback: 1,
    runtimeInjectionFailures: 1,
    failingPages: 1,
    snippetVersion: 'wf-review@2.1.0',
    reviewApiVersion: 'wf-review@2.1.0',
    snippetTools: ['audit_webflow_way', 'audit_404', 'get_sitemap_urls'],
    reviewApiTools: ['audit_webflow_way', 'audit_404', 'get_sitemap_urls'],
    sitemapStatus: { ok: true, count: 2 },
    audit404: {
      ok: true,
      status: 404,
      title: 'Not Found',
      navCount: 1,
      linkCount: 2,
      h1Count: 1,
    },
    issueCounts: {
      metaMissing: 1,
      missingH1: 0,
      multipleH1: 0,
      skippedHeadingLevels: 1,
      imagesMissingAlt: 1,
      linksMissingRel: 1,
      linksMissingAccessibleName: 1,
      linksEmptyHref: 1,
      linksPlaceholderHref: 1,
      imagesMissingDimensions: 1,
      imagesAboveFoldLazy: 1,
      imagesBelowFoldNotLazy: 1,
      formsMissingLabels: 1,
      autoplayWithoutControls: 1,
      backgroundVideosMissingControl: 1,
    },
    policyChecks: {
      hasPoweredByWebflow: true,
      affiliateLinkCount: 0,
      affiliateLinks: [],
      hasGsap: false,
      hasCustomCode: false,
    },
    pages,
  };
}

test('summarizePublishedPageAudit preserves capped issue examples from the injected snippet', () => {
  const summary = summarizePublishedPageAudit(createIssueHeavyAudit());

  assert.equal(summary.failCount > 0, true);
  assert.ok(summary.failReasons.includes('images_below_fold_not_lazy:1'));
  assert.deepEqual(summary.metaMissing, ['description']);

  assert.equal(summary.headings?.examples.skippedHeadingLevels.length, 5);
  assert.equal(summary.images?.examples.missingAlt.length, 5);
  assert.equal(summary.images?.examples.missingAlt[0]?.selector, 'img.hero-0');
  assert.equal(summary.links?.examples.missingAccessibleName[0]?.selector, 'a.icon-only');
  assert.equal(summary.forms?.examples.missingLabels[0]?.fieldType, 'email');
  assert.equal(summary.media?.examples.autoplayWithoutControls[0]?.selector, 'video.hero');
  assert.equal(summary.ix2?.examples.missingActionLists[0]?.actionListId, 'ix2-missing-1');
  assert.equal(summary.ix3?.examples.missingTimelines[0]?.timelineId, 'ix3-timeline-1');
});

test('unifyRows promotes snippet health and preserved published examples into reviewer rows', () => {
  const rows = unifyRows(createDesignerReport(), createPublishedResult(), true);

  const snippetRow = findRow(rows, 'webflow_audit.snippet_operational');
  assert.equal(snippetRow.status, 'partial');
  assert.ok(snippetRow.evidence.includes('runtimeInjectionPages=1/2'));
  assert.ok(snippetRow.evidence.includes('installedFallbackPages=1'));
  assert.ok(snippetRow.evidence.includes('installedSnippetPages=1/2'));
  assert.ok(snippetRow.evidence.includes('reviewApiAuditPages=2'));
  assert.ok(snippetRow.evidence.includes('domFallbackAuditPages=0'));
  assert.ok(snippetRow.evidence.includes('runtimeInjectionFailures=1'));
  assert.ok(snippetRow.evidence.includes('reviewApiVersion=wf-review@2.1.0'));
  assert.ok(
    snippetRow.evidence.includes('reviewApiTools=audit_webflow_way,audit_404,get_sitemap_urls'),
  );
  assert.ok(snippetRow.evidence.includes('missingRequiredTools=none'));
  assert.ok(
    snippetRow.evidence.some(
      (line) =>
        line.includes('runtimeInjectionError=https://demo.webflow.io/license') &&
        line.includes('Eval blocked by page policy'),
    ),
  );

  const linkRow = findRow(rows, 'webflow_audit.link_hygiene');
  assert.equal(linkRow.status, 'fail');
  assert.ok(linkRow.evidence.includes('pagesWithMissingAccessibleName=1'));
  assert.ok(
    linkRow.evidence.some(
      (line) =>
        line.includes('missingAccessibleNameExample=https://demo.webflow.io/') &&
        line.includes('selector=a.icon-only'),
    ),
  );

  const formRow = findRow(rows, 'webflow_audit.form_labels');
  assert.equal(formRow.status, 'fail');
  assert.ok(formRow.evidence.includes('pagesWithMissingFieldLabels=1'));
  assert.ok(
    formRow.evidence.some(
      (line) =>
        line.includes('missingFieldLabelExample=https://demo.webflow.io/') &&
        line.includes('fieldTag=input'),
    ),
  );

  const imageLoadingRow = findRow(rows, 'pages.image_loading_strategy');
  assert.equal(imageLoadingRow.status, 'fail');
  assert.ok(imageLoadingRow.evidence.includes('pagesWithBelowFoldNotLazy=1'));
  assert.ok(
    imageLoadingRow.evidence.some(
      (line) =>
        line.includes('belowFoldNotLazyExample=https://demo.webflow.io/') &&
        line.includes('selector=img.footer'),
    ),
  );

  const interactionRow = findRow(rows, 'interactions.unused_cleaned');
  assert.equal(interactionRow.status, 'fail');
  assert.ok(interactionRow.evidence.includes('pagesWithIx2MissingActionLists=1'));
  assert.ok(interactionRow.evidence.includes('pagesWithIx3DeletedInteractions=1'));
  assert.ok(
    interactionRow.evidence.some(
      (line) =>
        line.includes('ix2MissingActionListExample=https://demo.webflow.io/') &&
        line.includes('actionListId=ix2-missing-1'),
    ),
  );
  assert.ok(
    interactionRow.evidence.some(
      (line) =>
        line.includes('ix3DeletedInteractionExample=https://demo.webflow.io/') &&
        line.includes('interactionId=ix3-deleted-1'),
    ),
  );

  const httpStatusRow = findRow(rows, 'pages.http_status_ok');
  assert.equal(httpStatusRow.status, 'fail');
  assert.ok(httpStatusRow.evidence.includes('pagesWithHttpErrors=1'));
  assert.ok(httpStatusRow.evidence.includes('pagesWithUnknownStatus=0'));
  assert.ok(
    httpStatusRow.evidence.some(
      (line) =>
        line.includes('pageStatus=https://demo.webflow.io/license') &&
        line.includes('status=404') &&
        line.includes('auditSource=installed-fallback'),
    ),
  );
});

test('unifyRows treats runtime injection as primary even when no installed snippet is present', () => {
  const published = createPublishedResult();
  published.pages = published.pages.map((page) => ({
    ...page,
    hasSnippet: false,
    hasInstalledSnippet: false,
    runtimeInjectionSucceeded: true,
    runtimeInjectionError: null,
    auditSource: 'runtime-injected',
    snippetVersion: 'wf-review@2.1.0',
    reviewApiVersion: 'wf-review@2.1.0',
    installedSnippetVersion: null,
  }));
  published.pagesWithSnippet = 0;
  published.pagesWithInstalledSnippet = 0;
  published.pagesWithRuntimeInjection = published.pages.length;
  published.pagesWithInstalledFallback = 0;
  published.runtimeInjectionFailures = 0;

  const rows = unifyRows(createDesignerReport(), published, true);
  const snippetRow = findRow(rows, 'webflow_audit.snippet_operational');

  assert.equal(snippetRow.status, 'pass');
  assert.ok(snippetRow.evidence.includes('runtimeInjectionPages=2/2'));
  assert.ok(snippetRow.evidence.includes('installedSnippetPages=0/2'));
  assert.ok(snippetRow.evidence.includes('installedFallbackPages=0'));
});

test('unifyRows downgrades custom 404 to manual when the 404 audit is unavailable', () => {
  const published = createPublishedResult();
  published.audit404 = {
    ok: false,
    error: '404 audit was not executed',
  };
  published.pages = [
    ...published.pages,
    {
      url: 'https://demo.webflow.io/404',
      depth: 1,
      title: '404 - Helpbot',
      statusCode: 200,
      hasSnippet: false,
      auditSource: 'dom-fallback',
      snippetVersion: null,
      hasRequiredLicenseText: null,
      error: null,
      summary: summarizePublishedPageAudit(createCleanAudit()),
      policyChecks: {
        hasPoweredByWebflow: true,
        affiliateLinks: [],
        hasGsap: false,
        hasCustomCode: false,
      },
    },
  ];

  const rows = unifyRows(createDesignerReport(), published, true);
  const custom404Row = findRow(rows, 'pages.custom_404');

  assert.equal(custom404Row.status, 'manual');
  assert.ok(custom404Row.evidence.includes('audit404Available=false'));
  assert.ok(custom404Row.evidence.includes('error=404 audit was not executed'));
  assert.ok(custom404Row.evidence.includes('crawled404Page=https://demo.webflow.io/404'));
  assert.ok(custom404Row.evidence.includes('crawled404Title=404 - Helpbot'));
});
