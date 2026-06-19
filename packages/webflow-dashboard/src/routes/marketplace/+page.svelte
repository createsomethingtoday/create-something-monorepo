<script lang="ts">
  import { onMount } from 'svelte';
  import { Header, Button, BackNavigation } from '$lib/components';
  import { trackEvent } from '$lib/utils/analytics';
  import MarketplaceInsights from '$lib/components/MarketplaceInsights.svelte';
  import { AlertCircle } from 'lucide-svelte';
  import type { PageData } from './$types';

  interface LeaderboardEntry {
    templateName: string;
    category: string;
    totalSales30d: number;
    totalRevenue30d?: number;
    salesRank: number;
    revenueRank: number;
    isUserTemplate: boolean;
  }

  interface CategoryEntry {
    category: string;
    subcategory: string;
    templatesInSubcategory: number;
    totalSales30d: number;
    totalRevenue30d: number;
    avgRevenuePerTemplate: number;
    revenueRank: number;
  }

  interface Insight {
    type: 'opportunity' | 'trend' | 'warning';
    message: string;
  }

  interface LeaderboardResponse {
    leaderboard: LeaderboardEntry[];
    userTemplates: LeaderboardEntry[];
    summary: {
      totalMarketplaceSales: number;
      userBestRank: number | null;
      lastUpdated: string;
      nextUpdateDate?: string;
      expectedLastSyncTime?: string;
      syncSchedule?: string;
      dataWindow?: string;
      timeUntilNextSync?: string;
      freshnessSource?: 'schedule-estimate' | 'airtable-field' | 'airtable-record-created-time';
      isFreshnessEstimated?: boolean;
      isStale?: boolean;
      staleSinceHours?: number | null;
    };
  }

  type MarketplaceSalesSource =
    | 'category-performance'
    | 'leaderboard-top-50'
    | 'unavailable';

  type MarketplaceSummary = Omit<LeaderboardResponse['summary'], 'totalMarketplaceSales'> & {
    totalMarketplaceSales: number | null;
    salesSource: MarketplaceSalesSource;
    dataWarning?: string | null;
  };

  interface CategoriesResponse {
    categories: CategoryEntry[];
    insights: Insight[];
    summary: {
      totalCategories: number;
      totalTemplates: number;
      totalSales: number;
      totalRevenue: number;
      avgRevenue: number;
      lastUpdated: string;
      nextUpdate: string;
      expectedLastSyncTime?: string;
      syncSchedule: string;
      dataWindow: string;
      timeUntilNextSync: string;
      freshnessSource?: 'schedule-estimate' | 'airtable-field' | 'airtable-record-created-time';
      isFreshnessEstimated?: boolean;
      isStale?: boolean;
      staleSinceHours?: number | null;
    };
  }

  let { data }: { data: PageData } = $props();

  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let leaderboard = $state<LeaderboardEntry[]>([]);
  let categories = $state<CategoryEntry[]>([]);
  let insights = $state<Insight[]>([]);
  let userTemplates = $state<LeaderboardEntry[]>([]);
  let summary = $state<MarketplaceSummary>({
    totalMarketplaceSales: null,
    userBestRank: null,
    lastUpdated: '',
    nextUpdateDate: undefined,
    isFreshnessEstimated: true,
    salesSource: 'unavailable',
    dataWarning: null
  });

  /**
   * Format the last updated timestamp
   */
  function formatLastUpdated(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Format the next update date
   */
  function formatNextUpdate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatAbsoluteDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function buildMarketplaceSummary(
    leaderboardData: LeaderboardResponse,
    categoriesData: CategoriesResponse
  ): MarketplaceSummary {
    const categorySummary = categoriesData.summary;
    const categoryRows = categoriesData.categories.length;
    const leaderboardRows = leaderboardData.leaderboard.length;
    const categoryTotal = categorySummary?.totalSales ?? 0;
    const leaderboardTotal = leaderboardData.summary.totalMarketplaceSales ?? 0;

    const categoryFreshness = categorySummary
      ? {
          lastUpdated: categorySummary.lastUpdated,
          nextUpdateDate: categorySummary.nextUpdate,
          expectedLastSyncTime: categorySummary.expectedLastSyncTime,
          syncSchedule: categorySummary.syncSchedule,
          dataWindow: categorySummary.dataWindow,
          timeUntilNextSync: categorySummary.timeUntilNextSync,
          freshnessSource: categorySummary.freshnessSource,
          isFreshnessEstimated: categorySummary.isFreshnessEstimated,
          isStale: categorySummary.isStale,
          staleSinceHours: categorySummary.staleSinceHours
        }
      : {};

    const freshness =
      categoryRows > 0 || categorySummary?.freshnessSource === 'airtable-field'
        ? categoryFreshness
        : {};

    const baseSummary: MarketplaceSummary = {
      ...leaderboardData.summary,
      ...freshness,
      totalMarketplaceSales: null,
      salesSource: 'unavailable',
      dataWarning:
        'Marketplace sales snapshot is unavailable; zero is not shown because the source snapshot is empty.'
    };

    if (categoryRows > 0 && categoryTotal > 0) {
      return {
        ...baseSummary,
        totalMarketplaceSales: categoryTotal,
        salesSource: 'category-performance',
        dataWarning: null
      };
    }

    if (leaderboardRows > 0 && leaderboardTotal > 0) {
      return {
        ...baseSummary,
        totalMarketplaceSales: leaderboardTotal,
        salesSource: 'leaderboard-top-50',
        dataWarning:
          categoryRows > 0
            ? 'Category performance snapshot has no sales total; showing top-50 leaderboard total until the category feed is repaired.'
            : 'Category performance snapshot is empty; showing top-50 leaderboard total until the category feed refreshes.'
      };
    }

    return baseSummary;
  }

  $effect(() => {
    loadData();
  });

  async function loadData() {
    isLoading = true;
    error = null;

    try {
      const [leaderboardRes, categoriesRes] = await Promise.all([
        fetch('/api/analytics/leaderboard', { cache: 'no-store' }),
        fetch('/api/analytics/categories', { cache: 'no-store' })
      ]);

      if (!leaderboardRes.ok || !categoriesRes.ok) {
        throw new Error('Failed to load marketplace data');
      }

      const leaderboardData = (await leaderboardRes.json()) as LeaderboardResponse;
      const categoriesData = (await categoriesRes.json()) as CategoriesResponse;

      leaderboard = leaderboardData.leaderboard;
      userTemplates = leaderboardData.userTemplates;
      categories = categoriesData.categories;
      insights = categoriesData.insights;

      summary = buildMarketplaceSummary(leaderboardData, categoriesData);

      trackEvent('marketplace_data_loaded', {
        leaderboard_count: leaderboardData.leaderboard.length,
        user_template_count: leaderboardData.userTemplates.length,
        category_rows: categoriesData.categories.length,
        total_sales_30d: summary.totalMarketplaceSales ?? undefined,
        total_sales_source: summary.salesSource,
        data_warning: summary.dataWarning ?? undefined
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';

      trackEvent('marketplace_data_load_failed', {
        error_message: error
      });
    } finally {
      isLoading = false;
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  onMount(() => {
    trackEvent('marketplace_opened', {
      has_user: Boolean(data.user?.email)
    });
  });
</script>

<svelte:head>
  <title>Marketplace Insights | Webflow Asset Dashboard</title>
</svelte:head>

<div class="marketplace-page">
  <Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

  <main class="main-content">
    <div class="content-wrapper">
      <BackNavigation />

      <!-- Header -->
      <div class="page-header page-intro">
        <div class="header-content">
          <h1 class="page-title page-intro__title">Marketplace Insights</h1>
          <p class="page-subtitle page-intro__subtitle">
            Marketplace performance snapshot with 30-day data
          </p>
          <div class="marketplace-evidence" aria-label="Marketplace evidence">
            <span><strong>30-day window</strong> for category and template performance</span>
            <span><strong>Portfolio categories first</strong> to find relevant signal quickly</span>
            <span><strong>Source freshness</strong> shown from sync metadata when available</span>
          </div>
          {#if summary.lastUpdated}
            <div class="sync-info-container">
              <p class="sync-info">
                <span class="sync-text">
                  {summary.isFreshnessEstimated ? 'Last expected update:' : 'Last updated:'}
                  <strong>{formatLastUpdated(summary.lastUpdated)}</strong>
                  {#if summary.nextUpdateDate}
                    <span class="next-update"
                      >• Next update: {formatNextUpdate(summary.nextUpdateDate)}</span
                    >
                  {/if}
                </span>
              </p>
              <p class="sync-note">
                {#if summary.isFreshnessEstimated}
                  Data uses a rolling 30-day sales window. Last update timestamp is estimated from
                  the configured source schedule.
                {:else if summary.freshnessSource === 'airtable-record-created-time'}
                  Data uses a rolling 30-day sales window. Timestamp is inferred from Airtable
                  record creation metadata.
                {:else}
                  Data uses a rolling 30-day sales window. Latest source timestamp comes from
                  Airtable sync data.
                {/if}
              </p>
              {#if summary.isStale && summary.expectedLastSyncTime}
                <p class="sync-warning">
                  <AlertCircle size={12} />
                  Data appears stale. Expected refresh: {formatAbsoluteDate(
                    summary.expectedLastSyncTime
                  )}.
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <aside class="data-scope-notice" aria-label="Data scope">
        <div class="notice-content">
          <p class="notice-title">About this data</p>
          <p class="notice-text">
            This view tracks <strong>categories and templates with recent sales activity</strong>, not
            the full marketplace inventory, so the fastest path is to filter down to your portfolio
            categories first.
          </p>
        </div>
      </aside>

      <!-- Content -->
      {#if isLoading}
        <!-- Skeleton mirrors the insights layout so content lands without a jolt -->
        <div class="skeleton-layout" role="status" aria-label="Loading marketplace insights">
          <div class="skeleton-stats">
            {#each Array(4) as _, i (i)}
              <div class="skeleton-card">
                <div class="skeleton-line skeleton-line--label"></div>
                <div class="skeleton-line skeleton-line--value"></div>
              </div>
            {/each}
          </div>
          <div class="skeleton-table">
            <div class="skeleton-line skeleton-line--heading"></div>
            {#each Array(8) as _, i (i)}
              <div class="skeleton-row">
                <div class="skeleton-line skeleton-line--wide"></div>
                <div class="skeleton-line skeleton-line--narrow"></div>
                <div class="skeleton-line skeleton-line--narrow"></div>
              </div>
            {/each}
          </div>
          <span class="visually-hidden">Loading marketplace insights...</span>
        </div>
      {:else if error}
        <div class="error-container">
          <AlertCircle size={20} />
          <div>
            <p class="error-title">Failed to load marketplace insights</p>
            <p class="error-message">{error}</p>
            <Button variant="secondary" onclick={loadData}>Try Again</Button>
          </div>
        </div>
      {:else}
        <MarketplaceInsights {leaderboard} {categories} {insights} {userTemplates} {summary} />
      {/if}
    </div>
  </main>
</div>

<style>
  .marketplace-page {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .main-content {
    padding: var(--space-lg) var(--space-md);
  }

  .content-wrapper {
    max-width: var(--layout-content-max-width);
    margin: 0 auto;
  }

  .sync-info-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
  }

  .marketplace-evidence {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.9rem;
    margin-top: 0.7rem;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .marketplace-evidence strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .sync-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0;
  }

  .sync-info :global(svg) {
    flex-shrink: 0;
    color: var(--color-info);
  }

  .sync-text {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  .sync-text strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .next-update {
    color: var(--color-fg-muted);
  }

  .sync-note {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0;
    max-width: 72ch;
    line-height: 1.4;
  }

  .sync-warning {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-caption);
    color: var(--color-warning);
    margin: 0;
    max-width: 84ch;
  }

  .skeleton-layout {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .skeleton-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: var(--space-sm);
  }

  .skeleton-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .skeleton-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .skeleton-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-sm);
  }

  .skeleton-line {
    height: 0.85rem;
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      var(--color-bg-subtle, rgba(255, 255, 255, 0.06)) 25%,
      var(--color-hover, rgba(255, 255, 255, 0.12)) 50%,
      var(--color-bg-subtle, rgba(255, 255, 255, 0.06)) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  .skeleton-line--label {
    width: 45%;
  }

  .skeleton-line--value {
    width: 65%;
    height: 1.4rem;
  }

  .skeleton-line--heading {
    width: 30%;
    height: 1.1rem;
    margin-bottom: var(--space-xs);
  }

  .skeleton-line--wide {
    width: 100%;
  }

  .skeleton-line--narrow {
    width: 70%;
    justify-self: end;
  }

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-line {
      animation: none;
    }
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .error-container {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-error-muted);
    border: 1px solid var(--color-error-border);
    border-radius: var(--radius-lg);
  }

  .error-container :global(svg) {
    color: var(--color-error);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .error-title {
    font-weight: var(--font-medium);
    color: var(--color-error);
    margin: 0 0 var(--space-xs);
  }

  .error-message {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-sm);
  }

  .data-scope-notice {
    padding: 0.7rem 0;
    border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    background: transparent;
    margin-bottom: var(--space-md);
  }

  .notice-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    max-width: 84ch;
  }

  .notice-title {
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0;
  }

  .notice-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .notice-text strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-medium);
  }
</style>
