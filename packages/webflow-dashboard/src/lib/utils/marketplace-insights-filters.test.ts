import { describe, expect, it } from 'vitest';
import {
  filterMarketplaceCategories,
  getExpandedUserCategorySet,
  getCompetitionIndicator,
  getUserCategorySet,
  type MarketplaceCategoryEntry
} from './marketplace-insights-filters';

const categoryRows: MarketplaceCategoryEntry[] = [
  {
    category: 'Design',
    subcategory: 'Creative Agency',
    templatesInSubcategory: 5,
    totalSales30d: 12,
    totalRevenue30d: 1068,
    avgRevenuePerTemplate: 89,
    revenueRank: 161
  },
  {
    category: 'Design',
    subcategory: 'Portfolio',
    templatesInSubcategory: 91,
    totalSales30d: 260,
    totalRevenue30d: 16653,
    avgRevenuePerTemplate: 183,
    revenueRank: 3
  },
  {
    category: 'Design',
    subcategory: 'Agency',
    templatesInSubcategory: 63,
    totalSales30d: 200,
    totalRevenue30d: 15309,
    avgRevenuePerTemplate: 243,
    revenueRank: 4
  },
  {
    category: 'Business',
    subcategory: 'Startups',
    templatesInSubcategory: 1,
    totalSales30d: 1,
    totalRevenue30d: 1226,
    avgRevenuePerTemplate: 1226,
    revenueRank: 1
  },
  {
    category: 'Design',
    subcategory: 'Architecture',
    templatesInSubcategory: 6,
    totalSales30d: 16,
    totalRevenue30d: 3664,
    avgRevenuePerTemplate: 229,
    revenueRank: 68
  }
];

describe('marketplace insights filters', () => {
  it('filters by category and competition together', () => {
    const filtered = filterMarketplaceCategories(categoryRows, {
      searchQuery: '',
      categoryFilter: 'Design',
      competitionFilter: 'very-high',
      userCategoryFilter: 'all',
      userCategories: new Set()
    });

    expect(filtered.map((row) => row.subcategory)).toEqual(['Portfolio']);
  });

  it('filters template-category scope by creator parent categories', () => {
    const userCategories = getUserCategorySet([{ category: 'Design' }]);
    const filtered = filterMarketplaceCategories(categoryRows, {
      searchQuery: '',
      categoryFilter: 'all',
      competitionFilter: 'all',
      userCategoryFilter: 'user',
      userCategories
    });

    expect(filtered.map((row) => row.subcategory)).toEqual([
      'Creative Agency',
      'Portfolio',
      'Agency',
      'Architecture'
    ]);
  });

  it('combines search, competition, and template-category filters', () => {
    const userCategories = getUserCategorySet([{ category: 'Design' }]);
    const filtered = filterMarketplaceCategories(categoryRows, {
      searchQuery: 'portfolio',
      categoryFilter: 'all',
      competitionFilter: 'very-high',
      userCategoryFilter: 'user',
      userCategories
    });

    expect(filtered.map((row) => row.subcategory)).toEqual(['Portfolio']);
  });

  it('normalizes competition levels to stable filter keys', () => {
    expect(getCompetitionIndicator(1).key).toBe('low');
    expect(getCompetitionIndicator(10).key).toBe('medium');
    expect(getCompetitionIndicator(30).key).toBe('high');
    expect(getCompetitionIndicator(70).key).toBe('very-high');
  });

  it('expands combined creator category labels to matching performance parents', () => {
    const expanded = getExpandedUserCategorySet(new Set(['Architecture & Design']), categoryRows);

    expect(expanded.has('Architecture & Design')).toBe(true);
    expect(expanded.has('Design')).toBe(true);
  });
});
