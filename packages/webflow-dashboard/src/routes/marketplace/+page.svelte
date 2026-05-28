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
  let summary = $state<LeaderboardResponse['summary']>({
    totalMarketplaceSales: 0,
    userBestRank: null,
    lastUpdated: '',
    nextUpdateDate: undefined,
    isFreshnessEstimated: true
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

      // Use categories-based total sales (all marketplace) instead of
      // leaderboard total (top 50 only). This matches v1 behavior and gives
      // a more accurate marketplace-wide picture.
      summary = {
        ...leaderboardData.summary,
        totalMarketplaceSales:
          categoriesData.summary?.totalSales ?? leaderboardData.summary.totalMarketplaceSales
      };

      trackEvent('marketplace_data_loaded', {
        leaderboard_count: leaderboardData.leaderboard.length,
        user_template_count: leaderboardData.userTemplates.length,
        category_rows: categoriesData.categories.length,
        total_sales_30d: summary.totalMarketplaceSales
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
    const params = new URLSearchParams(window.location.search);
    trackEvent('marketplace_opened', {
      has_user: Boolean(data.user?.email),
      referrer: document.referrer ? new URL(document.referrer).pathname : null,
      utm_source: params.get('utm_source')
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
            Weekly marketplace snapshot with 30-day performance data
          </p>
          <div class="marketplace-evidence" aria-label="Marketplace evidence">
            <span><strong>30-day window</strong> for category and template performance</span>
            <span><strong>Portfolio categories first</strong> to find relevant signal quickly</span>
            <span><strong>Weekly refresh</strong> for comparative market context</span>
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
                  Data refreshes weekly on Mondays at 4 PM UTC with a rolling 30-day sales window.
                  Last update timestamp is estimated from the schedule.
                {:else if summary.freshnessSource === 'airtable-record-created-time'}
                  Data refreshes weekly on Mondays at 4 PM UTC. Timestamp is inferred from Airtable
                  record creation metadata.
                {:else}
                  Data refreshes weekly on Mondays at 4 PM UTC with a rolling 30-day sales window.
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
        <div class="loading-container">
          <div class="loading-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
          <p>Loading marketplace insights...</p>
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

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    color: var(--color-fg-secondary);
  }

  .loading-dots {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--color-info);
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
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
