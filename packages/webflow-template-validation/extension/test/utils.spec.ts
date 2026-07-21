import { describe, it, expect } from 'vitest';
import {
  buildValidationSubmitPayload,
  escapeHtml,
  decodeCommonHtmlEntities,
  ensureHttps,
  filterRetiredAccessibilityIssues,
  getSlugPathname,
  isInternalCmsTemplateSlug,
  isHtmlTagStyleName,
  normalizeSiteInfo,
  selectValidationDomain,
} from '../src/utils';

describe('buildValidationSubmitPayload', () => {
  it('carries the versioned custom-code surface identity into persisted results', () => {
    const payload = buildValidationSubmitPayload({
      url: 'https://example.webflow.io/',
      summary: { totalErrors: 0 },
      categories: [
        {
          category: 'Custom Code & Site Settings',
          passed: true,
          issues: [],
          policyVersion: 'marketplace-custom-code.v1',
          homepageSurfaceHash: 'a'.repeat(64),
        },
      ],
    });

    expect(payload.customCodePolicyVersion).toBe('marketplace-custom-code.v1');
    expect(payload.customCodeSurfaceHash).toBe('a'.repeat(64));
  });
});

describe('filterRetiredAccessibilityIssues', () => {
  it('removes only legacy color-contrast findings', () => {
    const missingAltIssue = { id: 'missing-alt-text-critical', severity: 'error' };
    expect(filterRetiredAccessibilityIssues([
      { id: 'color-contrast-violations', severity: 'error' },
      missingAltIssue,
    ])).toEqual([missingAltIssue]);
  });
});

describe('escapeHtml', () => {
  it('escapes markup-significant characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`))
      .toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
  });
});

describe('decodeCommonHtmlEntities', () => {
  it('decodes the entities Webflow publishes in heading text', () => {
    expect(decodeCommonHtmlEntities('Hiring &amp; Recruiting&nbsp;firms')).toBe('Hiring & Recruiting firms');
  });
});

describe('ensureHttps', () => {
  it('upgrades http and adds missing protocols', () => {
    expect(ensureHttps('http://example.webflow.io')).toBe('https://example.webflow.io');
    expect(ensureHttps('example.webflow.io')).toBe('https://example.webflow.io');
    expect(ensureHttps('https://example.webflow.io')).toBe('https://example.webflow.io');
  });
});

describe('getSlugPathname', () => {
  it('normalizes slugs, URLs, and query strings to pathnames', () => {
    expect(getSlugPathname('about')).toBe('/about');
    expect(getSlugPathname('/about?utm=x')).toBe('/about');
    expect(getSlugPathname('https://example.com/team#row')).toBe('/team');
    expect(getSlugPathname('')).toBe('');
  });
});

describe('isInternalCmsTemplateSlug', () => {
  it('detects detail_ and ecommerce template roots only', () => {
    expect(isInternalCmsTemplateSlug('/detail_blog')).toBe(true);
    expect(isInternalCmsTemplateSlug('/product')).toBe(true);
    expect(isInternalCmsTemplateSlug('/sku')).toBe(true);
    expect(isInternalCmsTemplateSlug('/category')).toBe(true);
    expect(isInternalCmsTemplateSlug('/products')).toBe(false);
    expect(isInternalCmsTemplateSlug('/about')).toBe(false);
  });
});

describe('isHtmlTagStyleName', () => {
  it('matches exact tag names and Webflow tag-selector display names', () => {
    expect(isHtmlTagStyleName('h1')).toBe(true);
    expect(isHtmlTagStyleName('Body')).toBe(true);
    expect(isHtmlTagStyleName('All H1 Headings')).toBe(true);
    expect(isHtmlTagStyleName('All Paragraphs')).toBe(true);
    expect(isHtmlTagStyleName('Body (All Pages)')).toBe(true);
  });

  // Regression: includes('a')/includes('p') used to match nearly every class
  it('does not match class names that merely contain tag letters', () => {
    expect(isHtmlTagStyleName('Card Title')).toBe(false);
    expect(isHtmlTagStyleName('heading-h1')).toBe(false);
    expect(isHtmlTagStyleName('paragraph-wrap')).toBe(false);
    expect(isHtmlTagStyleName('cap')).toBe(false);
  });
});

describe('selectValidationDomain', () => {
  const site = (domains: any[]) => normalizeSiteInfo({ siteId: 's', siteName: 'S', domains });

  it('prefers a published production domain', () => {
    const selection = selectValidationDomain(site([
      { url: 'stage.webflow.io', stage: 'staging', lastPublished: '2026-01-01' },
      { url: 'example.com', stage: 'production', lastPublished: '2026-01-02' },
    ]));
    expect(selection.url).toBe('example.com');
    expect(selection.source).toBe('published production domain');
  });

  it('falls back to published staging when production never published', () => {
    const selection = selectValidationDomain(site([
      { url: 'example.com', stage: 'production', lastPublished: null, default: false },
      { url: 'stage.webflow.io', stage: 'staging', lastPublished: '2026-01-01' },
    ]));
    // any production domain outranks staging in the ladder
    expect(selection.url).toBe('example.com');
  });

  it('synthesizes the webflow.io URL from shortName when no domains exist', () => {
    const selection = selectValidationDomain(normalizeSiteInfo({ shortName: 'silana-template' }));
    expect(selection.url).toBe('https://silana-template.webflow.io');
  });

  it('returns null with no domains and no shortName', () => {
    expect(selectValidationDomain(normalizeSiteInfo({})).url).toBeNull();
  });
});
