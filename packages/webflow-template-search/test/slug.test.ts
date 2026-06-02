import { describe, expect, it } from 'vitest';

import { canonicalizeCategoryGroupSlug, deriveChildCategorySlug, normalizeChildCategorySlug, normalizeStyleSlug } from '../src/slug.js';

describe('slug helpers', () => {
  it('normalizes marketplace slugs', () => {
    expect(canonicalizeCategoryGroupSlug('Technology')).toBe('technology-websites');
    expect(deriveChildCategorySlug('Blockchain, Cryptocurrency & NFTs')).toBe('blockchain-cryptocurrency-and-nfts-websites');
    expect(normalizeChildCategorySlug('Classes & Courses', 'classes-and-courses-websites')).toBe('classes-and-courses-websites');
    expect(normalizeChildCategorySlug('Classes & Courses', 'classes-and-courses')).toBe('classes-and-courses-websites');
    expect(normalizeStyleSlug('Modern')).toBe('modern');
  });
});
