import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  getPublishedNewsletterEditions,
  parseNewsletterEdition
} from '../src/lib/newsletter/archive';

const SOURCE = `---
title: "The interface is becoming executable"
preview: "Pages declare actions, packages carry capabilities, and proof closes the loop."
delivery_target: "2026-09-01T09:00:00-05:00"
web_status: "published"
web_publish_at: "2026-09-02T09:00:00-05:00"
public_end_before: "## Email edition"
hero: "/images/newsletters/the-interface-is-becoming-executable/hero.png"
---

# The interface is becoming executable

Public field note.

## Email edition

Internal assembly instructions.
`;

describe('newsletter archive publication contract', () => {
  it('publishes the reader edition at its explicit web release time', () => {
    const edition = parseNewsletterEdition(
      '2026-09-01-the-interface-is-becoming-executable',
      SOURCE
    );

    expect(getPublishedNewsletterEditions([edition], new Date('2026-09-02T13:59:59.000Z'))).toEqual(
      []
    );
    expect(
      getPublishedNewsletterEditions([edition], new Date('2026-09-02T14:00:00.000Z'))
    ).toHaveLength(1);
  });

  it('keeps email assembly and delivery notes out of the public article', () => {
    const edition = parseNewsletterEdition(
      '2026-09-01-the-interface-is-becoming-executable',
      SOURCE
    );

    expect(edition.markdown).toContain('Public field note.');
    expect(edition.markdown).not.toContain('Internal assembly instructions.');
    expect(edition.readingMinutes).toBeGreaterThan(0);
  });

  it('fails closed when a configured public cutoff marker is missing', () => {
    expect(() =>
      parseNewsletterEdition(
        'renamed-cutoff',
        SOURCE.replace('public_end_before: "## Email edition"', 'public_end_before: "## Missing"')
      )
    ).toThrow('missing public_end_before marker');
  });

  it('keeps unscheduled drafts out of the archive without rejecting the source', () => {
    const draft = parseNewsletterEdition(
      'next-draft',
      SOURCE.replace('web_status: "published"', 'web_status: "draft"').replace(
        'web_publish_at: "2026-09-02T09:00:00-05:00"\n',
        ''
      )
    );

    expect(draft.webPublishAt).toBeNull();
    expect(getPublishedNewsletterEditions([draft], new Date('2026-09-03T14:00:00.000Z'))).toEqual(
      []
    );
  });

  it('uses the Performance and Meridian editorial token contract', () => {
    const routeSources = [
      readFileSync(new URL('../src/routes/newsletters/+page.svelte', import.meta.url), 'utf8'),
      readFileSync(
        new URL('../src/routes/newsletters/[slug]/+page.svelte', import.meta.url),
        'utf8'
      )
    ];

    for (const source of routeSources) {
      const styles = source.split('<style>')[1]?.split('</style>')[0] ?? '';
      expect(styles).toContain('var(--color-performance-editorial-light)');
      expect(styles).toContain('var(--font-performance-editorial)');
      expect(styles).toContain('var(--font-performance-interface)');
      expect(styles).toContain('var(--font-performance-record)');
      expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
    }
  });
});
