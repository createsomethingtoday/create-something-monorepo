import { describe, expect, it } from 'vitest';

import { renderSitemap } from './sitemap.js';

describe('renderSitemap', () => {
  it('renders one normalized, escaped URL for each indexable path', () => {
    const xml = renderSitemap('https://example.com/', [
      '/',
      '/papers/one',
      '/papers/one/',
      '/research?topic=signals&state=ready'
    ]);

    expect(xml.match(/<loc>/g)).toHaveLength(3);
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/papers/one</loc>');
    expect(xml).toContain(
      '<loc>https://example.com/research?topic=signals&amp;state=ready</loc>'
    );
    expect(xml).not.toContain('<lastmod>');
  });
});
