import { describe, it, expect } from 'vitest';
import { buildReportMarkdown } from '../src/report';

describe('buildReportMarkdown', () => {
  it('produces a complete support-ready report', () => {
    const markdown = buildReportMarkdown({
      url: 'https://silana-template.webflow.io/',
      generatedAt: '2026-06-13T00:00:00.000Z',
      correlationId: 'corr_abc123',
      outcomeBadge: 'Blocked',
      outcomeTitle: 'Blocked by validation errors',
      errors: 2,
      warnings: 1,
      infos: 0,
      domainLastPublished: '2026-06-12T20:00:00.000Z',
      extensionVersion: '1.2.0',
      workerVersion: '2.3.0',
      categories: [
        {
          category: 'Content & Accessibility',
          issues: [
            {
              severity: 'error',
              message: 'Heading hierarchy errors found on 2 page(s)',
              details: { location: 'Homepage', howToFix: 'Use sequential heading levels' }
            }
          ]
        },
        { category: 'Components', issues: [] }
      ]
    });

    expect(markdown).toContain('# Webflow Way Validator Report');
    expect(markdown).toContain('- Site: https://silana-template.webflow.io/');
    expect(markdown).toContain('- Correlation ID: corr_abc123');
    expect(markdown).toContain('- Validated publish from: 2026-06-12T20:00:00.000Z');
    expect(markdown).toContain('- Validator: extension v1.2.0 · worker v2.3.0');
    expect(markdown).toContain('- Outcome: Blocked — Blocked by validation errors');
    expect(markdown).toContain('- Errors: 2 · Warnings: 1 · Info: 0');
    expect(markdown).toContain('## Content & Accessibility — 1 issue(s)');
    expect(markdown).toContain('- [ERROR] Heading hierarchy errors found on 2 page(s)');
    expect(markdown).toContain('  - Location: Homepage');
    expect(markdown).toContain('  - Fix: Use sequential heading levels');
    expect(markdown).toContain('## Components — passed');
  });

  it('omits optional lines when data is missing', () => {
    const markdown = buildReportMarkdown({
      generatedAt: '2026-06-13T00:00:00.000Z',
      errors: 0,
      warnings: 0,
      infos: 0,
      categories: []
    });
    expect(markdown).toContain('- Site: Unknown');
    expect(markdown).not.toContain('Correlation ID');
    expect(markdown).not.toContain('Validated publish from');
    expect(markdown).not.toContain('Outcome:');
  });
});
