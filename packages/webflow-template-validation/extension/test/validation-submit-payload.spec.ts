import { describe, expect, it } from 'vitest';
import { buildValidationSubmitIssue } from '../src/validation-submit-payload';

describe('buildValidationSubmitIssue', () => {
  it('forwards the bounded diagnostics accepted by the Worker', () => {
    expect(buildValidationSubmitIssue({
      id: 'seo.missing-title',
      severity: 'error',
      message: '1 page is missing an SEO title.',
      howToFix: 'Set an SEO title.',
      location: 'Pages panel',
      details: {
        pages: ['SKUs Template (/sku)'],
        duplicates: [['Home (/)', 'About (/about)']],
        bridgeToken: 'must-not-forward',
      },
    })).toEqual({
      id: 'seo.missing-title',
      severity: 'error',
      message: '1 page is missing an SEO title.',
      howToFix: 'Set an SEO title.',
      location: 'Pages panel',
      details: {
        pages: ['SKUs Template (/sku)'],
        duplicates: [['Home (/)', 'About (/about)']],
      },
    });
  });

  it('normalizes nested extension fixes and locations before whitelisting details', () => {
    expect(buildValidationSubmitIssue({
      id: 'canvas.missing-alt',
      severity: 'error',
      message: 'An image is missing alt text.',
      details: {
        howToFix: 'Add alt text in Element settings.',
        location: 'Hero image',
      },
    })).toEqual({
      id: 'canvas.missing-alt',
      severity: 'error',
      message: 'An image is missing alt text.',
      howToFix: 'Add alt text in Element settings.',
      location: 'Hero image',
      details: undefined,
    });
  });
});
