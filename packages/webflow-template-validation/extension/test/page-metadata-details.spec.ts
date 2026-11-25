import { describe, expect, it } from 'vitest';
import { createPageMetadataDetailsHTML } from '../src/page-metadata-details';

describe('createPageMetadataDetailsHTML', () => {
  it('shows affected page names and escapes untrusted labels', () => {
    const html = createPageMetadataDetailsHTML({
      pages: ['Log In (/log-in)', '<img src=x onerror=alert(1)>']
    });

    expect(html).toContain('View affected pages (2)');
    expect(html).toContain('Log In (/log-in)');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
  });

  it('shows the page and the finding for reviewer-standard checks', () => {
    const html = createPageMetadataDetailsHTML({
      pages: [{ url: 'https://x.webflow.io/404', detail: '"More templates" → store.example' }, { other: 1 }]
    });

    expect(html).toContain('View affected page (1)');
    expect(html).toContain('https://x.webflow.io/404 — &quot;More templates&quot; → store.example');
  });

  it('shows each duplicate metadata group together', () => {
    const html = createPageMetadataDetailsHTML({
      duplicates: [
        ['About (/about)', 'Contact (/contact)'],
        ['Pricing (/pricing)', 'Services (/services)']
      ]
    });

    expect(html).toContain('View duplicate groups (2)');
    expect(html).toContain('About (/about) · Contact (/contact)');
    expect(html).toContain('Pricing (/pricing) · Services (/services)');
  });
});
