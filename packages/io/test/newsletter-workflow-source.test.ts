import { describe, expect, it } from 'vitest';
import { getNewsletterSource } from '../src/lib/server/newsletter-workflow-sources';

describe('checked-in newsletter candidate import', () => {
  it('imports the actual reviewed HTML and text with author and evidence attribution', () => {
    const candidate = getNewsletterSource('2026-09-08-test-the-checker');
    expect(candidate.author).toBe('CREATE SOMETHING');
    expect(candidate.owner).toBe('Micah Johnson');
    expect(candidate.html).toContain('{{unsubscribe_url}}');
    expect(candidate.text).toContain('{{unsubscribe_url}}');
    expect(candidate.html).toContain('utm_campaign=2026-09-08-test-the-checker');
    expect(candidate.html).not.toContain('REVIEW ONLY');
    expect(candidate.source_refs).toContain('packages/io/content/newsletters/2026-09-08-test-the-checker/candidate-receipt-2026-11-03.md');
  });
  it('cannot overwrite a historical delivered edition through candidate import', () => {
    expect(() => getNewsletterSource('2026-09-01-the-interface-is-becoming-executable')).toThrow('no current import candidate');
  });
});
