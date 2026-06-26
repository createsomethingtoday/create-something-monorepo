export type CompetitionFilter = 'all' | 'low' | 'medium' | 'high' | 'very-high';
export type UserCategoryFilter = 'all' | 'user';

export interface MarketplaceCategoryEntry {
  category: string;
  subcategory: string;
  templatesInSubcategory: number;
  totalSales30d: number;
  totalRevenue30d: number;
  avgRevenuePerTemplate: number;
  revenueRank: number;
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
}

export interface MarketplaceUserCategoryEntry {
  category: string;
}

export interface CompetitionIndicator {
  key: Exclude<CompetitionFilter, 'all'>;
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  color: 'success' | 'info' | 'warning' | 'error';
}

export interface MarketplaceCategoryFilterState {
  searchQuery: string;
  categoryFilter: string;
  competitionFilter: CompetitionFilter;
  userCategoryFilter: UserCategoryFilter;
  userCategories: ReadonlySet<string>;
}

export function isCompetitionFilter(value: unknown): value is CompetitionFilter {
  return (
    value === 'all' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'very-high'
  );
}

export function getCompetitionIndicator(templateCount: number): CompetitionIndicator {
  if (templateCount < 10) return { key: 'low', level: 'Low', color: 'success' };
  if (templateCount < 30) return { key: 'medium', level: 'Medium', color: 'info' };
  if (templateCount < 70) return { key: 'high', level: 'High', color: 'warning' };
  return { key: 'very-high', level: 'Very High', color: 'error' };
}

export function getCompetitionClass(level: string): string {
  return level.toLowerCase().replace(/\s+/g, '-');
}

export function getUserCategorySet(
  userTemplates: MarketplaceUserCategoryEntry[]
): ReadonlySet<string> {
  return new Set(userTemplates.map((template) => template.category).filter(Boolean));
}

function normalizeCategoryMatchValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getExpandedUserCategorySet(
  userCategories: ReadonlySet<string>,
  categories: MarketplaceCategoryEntry[]
): ReadonlySet<string> {
  const expanded = new Set(userCategories);
  const normalizedUserCategories = Array.from(userCategories, (category) =>
    normalizeCategoryMatchValue(category)
  ).filter(Boolean);

  for (const category of categories) {
    const normalizedCategory = normalizeCategoryMatchValue(category.category);

    if (
      normalizedUserCategories.some(
        (userCategory) =>
          userCategory === normalizedCategory ||
          userCategory.includes(normalizedCategory)
      )
    ) {
      expanded.add(category.category);
    }
  }

  return expanded;
}

export function filterMarketplaceCategories(
  categories: MarketplaceCategoryEntry[],
  filters: MarketplaceCategoryFilterState
): MarketplaceCategoryEntry[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return categories.filter((category) => {
    if (query) {
      const text = `${category.category} ${category.subcategory}`.toLowerCase();
      if (!text.includes(query)) return false;
    }

    if (filters.categoryFilter !== 'all' && category.category !== filters.categoryFilter) {
      return false;
    }

    if (
      filters.competitionFilter !== 'all' &&
      getCompetitionIndicator(category.templatesInSubcategory).key !== filters.competitionFilter
    ) {
      return false;
    }

    if (filters.userCategoryFilter === 'user' && !filters.userCategories.has(category.category)) {
      return false;
    }

    return true;
  });
}
