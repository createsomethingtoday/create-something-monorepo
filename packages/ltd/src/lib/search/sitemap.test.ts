import { describe, expect, it } from 'vitest';

import { getLtdSitemapPaths } from './sitemap';

describe('ltd sitemap catalog', () => {
  it('derives indexable detail routes from their owning content sources', async () => {
    const paths = await getLtdSitemapPaths(undefined);

    expect(paths).toContain('/patterns/crystallization');
    expect(paths).toContain('/patterns/universal-utility');
    expect(paths).toContain('/masters/dieter-rams');
    expect(paths).toContain('/canon/concepts/conviction-without-dependence');
    expect(paths).not.toContain('/privacy');
    expect(paths).not.toContain('/terms');
  });
});
