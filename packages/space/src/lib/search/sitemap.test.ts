import { describe, expect, it } from 'vitest';

import { getSpaceSitemapPaths } from './sitemap';

describe('space sitemap catalog', () => {
  it('tracks current public routes and leaves retired routes out', () => {
    const paths = getSpaceSitemapPaths();

    expect(paths).toContain('/data/nba/clutch');
    expect(paths).toContain('/discover/creation-moat');
    expect(paths).toContain('/motion');
    expect(paths).toContain('/playground');
    expect(paths).not.toContain('/experiments');
    expect(paths).not.toContain('/privacy');
    expect(paths).not.toContain('/terms');
  });
});
