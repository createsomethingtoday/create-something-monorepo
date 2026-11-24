import { describe, expect, it } from 'vitest';
import {
  assumedRevenueShare,
  formatWholeShare,
  hasNinetyDays,
  hasSupply,
  isEstimate,
  revenuePerSeller,
  segmentSales,
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
  it('reads each number for the selected window', () => {
    expect([sellingTemplates(row, '30d'), sellingTemplates(row, '90d')]).toEqual([12, 30]);
    expect([segmentSales(row, '30d'), segmentSales(row, '90d')]).toEqual([20, 64]);
    expect([revenuePerSeller(row, '30d'), revenuePerSeller(row, '90d')]).toEqual([150, 180]);
    expect(revenuePerSeller({ ...row, templatesInSubcategory: 0, totalRevenue30d: 0 }, '30d')).toBe(
      0
    );
  });

  it('knows which optional data a snapshot carries', () => {
    expect([hasSupply([legacy]), hasNinetyDays([legacy])]).toEqual([false, false]);
    expect([hasSupply([legacy, row]), hasNinetyDays([legacy, row])]).toEqual([true, true]);
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
