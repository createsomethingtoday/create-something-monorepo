import { describe, expect, it } from 'vitest';

import { canonicalizeCategoryGroupSlug, deriveChildCategorySlug, normalizeStyleSlug } from '../src/slug.js';

describe('slug helpers', () => {
  it('normalizes marketplace slugs', () => {
    expect(canonicalizeCategoryGroupSlug('Technology')).toBe('technology-websites');
    expect(deriveChildCategorySlug('Blockchain, Cryptocurrency & NFTs')).toBe('blockchain-cryptocurrency-and-nfts-websites');
    expect(normalizeStyleSlug('Modern')).toBe('modern');
  });
});
