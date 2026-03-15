<script lang="ts">
  /**
   * StatsBar - Tufte-inspired high-density metrics display
   *
   * Shows key metrics in a compact horizontal bar with real sparkline trends.
   * Maximizes data-ink ratio by eliminating decorative elements.
   *
   * Sparklines show real data from /api/analytics/history when available,
   * gracefully showing no sparklines if history not yet collected.
   */
  import { onMount } from 'svelte';
  import Sparkline from './Sparkline.svelte';
  import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';
  import type { Asset } from '$lib/server/airtable';
  import { formatCompactCurrency, formatCompactNumber } from '$lib/utils/format';

  interface Props {
    assets: Asset[];
  }

  let { assets }: Props = $props();

  // Real historical trend data (fetched from API)
  let viewersTrend = $state<number[]>([]);
  let revenueTrend = $state<number[]>([]);
  let historyLoaded = $state(false);

  // Type for aggregate history API response
  interface AggregateHistoryResponse {
    snapshots: Array<{
      total_viewers: number;
      total_revenue: number;
    }>;
    days_available: number;
  }

  // Fetch aggregate historical data on mount
  onMount(async () => {
    try {
      const response = await fetch('/api/analytics/history?days=14');
      if (response.ok) {
        const data: AggregateHistoryResponse = await response.json();
        if (data.snapshots && data.snapshots.length > 0) {
          // Extract trend arrays from snapshots (already in chronological order)
          viewersTrend = data.snapshots.map((s) => s.total_viewers);
          revenueTrend = data.snapshots.map((s) => s.total_revenue);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch aggregate analytics history:', err);
    }
    historyLoaded = true;
  });

  // Calculate core metrics
  const metrics = $derived.by(() => {
    const published = assets.filter((a) => a.status === 'Published');
    const pending = assets.filter((a) => ['Upcoming', 'Scheduled'].includes(a.status));

    let totalViewers = 0;
    let totalPurchases = 0;
    let totalRevenue = 0;

    for (const asset of published) {
      totalViewers += asset.uniqueViewers || 0;
      totalPurchases += asset.cumulativePurchases || 0;
      totalRevenue += asset.cumulativeRevenue || 0;
    }

    // Conversion rate (viewers → purchases)
    const conversionRate = totalViewers > 0 ? (totalPurchases / totalViewers) * 100 : 0;

    // Average revenue per template
    const avgRevenue = published.length > 0 ? totalRevenue / published.length : 0;

    return {
      publishedCount: published.length,
      pendingCount: pending.length,
      totalCount: assets.length,
      totalViewers,
      totalPurchases,
      totalRevenue,
      conversionRate,
      avgRevenue
    };
  });

</script>

<div class="stats-bar">
  <div class="stat-group templates">
    <span class="stat-main">{metrics.publishedCount}</span>
    <span class="stat-label">published</span>
    {#if metrics.pendingCount > 0}
      <span class="stat-secondary">+{metrics.pendingCount} pending</span>
    {/if}
  </div>

  <div class="stat-divider"></div>

  <div class="stat-group viewers">
    <span class="stat-main">{formatCompactNumber(metrics.totalViewers)}</span>
    <span class="stat-label">viewers</span>
    {#if historyLoaded && viewersTrend.length >= 2}
      <Sparkline data={viewersTrend} color="var(--color-info)" showTrend />
    {/if}
  </div>

  <div class="stat-divider"></div>

  <div class="stat-group purchases">
    <span class="stat-main">{formatCompactNumber(metrics.totalPurchases)}</span>
    <span class="stat-label">purchases</span>
    <DataFreshnessIndicator variant="tooltip" />
    <span class="stat-secondary conversion">
      {metrics.conversionRate.toFixed(1)}% conv
    </span>
  </div>

  <div class="stat-divider"></div>

  <div class="stat-group revenue">
    <span class="stat-main">{formatCompactCurrency(metrics.totalRevenue)}</span>
    <span class="stat-label">revenue</span>
    <DataFreshnessIndicator variant="tooltip" />
    {#if historyLoaded && revenueTrend.length >= 2}
      <Sparkline data={revenueTrend} color="var(--color-success)" showTrend filled />
    {/if}
  </div>

  {#if metrics.avgRevenue > 0}
    <div class="stat-divider"></div>
    <div class="stat-group avg">
      <span class="stat-main">{formatCompactCurrency(metrics.avgRevenue)}</span>
      <span class="stat-label">avg/template</span>
    </div>
  {/if}
</div>

<style>
  .stats-bar {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: 1rem 1.25rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow-x: auto;
  }

  .stat-group {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
  }

  .stat-main {
    font-family: var(--font-heading);
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    opacity: 0.78;
  }

  .stat-secondary {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    opacity: 0.64;
  }

  .stat-secondary.conversion {
    font-variant-numeric: tabular-nums;
  }

  .stat-divider {
    width: 1px;
    height: 1.5rem;
    background: var(--color-shell-border-default);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .stats-bar {
      flex-wrap: wrap;
      gap: var(--space-sm);
    }

    .stat-divider {
      display: none;
    }

    .stat-group {
      min-width: calc(50% - var(--space-sm));
    }
  }
</style>
