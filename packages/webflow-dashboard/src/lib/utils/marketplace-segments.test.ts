import { describe, expect, it } from 'vitest';
import {
  assumedRevenueShare,
  isEstimate,
  formatShare,
  formatWholeShare,
  hasNinetyDays,
  hasSupply,
  isThin,
  revenuePerSeller,
  sellThrough,
  sellingTemplates
} from './marketplace-segments';
import {
  getCategoryCompetition,
  filterMarketplaceCategories
} from './marketplace-insights-filters';

const row = {
  category: 'Technology',
  subcategory: 'Startup',
  templatesInSubcategory: 12,
  totalSales30d: 20,
  totalRevenue30d: 1800,
  avgRevenuePerTemplate: 150,
  revenueRank: 1,
  fulfillmentSales30d: 5,
  listedTemplates: 240,
  templatesWithSales90d: 30,
  totalSales90d: 64,
  totalRevenue90d: 5400,
  fulfillmentSales90d: 8
};
const legacy = {
  ...row,
  fulfillmentSales30d: undefined,
  listedTemplates: undefined,
  templatesWithSales90d: undefined,
  totalSales90d: undefined,
  totalRevenue90d: undefined,
  fulfillmentSales90d: undefined
};

describe('marketplace segments', () => {
  it('reads sell-through from listed supply for each window', () => {
    expect(sellThrough(row, '30d')).toBeCloseTo(0.05);
    expect(sellThrough(row, '90d')).toBeCloseTo(0.125);
    expect(sellingTemplates(row, '90d')).toBe(30);
    expect(revenuePerSeller(row, '90d')).toBe(180);
  });

  it('has no sell-through without supply, and never passes 100%', () => {
    expect(sellThrough(legacy, '30d')).toBeNull();
    expect(sellThrough({ ...row, listedTemplates: 6 }, '30d')).toBe(1);
    expect(hasSupply([legacy])).toBe(false);
    expect(hasNinetyDays([legacy])).toBe(false);
    expect(hasSupply([legacy, row])).toBe(true);
  });

  it('marks a rate as thin by the templates sold, which is what the rate counts', () => {
    expect(isThin(row, '30d')).toBe(true);
    expect(isThin(row, '90d')).toBe(false);
    expect(isThin({ ...row, templatesInSubcategory: 15, totalSales30d: 15 }, '30d')).toBe(false);
    expect(isThin({ ...row, templatesInSubcategory: 14, totalSales30d: 90 }, '30d')).toBe(true);
  });

  it('gives the share of sales whose revenue is assumed', () => {
    expect(assumedRevenueShare(row)).toBe(0.25);
    expect(assumedRevenueShare(row, '90d')).toBe(0.125);
    expect([isEstimate(row), isEstimate(row, '90d'), isEstimate(legacy)]).toEqual([
      true,
      false,
      false
    ]);
    expect(assumedRevenueShare(legacy)).toBeNull();
    expect(assumedRevenueShare({ ...row, totalSales30d: 0, fulfillmentSales30d: 0 })).toBeNull();
    expect([formatShare(0.25), formatShare(0.053), formatShare(0.0004), formatShare(0)]).toEqual([
      '25.0%',
      '5.3%',
      '<0.1%',
      '0%'
    ]);
    expect(formatWholeShare(0.714)).toBe('71%');
  });

  it('takes competition from listed supply, and from sellers only for older snapshots', () => {
    expect(getCategoryCompetition(row).level).toBe('High');
    expect(getCategoryCompetition({ ...row, listedTemplates: 49 }).level).toBe('Low');
    expect(getCategoryCompetition({ ...row, listedTemplates: 400 }).level).toBe('Very High');
    expect(getCategoryCompetition(legacy).level).toBe('Medium');
    const filtered = filterMarketplaceCategories(
      [row, { ...row, subcategory: 'AI', listedTemplates: 30 }],
      {
        searchQuery: '',
        categoryFilter: 'all',
        competitionFilter: 'low',
        userCategoryFilter: 'all',
        userCategories: new Set()
      }
    );
    expect(filtered.map((entry) => entry.subcategory)).toEqual(['AI']);
  });
});
