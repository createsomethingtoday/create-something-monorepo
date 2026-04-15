import { describe, expect, it } from 'vitest';

import {
  buildTemplateDetailsHtml,
  buildTemplateMetadataDescription,
  normalizeTemplatePreviewUrl,
  parseTemplateDraftFields,
  validateTemplateNameSyntax
} from './template';

describe('validateTemplateNameSyntax', () => {
  it('accepts names that satisfy the intake rules', () => {
    const result = validateTemplateNameSyntax('Nova Studio');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects lowercase starts, emoji, and blocked category terms', () => {
    const lowercase = validateTemplateNameSyntax('nova Studio');
    expect(lowercase.valid).toBe(false);
    expect(lowercase.errors).toContain('The first word must start with a capital letter.');

    const emoji = validateTemplateNameSyntax('Nova Studio ✨');
    expect(emoji.valid).toBe(false);
    expect(emoji.errors).toContain('Template names cannot contain emoji.');

    const category = validateTemplateNameSyntax('Startup Nova');
    expect(category.valid).toBe(false);
    expect(category.errors).toContain('Template names cannot contain category or tag labels.');
  });
});

describe('normalizeTemplatePreviewUrl', () => {
  it('normalizes valid preview URLs', () => {
    expect(
      normalizeTemplatePreviewUrl('https://preview.webflow.com/preview/example-site?pageId=123')
    ).toBe('https://preview.webflow.com/preview/example-site?pageId=123');
  });

  it('rejects non-preview URLs', () => {
    expect(() => normalizeTemplatePreviewUrl('https://example.com')).toThrow(
      'Preview URL must contain https://preview.webflow.com/preview/.'
    );
  });
});

describe('template draft field helpers', () => {
  it('round-trips the stored metadata fields for draft editing', () => {
    const description = buildTemplateMetadataDescription({
      category: 'Technology',
      tags: ['Portfolio', 'Agency'],
      siteTypes: ['cms', 'ecommerce'],
      featureFlags: ['gsap', 'localization'],
      notes: 'Needs QA follow-up'
    });
    const descriptionLongHtml = buildTemplateDetailsHtml({
      category: 'Technology',
      tags: ['Portfolio', 'Agency'],
      styleTags: ['Minimal', 'Editorial'],
      siteTypes: ['cms', 'ecommerce'],
      featureFlags: ['gsap', 'localization'],
      longDescription: 'First paragraph.\n\nSecond paragraph.',
      notes: 'Needs QA follow-up',
      publishedUrl: 'https://nova-site.webflow.io'
    });

    expect(
      parseTemplateDraftFields({
        category: '',
        description,
        descriptionLongHtml,
        priceString: 'Paid'
      })
    ).toEqual({
      category: 'Technology',
      tags: ['Portfolio', 'Agency'],
      styleTags: ['Minimal', 'Editorial'],
      siteTypes: ['cms', 'ecommerce'],
      featureFlags: ['gsap', 'localization'],
      longDescription: 'First paragraph.\n\nSecond paragraph.',
      notes: 'Needs QA follow-up',
      priceModel: 'Paid'
    });
  });
});
