<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { Badge } from './ui';
  import Sparkline from './Sparkline.svelte';
  import KineticNumber from './KineticNumber.svelte';
  import { HelpCircle } from 'lucide-svelte';
  import { trackEvent } from '$lib/utils/analytics';
  import {
    filterMarketplaceCategories,
    getCompetitionClass,
    getExpandedUserCategorySet,
    getCompetitionIndicator,
    getUserCategorySet,
    isCompetitionFilter,
    type CompetitionFilter,
    type UserCategoryFilter
  } from '$lib/utils/marketplace-insights-filters';
  import type {
    CategoryEntry,
    Insight,
    LeaderboardEntry,
    MarketplaceSummary
  } from '$lib/marketplace-insights';

  interface Props {
    leaderboard: LeaderboardEntry[];
    categories: CategoryEntry[];
    insights: Insight[];
    userTemplates: LeaderboardEntry[];
    userCategories?: string[];
    summary: MarketplaceSummary;
  }

  let { leaderboard, categories, insights, userTemplates, userCategories = [], summary }: Props =
    $props();

  type CategorySortKey =
    | 'revenueRank'
    | 'templatesInSubcategory'
    | 'totalSales30d'
    | 'avgRevenuePerTemplate'
    | 'category'
    | 'subcategory'
    | 'competition';

  interface CategoryPreferences {
    sortKey: CategorySortKey;
    sortDirection: 'asc' | 'desc';
    viewMode: 'table' | 'grid';
    searchQuery: string;
    categoryFilter: string;
    competitionFilter: CompetitionFilter;
    userCategoryFilter: UserCategoryFilter;
  }

  const CATEGORY_PREFERENCES_STORAGE_KEY = 'webflow-dashboard.marketplace-insights.preferences.v1';
  const validSortKeys: CategorySortKey[] = [
    'revenueRank',
    'templatesInSubcategory',
    'totalSales30d',
    'avgRevenuePerTemplate',
    'category',
    'subcategory',
    'competition'
  ];

  /**
   * Sort insights by priority and type
   */
  const sortedInsights = $derived.by(() => {
    return [...insights].sort((a, b) => {
      // Priority order: warning > opportunity > trend
      const typeOrder = { warning: 0, opportunity: 1, trend: 2 };
      const typeCompare = typeOrder[a.type] - typeOrder[b.type];
      if (typeCompare !== 0) return typeCompare;

      // Then by priority if specified
      return (b.priority || 0) - (a.priority || 0);
    });
  });

  let sortKey = $state<CategorySortKey>('revenueRank');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let viewMode = $state<'table' | 'grid'>('table');
  let searchQuery = $state('');
  let categoryFilter = $state('all');
  let competitionFilter = $state<CompetitionFilter>('all');
  let userCategoryFilter = $state<UserCategoryFilter>('all');
  let tableViewport = $state<'unknown' | 'mobile' | 'desktop'>('unknown');
  const ownedUserCategorySet = $derived.by(() => {
    const categoryEntries =
      userCategories.length > 0 ? userCategories.map((category) => ({ category })) : userTemplates;

    return getUserCategorySet(categoryEntries);
  });
  const userCategorySet = $derived.by(() =>
    getExpandedUserCategorySet(ownedUserCategorySet, categories)
  );
  const shouldRenderMobileTable = $derived(tableViewport !== 'desktop');
  const shouldRenderDesktopTable = $derived(tableViewport !== 'mobile');

  const gridSortOptions: Array<{ key: CategorySortKey; label: string }> = [
    { key: 'revenueRank', label: 'Rank' },
    { key: 'avgRevenuePerTemplate', label: 'Avg Revenue' },
    { key: 'totalSales30d', label: 'Sales (30d)' },
    { key: 'templatesInSubcategory', label: 'Active Templates' },
    { key: 'competition', label: 'Competition' },
    { key: 'category', label: 'Category' },
    { key: 'subcategory', label: 'Subcategory' }
  ];
  const tableSortableKeys: CategorySortKey[] = [
    'revenueRank',
    'templatesInSubcategory',
    'totalSales30d',
    'avgRevenuePerTemplate'
  ];
  let preferencesLoaded = $state(false);

  const availableCategoryFilters = $derived.by(() => {
    return Array.from(new Set(categories.map((entry) => entry.category))).sort((a, b) =>
      a.localeCompare(b)
    );
  });

  const sortedCategories = $derived.by(() => {
    const currentSortKey = sortKey;
    const currentSortDirection = sortDirection;
    const currentCategories = filterMarketplaceCategories(categories, {
      searchQuery,
      categoryFilter,
      competitionFilter,
      userCategoryFilter,
      userCategories: userCategorySet
    });

    return [...currentCategories].sort((a, b) => {
      const multiplier = currentSortDirection === 'asc' ? 1 : -1;

      if (currentSortKey === 'competition') {
        const competitionOrder: Record<string, number> = {
          Low: 0,
          Medium: 1,
          High: 2,
          'Very High': 3
        };
        const aCompetition =
          competitionOrder[getCompetitionIndicator(a.templatesInSubcategory).level] ?? 99;
        const bCompetition =
          competitionOrder[getCompetitionIndicator(b.templatesInSubcategory).level] ?? 99;
        return (aCompetition - bCompetition) * multiplier;
      }

      const aVal = a[currentSortKey];
      const bVal = b[currentSortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier;
      }

      return ((aVal as number) - (bVal as number)) * multiplier;
    });
  });

  const hasActiveFilters = $derived(
    searchQuery.trim().length > 0 ||
      categoryFilter !== 'all' ||
      competitionFilter !== 'all' ||
      userCategoryFilter !== 'all'
  );

  function handleSort(key: CategorySortKey) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection = 'asc';
    }
  }

  function getAriaSort(key: CategorySortKey): 'ascending' | 'descending' | 'none' {
    if (sortKey !== key) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  function clearFilters() {
    trackEvent('marketplace_filters_cleared');
    searchQuery = '';
    categoryFilter = 'all';
    competitionFilter = 'all';
    userCategoryFilter = 'all';
  }

  function setViewMode(mode: 'table' | 'grid') {
    if (mode === viewMode) return;
    trackEvent('marketplace_view_mode_changed', { view_mode: mode });
    viewMode = mode;

    if (mode === 'table' && !tableSortableKeys.includes(sortKey)) {
      sortKey = 'revenueRank';
      sortDirection = 'asc';
    }
  }

  function isCategorySortKey(value: unknown): value is CategorySortKey {
    return typeof value === 'string' && validSortKeys.includes(value as CategorySortKey);
  }

  function getCategoryRowKey(category: CategoryEntry, index: number): string {
    return [
      category.category,
      category.subcategory,
      category.revenueRank,
      category.templatesInSubcategory,
      category.totalSales30d,
      index
    ].join('::');
  }

  $effect(() => {
    if (!browser || preferencesLoaded) return;

    try {
      const raw = localStorage.getItem(CATEGORY_PREFERENCES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CategoryPreferences>;

        if (isCategorySortKey(parsed.sortKey)) sortKey = parsed.sortKey;
        if (parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc')
          sortDirection = parsed.sortDirection;
        if (parsed.viewMode === 'table' || parsed.viewMode === 'grid') viewMode = parsed.viewMode;
        if (typeof parsed.searchQuery === 'string') searchQuery = parsed.searchQuery;
        if (typeof parsed.categoryFilter === 'string') categoryFilter = parsed.categoryFilter;
        if (isCompetitionFilter(parsed.competitionFilter)) {
          competitionFilter = parsed.competitionFilter;
        }
        if (parsed.userCategoryFilter === 'all' || parsed.userCategoryFilter === 'user') {
          userCategoryFilter = parsed.userCategoryFilter;
        }

        if (viewMode === 'table' && !tableSortableKeys.includes(sortKey)) {
          sortKey = 'revenueRank';
          sortDirection = 'asc';
        }
      }
    } catch {
      // Ignore malformed preference payloads and continue with defaults.
    } finally {
      preferencesLoaded = true;
    }
  });

  $effect(() => {
    if (!browser || !preferencesLoaded) return;

    const preferences: CategoryPreferences = {
      sortKey,
      sortDirection,
      viewMode,
      searchQuery,
      categoryFilter,
      competitionFilter,
      userCategoryFilter
    };

    localStorage.setItem(CATEGORY_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  });

  $effect(() => {
    if (categoryFilter === 'all') return;
    if (availableCategoryFilters.includes(categoryFilter)) return;
    categoryFilter = 'all';
  });

  const hasMarketplaceSalesSummaryData = $derived(
    () =>
      summary.totalMarketplaceSales !== null ||
      Boolean(summary.dataWarning) ||
      Boolean(summary.lastUpdated)
  );
  const hasUserSummaryData = $derived(() => userTemplates.length > 0);
  const visibleSummaryItemCount = $derived(() => {
    let count = 0;
    if (hasMarketplaceSalesSummaryData()) count += 1; // total sales
    if (hasUserSummaryData()) count += 2; // rank + top 50
    if (categories.length > 0) count += 1; // categories tracked
    return count;
  });

  function toggleUserPortfolioFilter() {
    userCategoryFilter = userCategoryFilter === 'user' ? 'all' : 'user';
    trackEvent('marketplace_portfolio_filter_toggled', {
      filter_state: userCategoryFilter
    });
  }

  function getMarketplaceSalesSupport(): string {
    if (summary.totalMarketplaceSales === null) return 'source unavailable';
    if (summary.salesSource === 'leaderboard-top-50') return 'across top 50 templates';
    return 'across active categories';
  }

  function getMarketplaceSalesMeta(): string {
    const windowLabel = summary.dataWindow || '30-day snapshot';
    if (summary.timeUntilNextSync) {
      return `${windowLabel} · next update ${summary.timeUntilNextSync}`;
    }
    return windowLabel;
  }

  onMount(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const updateTableViewport = () => {
      tableViewport = desktopQuery.matches ? 'desktop' : 'mobile';
    };

    updateTableViewport();
    desktopQuery.addEventListener('change', updateTableViewport);

    return () => {
      desktopQuery.removeEventListener('change', updateTableViewport);
    };
  });
</script>

<div class="marketplace-insights">
  <!-- Summary Stats: high data-ink ratio, direct labels, minimal ornament -->
  {#if visibleSummaryItemCount() > 0}
    <dl
      class={`summary-grid summary-grid-${visibleSummaryItemCount()}`}
      in:fade={{ duration: 220 }}
    >
      {#if hasMarketplaceSalesSummaryData()}
        <div class="summary-item">
          <dt class="summary-term">Total Sales (30d)</dt>
          {#if summary.totalMarketplaceSales === null}
            <dd class="summary-value summary-value-unavailable">-</dd>
          {:else}
            <dd class="summary-value"><KineticNumber value={summary.totalMarketplaceSales} /></dd>
          {/if}
          <dd class="summary-support">{getMarketplaceSalesSupport()}</dd>
          <dd
            class="summary-meta"
            title={summary.syncSchedule || summary.dataWindow || 'Rolling 30-day window'}
          >
            {getMarketplaceSalesMeta()}
          </dd>
          {#if summary.dataWarning}
            <dd class="summary-warning">{summary.dataWarning}</dd>
          {/if}
        </div>
      {/if}

      {#if hasUserSummaryData()}
        <div class="summary-item">
          <dt class="summary-term">Your Best Rank</dt>
          <dd class="summary-value">
            {summary.userBestRank ? `#${summary.userBestRank}` : '-'}
          </dd>
          <dd class="summary-support">
            {summary.userBestRank ? 'out of top 50 templates' : 'not in top 50 this period'}
          </dd>
          <dd class="summary-meta">by revenue</dd>
        </div>

        <div class="summary-item">
          <dt class="summary-term">Your Templates in Top 50</dt>
          <dd class="summary-value"><KineticNumber value={userTemplates.length} /></dd>
          <dd class="summary-support">in the leaderboard</dd>
          <dd class="summary-meta">30-day window</dd>
        </div>
      {/if}

      {#if categories.length > 0}
        <div class="summary-item">
          <dt class="summary-term">Categories Tracked</dt>
          <dd class="summary-value"><KineticNumber value={categories.length} /></dd>
          <dd class="summary-support">with recent sales</dd>
          <dd class="summary-meta">active categories</dd>
        </div>
      {/if}
    </dl>
  {/if}

  <!-- Category Performance Table with Trend Indicators -->
  {#if categories.length > 0}
    <section class="categories-section">
      <div class="categories-header">
        <h3 class="section-title">Category Performance (30-Day Window)</h3>
        <div class="view-toggle">
          <button
            class="toggle-btn"
            class:active={viewMode === 'table'}
            onclick={() => setViewMode('table')}
          >
            Table
          </button>
          <button
            class="toggle-btn"
            class:active={viewMode === 'grid'}
            onclick={() => setViewMode('grid')}
          >
            Grid
          </button>
        </div>
      </div>

      <div class="categories-controls">
        <div class="filter-controls">
          {#if userCategorySet.size > 0}
            <button
              class="portfolio-shortcut"
              class:active={userCategoryFilter === 'user'}
              type="button"
              onclick={toggleUserPortfolioFilter}
            >
              {userCategoryFilter === 'user'
                ? 'Showing your template categories'
                : 'Your template categories'}
            </button>
          {/if}
          <input
            class="control-input"
            type="search"
            bind:value={searchQuery}
            placeholder="Search category or subcategory"
            aria-label="Search category or subcategory"
          />
          <select
            class="control-select"
            bind:value={categoryFilter}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {#each availableCategoryFilters as categoryOption (categoryOption)}
              <option value={categoryOption}>{categoryOption}</option>
            {/each}
          </select>
          <select
            class="control-select"
            bind:value={competitionFilter}
            aria-label="Filter by competition"
          >
            <option value="all">All Competition Levels</option>
            <option value="low">Low Competition</option>
            <option value="medium">Medium Competition</option>
            <option value="high">High Competition</option>
            <option value="very-high">Very High Competition</option>
          </select>
          <select
            class="control-select"
            bind:value={userCategoryFilter}
            aria-label="Filter by your categories"
          >
            <option value="all">All Portfolios</option>
            <option value="user">Your Template Categories</option>
          </select>
          {#if hasActiveFilters}
            <button class="control-btn" type="button" onclick={clearFilters}> Clear </button>
          {/if}
        </div>

        {#if viewMode === 'grid'}
          <div class="grid-sort-controls">
            <select
              class="control-select"
              bind:value={sortKey}
              aria-label="Sort grid by"
            >
              {#each gridSortOptions as option}
                <option value={option.key}>{option.label}</option>
              {/each}
            </select>
            <button
              class="control-btn sort-direction-btn"
              type="button"
              onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? 'Asc ↑' : 'Desc ↓'}
            </button>
          </div>
        {/if}
      </div>

      <p class="categories-meta">
        Showing {sortedCategories.length} of {categories.length} category rows
      </p>

      {#if sortedCategories.length === 0}
        <div class="categories-empty">
          <p>No category rows match your current filters.</p>
          {#if searchQuery.trim()}
            <p class="categories-empty-hint">
              This search checks category and subcategory names, not template names.
            </p>
          {/if}
        </div>
      {:else if viewMode === 'table'}
        <!-- Mobile Card Layout for Table View -->
        {#if shouldRenderMobileTable}
          <div class="table-mobile-cards">
            {#each sortedCategories as category, index (getCategoryRowKey(category, index))}
              {@const competition = getCompetitionIndicator(category.templatesInSubcategory)}
              {@const isUserCategory =
                ownedUserCategorySet.has(category.category) ||
                ownedUserCategorySet.has(category.subcategory)}
              <div class="table-mobile-card" class:user-category={isUserCategory}>
                <div class="mobile-card-header">
                  <div class="mobile-card-title">
                    <span class="category-parent">{category.category}</span>
                    <span class="category-name">{category.subcategory}</span>
                    {#if isUserCategory}
                      <span class="user-indicator">Your template category</span>
                    {/if}
                  </div>
                  <span class="rank-pill">#{category.revenueRank}</span>
                </div>
                <div class="mobile-card-metric">
                  <span class="metric-value"
                    >${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span
                  >
                  <span class="metric-label">avg revenue</span>
                </div>
                <div class="mobile-card-stats">
                  <div class="mobile-stat">
                    <span class="stat-label">Sales (30d)</span>
                    <span class="stat-value">{category.totalSales30d.toLocaleString()}</span>
                  </div>
                  <div class="mobile-stat">
                    <span
                      class="stat-label stat-label-with-tooltip"
                      title="Templates with sales in 30-day window"
                    >
                      Active Templates
                      <HelpCircle size={10} />
                    </span>
                    <span class="stat-value">{category.templatesInSubcategory}</span>
                  </div>
                </div>
                <Badge
                  variant={competition.color === 'success'
                    ? 'success'
                    : competition.color === 'warning'
                      ? 'warning'
                      : competition.color === 'error'
                        ? 'error'
                        : 'info'}
                >
                  {competition.level} Competition
                </Badge>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Desktop Table Layout -->
        {#if shouldRenderDesktopTable}
        <div class="table-container table-desktop">
          <table class="data-table">
            <colgroup>
              <col class="category-col" />
              <col class="rank-col" />
              <col class="active-col" />
              <col class="sales-col" />
              <col class="revenue-col" />
              <col class="competition-col" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Category • Subcategory</th>
                <th scope="col" class="right-head" aria-sort={getAriaSort('revenueRank')}>
                  <button
                    type="button"
                    class="table-sort-button"
                    onclick={() => handleSort('revenueRank')}
                  >
                    Rank
                    {#if sortKey === 'revenueRank'}
                      <span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </th>
                <th
                  scope="col"
                  class="right-head"
                  aria-sort={getAriaSort('templatesInSubcategory')}
                >
                  <button
                    type="button"
                    class="table-sort-button"
                    onclick={() => handleSort('templatesInSubcategory')}
                  >
                    <span class="th-with-tooltip">
                      Active
                      <span
                        class="tooltip-trigger"
                        title="Templates with sales in 30-day window (not total marketplace inventory)"
                      >
                        <HelpCircle size={12} />
                      </span>
                    </span>
                    {#if sortKey === 'templatesInSubcategory'}
                      <span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </th>
                <th
                  scope="col"
                  class="right-head"
                  aria-sort={getAriaSort('totalSales30d')}
                >
                  <button
                    type="button"
                    class="table-sort-button"
                    onclick={() => handleSort('totalSales30d')}
                  >
                    Sales (30d)
                    {#if sortKey === 'totalSales30d'}
                      <span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </th>
                <th
                  scope="col"
                  class="right-head"
                  aria-sort={getAriaSort('avgRevenuePerTemplate')}
                >
                  <button
                    type="button"
                    class="table-sort-button"
                    onclick={() => handleSort('avgRevenuePerTemplate')}
                  >
                    Avg / Template
                    {#if sortKey === 'avgRevenuePerTemplate'}
                      <span class="sort-icon">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    {/if}
                  </button>
                </th>
                <th scope="col" class="competition-head">Competition</th>
              </tr>
            </thead>
            <tbody>
              {#each sortedCategories as category, index (getCategoryRowKey(category, index))}
                {@const competition = getCompetitionIndicator(category.templatesInSubcategory)}
                {@const isUserCategory =
                  ownedUserCategorySet.has(category.category) ||
                  ownedUserCategorySet.has(category.subcategory)}
                <tr class:user-row={isUserCategory}>
                  <td>
                    <span class="category-stack">
                      <span class="category-parent">{category.category}</span>
                      <span class="category-name">{category.subcategory}</span>
                    </span>
                    {#if isUserCategory}
                      <span class="user-indicator">Your template category</span>
                    {/if}
                  </td>
                  <td class="right rank-cell">
                    <span class="rank-value">#{category.revenueRank}</span>
                  </td>
                  <td class="right">{category.templatesInSubcategory}</td>
                  <td class="right">{category.totalSales30d.toLocaleString()}</td>
                  <td class="right">
                    <span class="revenue"
                      >${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span
                    >
                  </td>
                  <td class="competition-cell">
                    <span
                      class="competition-value competition-{getCompetitionClass(
                        competition.level
                      )}"
                    >
                      <span class="competition-dot"></span>
                      {competition.level}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {/if}
      {:else}
        <div class="categories-grid">
          {#each sortedCategories as category, index (getCategoryRowKey(category, index))}
            {@const competition = getCompetitionIndicator(category.templatesInSubcategory)}
            {@const isUserCategory =
              ownedUserCategorySet.has(category.category) ||
              ownedUserCategorySet.has(category.subcategory)}
            <div class="category-card" class:user-category={isUserCategory}>
              <div class="category-card-header">
                <div class="category-info">
                  <span class="category-parent">{category.category}</span>
                  <span class="category-name">{category.subcategory}</span>
                </div>
                <span class="rank-pill">#{category.revenueRank}</span>
              </div>
              <div class="category-metric">
                <div class="metric-main">
                  <span class="metric-value"
                    >${Math.round(category.avgRevenuePerTemplate).toLocaleString()}</span
                  >
                  {#if category.trend && category.changePercent !== undefined}
                    <!-- Trend indicator -->
                    <span class="trend-indicator trend-{category.trend}">
                      <span class="trend-glyph">
                        {category.trend === 'up' ? '↑' : category.trend === 'down' ? '↓' : '→'}
                      </span>
                      <span class="trend-percent"
                        >{category.changePercent > 0 ? '+' : ''}{category.changePercent}%</span
                      >
                    </span>
                  {:else}
                    <span class="trend-unavailable">Trend unavailable</span>
                  {/if}
                </div>
                <span class="metric-label">avg per template</span>
              </div>
              <div class="category-stats">
                <div class="stat">
                  <span class="stat-label">Sales (30d)</span>
                  <span class="stat-value">{category.totalSales30d.toLocaleString()}</span>
                </div>
                <div class="stat">
                  <span
                    class="stat-label stat-label-with-tooltip"
                    title="Templates with sales in 30-day window"
                  >
                    Active Templates
                    <HelpCircle size={10} />
                  </span>
                  <span class="stat-value">{category.templatesInSubcategory}</span>
                </div>
              </div>
              <div class="category-footer">
                <Badge
                  variant={competition.color === 'success'
                    ? 'success'
                    : competition.color === 'warning'
                      ? 'warning'
                      : competition.color === 'error'
                        ? 'error'
                        : 'info'}
                  class="competition-badge"
                >
                  {competition.level} Competition
                </Badge>
                {#if isUserCategory}
                  <span class="user-indicator-badge">Your template category</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <!-- Insights with priority sorting -->
  {#if insights.length > 0}
    <section class="insights-section">
      <h3 class="section-title">
        Market Insights
        <span class="insight-count">{insights.length}</span>
      </h3>
      <div class="insights-list">
        {#each sortedInsights as insight (insight.message)}
          <div class="insight-item insight-{insight.type}">
            <div class="insight-content">
              <span class="insight-label">{insight.type}</span>
              <span class="insight-message">{insight.message}</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Top Performers with Sparkline Trends -->
  {#if leaderboard.length > 0}
    <section class="leaderboard-section">
      <h3 class="section-title">
        Top Performers (30d)
        <span class="section-subtitle">Rolling 30-day window</span>
      </h3>
      <div class="leaderboard-grid">
        {#each leaderboard.slice(0, 5) as template, index (template.templateName)}
          {@const hasTemplateTrend =
            Array.isArray(template.trendData) && template.trendData.length >= 2}
          <div
            class="leaderboard-card"
            class:user-template={template.isUserTemplate}
            style="--index: {index}"
          >
            <div class="leaderboard-header">
              <div class="rank-badge rank-{index + 1}">
                #{index + 1}
              </div>
              {#if template.isUserTemplate}
                <Badge variant="default">Your Template</Badge>
              {/if}
            </div>
            <div class="leaderboard-content">
              <p class="template-name">{template.templateName}</p>
              <p class="template-category">{template.category}</p>

              <div class="template-metrics">
                <div class="metric-row">
                  <span class="metric-label">Sales (30d)</span>
                  <span class="metric-value">{template.totalSales30d.toLocaleString()}</span>
                </div>
                {#if template.isUserTemplate && template.totalRevenue30d}
                  <div class="metric-row">
                    <span class="metric-label">Revenue</span>
                    <span class="metric-value revenue"
                      >${template.totalRevenue30d.toLocaleString()}</span
                    >
                  </div>
                {/if}
              </div>

              <div class="sparkline-container">
                {#if hasTemplateTrend}
                  <Sparkline
                    data={template.trendData ?? []}
                    width={80}
                    height={24}
                    color={template.isUserTemplate
                      ? 'var(--color-info)'
                      : 'var(--color-fg-secondary)'}
                    showTrend
                    filled
                  />
                  <span class="trend-label">30d trend</span>
                {:else}
                  <span class="trend-unavailable">Trend unavailable</span>
                {/if}
              </div>
            </div>
            <div class="leaderboard-footer">
              <Badge variant="outline">Rank #{index + 1}</Badge>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .marketplace-insights {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-bottom: var(--space-md);
    border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
  }

  .summary-grid.summary-grid-1 {
    grid-template-columns: 1fr;
  }

  .summary-grid.summary-grid-2 {
    grid-template-columns: repeat(2, 1fr);
  }

  .summary-grid.summary-grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  .summary-item {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    padding: 0.72rem 0.9rem;
    min-height: 5.8rem;
    border-right: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    background: transparent;
  }

  .summary-item:last-child {
    border-right: none;
  }

  .summary-term,
  .summary-value,
  .summary-support,
  .summary-meta {
    margin: 0;
  }

  .summary-term {
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .summary-value {
    font-family: var(--font-heading);
    font-size: clamp(1.38rem, 1vw + 1rem, 1.82rem);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .summary-value-unavailable {
    color: var(--color-fg-muted);
  }

  .summary-support {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: 1.28;
    margin-top: auto;
  }

  .summary-meta {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .summary-warning {
    margin: 0.2rem 0 0;
    color: var(--color-warning);
    font-size: var(--text-caption);
    line-height: 1.3;
  }

  @media (max-width: 1024px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .summary-item {
      border-right: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    }

    .summary-item:nth-child(odd) {
      border-right: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    }

    .summary-item:nth-last-child(-n + 2) {
      border-bottom: none;
    }
  }

  @media (max-width: 640px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .summary-item {
      min-height: auto;
      border-right: none;
    }

    .summary-item:not(:last-child) {
      border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    }

    .summary-item:nth-last-child(-n + 2) {
      border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    }

    .summary-item:last-child {
      border-bottom: none;
    }
  }

  /* Tooltip styles */
  .tooltip-trigger {
    display: inline-flex;
    align-items: center;
    cursor: help;
    color: var(--color-fg-muted);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .tooltip-trigger:hover {
    color: var(--color-info-soft-text);
  }

  .th-with-tooltip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .stat-label-with-tooltip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: help;
  }

  .stat-label-with-tooltip :global(svg) {
    color: var(--color-fg-muted);
    opacity: 0.7;
  }

  .stat-label-with-tooltip:hover :global(svg) {
    color: var(--color-info-soft-text);
    opacity: 1;
  }

  .section-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-sm);
    font-family: var(--font-heading);
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-md);
  }

  /* Insights */
  .insights-section,
  .leaderboard-section,
  .categories-section {
    order: 1;
  }

  .insights-section {
    order: 2;
  }

  .leaderboard-section {
    order: 3;
  }

  .categories-controls {
    display: grid;
    gap: var(--space-sm);
  }

  .portfolio-shortcut {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0.5rem 0.95rem;
    border: 1px solid var(--color-info-border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-info-soft-text);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition:
      background-color var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      color var(--duration-micro) var(--ease-standard);
  }

  .portfolio-shortcut:hover,
  .portfolio-shortcut.active {
    border-color: var(--color-info);
    background: color-mix(in srgb, var(--color-info-soft-bg) 35%, var(--color-bg-surface));
    color: var(--color-fg-primary);
  }

  .portfolio-shortcut:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .categories-section {
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .insight-item {
    display: flex;
    position: relative;
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-shell-border-default);
    border-left: 0;
    border-radius: 0;
    background: transparent;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .insight-item::before {
    content: '';
    width: 0.35rem;
    height: 0.35rem;
    border-radius: 999px;
    margin-top: 0.45rem;
    margin-right: 0.75rem;
    background: var(--color-border-emphasis);
    flex-shrink: 0;
  }

  .insight-opportunity::before {
    background: var(--color-success);
  }

  .insight-trend::before {
    background: var(--color-info);
  }

  .insight-warning::before {
    background: var(--color-warning);
  }

  .insight-content {
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    align-items: baseline;
  }

  .insight-label {
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    text-transform: capitalize;
    color: var(--color-fg-tertiary);
    min-width: 5.5rem;
  }

  .insight-opportunity .insight-label {
    color: color-mix(in srgb, var(--color-success) 82%, var(--color-fg-primary));
  }

  .insight-trend .insight-label {
    color: color-mix(in srgb, var(--color-info) 82%, var(--color-fg-primary));
  }

  .insight-warning .insight-label {
    color: color-mix(in srgb, var(--color-warning) 88%, var(--color-fg-primary));
  }

  .insight-message {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .insight-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.75rem;
    height: 1.75rem;
    padding: 0 0.5rem;
    border-radius: 999px;
    background: var(--color-info-soft-bg);
    border: 1px solid var(--color-info-soft-border);
    color: var(--color-info-soft-text);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
  }

  .section-subtitle {
    font-size: var(--text-caption);
    font-weight: var(--font-normal);
    color: var(--color-fg-muted);
    white-space: nowrap;
  }

  /* Leaderboard */
  .leaderboard-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-sm);
  }

  @media (max-width: 1200px) {
    .leaderboard-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .leaderboard-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .leaderboard-grid {
      grid-template-columns: 1fr;
    }
  }

  .leaderboard-card {
    display: flex;
    flex-direction: column;
    padding: 0.74rem;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-border-default) 70%, transparent);
    border-radius: var(--radius-sm);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .leaderboard-card:hover {
    border-color: var(--color-info-soft-border);
    background: color-mix(in srgb, var(--color-bg-subtle) 34%, transparent);
  }

  .leaderboard-card.user-template {
    border-color: var(--color-info-soft-border);
    background: color-mix(in srgb, var(--color-info-soft-wash) 70%, var(--color-bg-surface));
  }

  .leaderboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }

  .rank-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--color-info-soft-bg);
    border: 1px solid var(--color-info-soft-border);
    font-weight: var(--font-semibold);
    font-size: var(--text-body-sm);
    font-variant-numeric: tabular-nums;
    color: var(--color-info-soft-text);
  }

  .leaderboard-content {
    flex: 1;
    margin-bottom: var(--space-sm);
  }

  .template-name {
    font-family: var(--font-heading);
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-xs);
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-category {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin: 0;
  }

  .leaderboard-footer {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-shell-border-default);
  }

  /* Template metrics in leaderboard cards */
  .template-metrics {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px dashed var(--color-shell-border-default);
  }

  .metric-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .metric-row .metric-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .metric-row .metric-value {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .metric-row .metric-value.revenue {
    color: var(--color-success);
  }

  /* Sparkline container in leaderboard */
  .leaderboard-content .sparkline-container {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
  }

  .trend-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .trend-unavailable {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  /* Categories */
  .categories-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
    gap: var(--space-md);
  }

  .categories-header .section-title {
    margin: 0;
  }

  .view-toggle {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
  }

  .categories-controls {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    flex-wrap: wrap;
  }

  .filter-controls {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .control-input,
  .control-select {
    height: 2.5rem;
    padding: 0 0.9rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
  }

  .control-input {
    min-width: 14rem;
    flex: 1;
  }

  .control-select {
    min-width: 10rem;
  }

  .control-btn {
    height: 2.5rem;
    padding: 0 0.95rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      color var(--duration-micro) var(--ease-standard);
  }

  .control-btn:hover {
    border-color: var(--color-info-border);
    background: var(--color-bg-subtle);
    color: var(--color-fg-primary);
  }

  .grid-sort-controls {
    display: flex;
    gap: var(--space-xs);
  }

  .sort-direction-btn {
    min-width: 5.25rem;
  }

  .categories-meta {
    margin: 0 0 var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .categories-empty {
    padding: var(--space-md);
    border: 1px dashed var(--color-border-default);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    text-align: center;
  }

  .toggle-btn {
    padding: 0.46rem 0.84rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .toggle-btn:hover:not(.active) {
    color: var(--color-fg-secondary);
    background: var(--color-bg-subtle);
  }

  .toggle-btn.active {
    background: var(--color-info-soft-bg);
    color: var(--color-info-soft-text);
    border-color: var(--color-info-soft-border);
  }

  @media (max-width: 900px) {
    .grid-sort-controls {
      width: 100%;
    }

    .grid-sort-controls .control-select,
    .grid-sort-controls .control-btn {
      flex: 1;
    }
  }

  .table-container {
    max-height: min(68vh, 46rem);
    overflow: auto;
    scrollbar-gutter: stable;
    border: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    border-radius: var(--radius-sm);
    background: var(--color-bg-surface);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--color-border-default) 44%, transparent),
      inset 0 -1px 0 color-mix(in srgb, var(--color-border-default) 30%, transparent);
  }

  .data-table {
    width: 100%;
    min-width: 62rem;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
  }

  .data-table col.category-col {
    width: 36%;
  }

  .data-table col.rank-col {
    width: 9%;
  }

  .data-table col.active-col,
  .data-table col.sales-col {
    width: 12%;
  }

  .data-table col.revenue-col {
    width: 14%;
  }

  .data-table col.competition-col {
    width: 17%;
  }

  .data-table th,
  .data-table td {
    padding: 0.66rem 0.9rem;
    text-align: left;
    border-bottom: 1px solid color-mix(in srgb, var(--color-shell-border-default) 64%, transparent);
    vertical-align: middle;
  }

  .data-table th {
    position: sticky;
    top: 0;
    z-index: 3;
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-bg-pure));
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 84%, transparent);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--color-border-default) 50%, transparent);
    text-transform: uppercase;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .data-table th:first-child,
  .data-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--color-bg-surface);
    box-shadow: 1px 0 0 color-mix(in srgb, var(--color-border-default) 54%, transparent);
  }

  .data-table th:first-child {
    z-index: 4;
    background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-bg-pure));
  }

  .data-table th.right-head {
    text-align: right;
  }

  .data-table th.competition-head {
    text-align: left;
  }

  .table-sort-button {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-xs);
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    white-space: nowrap;
    cursor: pointer;
  }

  .table-sort-button:hover {
    color: var(--color-fg-secondary);
  }

  .table-sort-button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
    border-radius: var(--radius-xs);
  }

  .sort-icon {
    min-width: 0.7rem;
  }

  .data-table td {
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
    line-height: 1.35;
  }

  .data-table tbody tr:nth-child(even) td {
    background: color-mix(in srgb, var(--color-bg-subtle) 18%, transparent);
  }

  .data-table tbody tr:nth-child(even) td:first-child {
    background: color-mix(in srgb, var(--color-bg-subtle) 18%, var(--color-bg-surface));
  }

  .data-table tbody tr:hover {
    background: transparent;
  }

  .data-table tbody tr:hover td {
    background: color-mix(in srgb, var(--color-bg-subtle) 42%, var(--color-bg-surface));
  }

  .data-table tr:last-child td {
    border-bottom: none;
  }

  .data-table tr.user-row {
    background: color-mix(in srgb, var(--color-info-soft-wash) 48%, transparent);
  }

  .data-table tr.user-row td,
  .data-table tr.user-row td:first-child {
    background: color-mix(in srgb, var(--color-info-soft-wash) 48%, var(--color-bg-surface));
  }

  .data-table .center {
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .data-table .right {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .category-name {
    font-weight: var(--font-medium);
    display: inline-block;
    line-height: 1.25;
  }

  .category-stack {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .data-table .category-parent {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    line-height: 1.15;
  }

  .data-table .category-name {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    line-height: 1.22;
    overflow-wrap: anywhere;
  }

  .user-indicator {
    display: block;
    font-size: var(--text-caption);
    color: var(--color-info-soft-text);
    margin-top: 1px;
  }

  .rank-pill {
    display: inline-flex;
    padding: 0.22rem 0.5rem;
    background: transparent;
    border: 1px solid var(--color-info-soft-border);
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-info-soft-text);
    font-variant-numeric: tabular-nums;
  }

  .rank-value {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  .competition-cell {
    color: var(--color-fg-secondary);
  }

  .competition-value {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    min-width: 5.6rem;
    padding: 0.18rem 0.42rem;
    border: 1px solid color-mix(in srgb, var(--color-border-default) 58%, transparent);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-pure) 28%, transparent);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    line-height: 1;
  }

  .competition-dot {
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 999px;
    background: var(--color-info);
  }

  .competition-value.competition-low .competition-dot {
    background: var(--color-success);
  }

  .competition-value.competition-medium .competition-dot {
    background: var(--color-info);
  }

  .competition-value.competition-high .competition-dot {
    background: var(--color-warning);
  }

  .competition-value.competition-very-high .competition-dot {
    background: var(--color-error);
  }

  .revenue {
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  /* Grid View */
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-sm);
  }

  @media (max-width: 1200px) {
    .categories-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 768px) {
    .categories-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .categories-grid {
      grid-template-columns: 1fr;
    }
  }

  .category-card {
    display: flex;
    flex-direction: column;
    gap: 0.68rem;
    padding: 0.78rem;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-border-default) 70%, transparent);
    border-radius: var(--radius-sm);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .category-card.user-category {
    border-color: var(--color-info-soft-border);
    background: color-mix(in srgb, var(--color-info-soft-wash) 70%, var(--color-bg-surface));
  }

  .category-card:hover {
    border-color: var(--color-info-soft-border);
    background: color-mix(in srgb, var(--color-bg-subtle) 34%, transparent);
  }

  .category-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .category-info {
    display: flex;
    flex-direction: column;
  }

  .category-parent {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .category-info .category-name {
    font-family: var(--font-heading);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
  }

  .category-metric {
    display: flex;
    flex-direction: column;
  }

  .category-metric .metric-value {
    font-family: var(--font-heading);
    font-size: clamp(1.28rem, 1vw + 0.95rem, 1.7rem);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
  }

  .category-metric .metric-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .category-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .category-stats .stat {
    display: flex;
    flex-direction: column;
  }

  .category-stats .stat-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .category-stats .stat-value {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
  }

  :global(.competition-badge) {
    text-align: center;
  }

  /* Mobile Card Layout for Table View */
  .table-mobile-cards {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .table-desktop {
    display: none;
  }

  @media (min-width: 768px) {
    .table-mobile-cards {
      display: none;
    }

    .table-desktop {
      display: block;
    }
  }

  .table-mobile-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: 0.8rem;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--color-border-default) 70%, transparent);
    border-radius: var(--radius-sm);
  }

  .table-mobile-card.user-category {
    border-color: var(--color-info-soft-border);
    background: color-mix(in srgb, var(--color-info-soft-wash) 70%, var(--color-bg-surface));
  }

  .mobile-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .mobile-card-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mobile-card-title .category-parent {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .mobile-card-title .category-name {
    font-family: var(--font-heading);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
  }

  .mobile-card-metric {
    display: flex;
    flex-direction: column;
  }

  .mobile-card-metric .metric-value {
    font-family: var(--font-heading);
    font-size: clamp(1.28rem, 1vw + 0.95rem, 1.7rem);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
  }

  .mobile-card-metric .metric-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .mobile-card-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .mobile-stat {
    display: flex;
    flex-direction: column;
  }

  .mobile-stat .stat-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .mobile-stat .stat-value {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
  }

  /* Trend indicators for categories */
  .trend-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    padding: 0;
  }

  .trend-indicator.trend-up {
    color: var(--color-success);
  }

  .trend-indicator.trend-down {
    color: var(--color-error);
  }

  .trend-indicator.trend-neutral {
    color: var(--color-fg-muted);
  }

  .trend-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.75rem;
  }

  /* Category card footer */
  .category-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding-top: var(--space-sm);
    border-top: 1px solid var(--color-shell-border-default);
    margin-top: auto;
  }

  .user-indicator-badge {
    font-size: var(--text-caption);
    color: var(--color-info-soft-text);
    font-weight: var(--font-medium);
  }

  /* Enhanced category metric */
  .category-metric .metric-main {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
  }

  .category-metric .metric-main .metric-value {
    font-size: clamp(1.28rem, 1vw + 0.95rem, 1.7rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .leaderboard-card,
    .category-card,
    .table-mobile-card {
      transition: none;
    }
  }
</style>
