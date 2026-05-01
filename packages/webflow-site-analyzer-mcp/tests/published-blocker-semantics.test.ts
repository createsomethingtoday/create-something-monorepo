import assert from 'node:assert/strict';
import test from 'node:test';

import { __test } from '../src/index.js';

function designerReport(breakpointResult: 'pass' | 'fail' = 'fail') {
  const checks = [
    ['components.nav_footer_cta', 'pass'],
    ['components.title_case_naming', 'pass'],
    ['variables.defined_reusable', 'manual'],
    ['variables.title_case_naming', 'manual'],
    ['variables.breakpoint_modes', breakpointResult],
    ['styles.unused_classes_cleaned', 'manual'],
    ['styles.base_tag_selectors', 'pass'],
    ['styles.combo_class_depth', 'manual'],
    ['cms.collection_pages_present', 'pass']
  ].map(([id, result]) => ({
    id,
    result,
    evidence: [`${id}=${result}`]
  }));

  return {
    checks,
    metadataSummary: {
      siteName: 'Bergamo',
      pages: [{ name: 'Home' }, { name: 'Instructions' }, { name: 'Licenses' }],
      totalCMSCollections: 0
    }
  } as any;
}

function auditedPage(path: string, formFields = 0) {
  return {
    url: `https://az-bergamo.webflow.io${path}`,
    title: path === '/' ? 'Bergamo - Webflow HTML website template' : 'Bergamo',
    hasSnippet: true,
    hasRequiredLicenseText: path.includes('licenses') ? true : null,
    summary: {
      imageFormats: { avif: 1 },
      metaMissing: [],
      headings: {
        h1: 1,
        missingH1: false,
        multipleH1: false,
        skippedHeadingLevels: 0
      },
      images: {
        missingAlt: 0,
        missingDimensions: 1,
        aboveFoldLazy: 1,
        belowFoldNotLazy: 0
      },
      links: {
        links: 3,
        emptyHref: 0,
        placeholderHref: 0,
        blankTargetMissingRel: 0,
        missingAccessibleName: 0
      },
      forms: {
        fields: formFields,
        missingLabels: 0
      },
      media: {
        videos: 0,
        autoplayWithoutControls: 0,
        backgroundVideosMissingControl: 0
      },
      ix2: {
        unusedActionLists: 0,
        missingTargets: 0
      },
      ix3: {
        missingTargetSelectors: 0
      },
      transitions: {
        totalInteractive: 4,
        withTransition: 4,
        withoutTransition: 0,
        ratio: 1
      },
      contrast: {
        checked: 1,
        pass: 1,
        fail: 0,
        passRate: 1,
        failures: []
      }
    },
    siteSettings: {
      hasCustomFavicon: true,
      hasCustomFonts: false,
      customFontSources: [],
      detectedApps: []
    },
    contentQuality: {
      hasLoremIpsum: false,
      hasPlaceholderText: false
    }
  };
}

function publishedCrawl() {
  const pages = [auditedPage('/'), auditedPage('/template/licenses'), auditedPage('/contact', 3)];
  return {
    startUrl: 'https://az-bergamo.webflow.io/',
    origin: 'https://az-bergamo.webflow.io',
    auditedPages: pages.length,
    visitedPages: pages.length,
    pagesWithSnippet: pages.length,
    skippedUrls: [],
    issueCounts: {
      missingH1: 0,
      multipleH1: 0,
      skippedHeadingLevels: 0,
      imagesMissingAlt: 0,
      linksMissingRel: 0,
      linksMissingAccessibleName: 0,
      linksEmptyHref: 0,
      linksPlaceholderHref: 0,
      imagesMissingDimensions: pages.length,
      imagesAboveFoldLazy: pages.length,
      imagesBelowFoldNotLazy: 0,
      formsMissingLabels: 0,
      autoplayWithoutControls: 0,
      backgroundVideosMissingControl: 0,
      metaMissing: 0
    },
    audit404: {
      ok: true,
      status: 404,
      navCount: 1,
      linkCount: 4
    },
    policyChecks: {
      hasPoweredByWebflow: true,
      affiliateLinkCount: 0,
      affiliateLinks: [],
      hasGsap: false,
      hasCustomCode: false
    },
    siteSettings: {
      hasCustomFavicon: true,
      hasCustomFonts: false,
      customFontSources: [],
      detectedApps: []
    },
    pages
  } as any;
}

function row(rows: Array<{ id: string; status: string; evidence: string[] }>, id: string) {
  const found = rows.find((item) => item.id === id);
  assert.ok(found, `Expected ${id} row`);
  return found;
}

test('published-only reviews produce a manual Designer placeholder report', () => {
  const designer = __test.createPublishedOnlyDesignerReport('https://az-bergamo.webflow.io', {
    discoveredUrls: ['https://az-bergamo.webflow.io/about'],
    errors: []
  } as any);

  assert.equal(designer.metadataSummary.siteName, 'az-bergamo.webflow.io');
  assert.deepEqual(
    designer.metadataSummary.pages.map((page: { name: string }) => page.name),
    ['Home', 'About']
  );
  assert.deepEqual(designer.checks, []);
});

test('published-site output conventions are not promoted to hard blockers', () => {
  const rows = __test.unifyRows(designerReport(), publishedCrawl(), true);

  assert.equal(row(rows, 'forms.labels_present').status, 'pass');
  assert.equal(row(rows, 'pages.image_loading_strategy').status, 'partial');
  assert.equal(row(rows, 'pages.image_dimensions').status, 'partial');
  assert.equal(row(rows, 'responsive.multi_breakpoint_check').status, 'manual');
});
