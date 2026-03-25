<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from './ui';
  import KineticNumber from './KineticNumber.svelte';
  import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';
  import type { Asset } from '$lib/server/airtable';
  import { sortAssetStatuses } from '$lib/utils/asset-actions';
  import { getStatusColorTheme } from '$lib/utils/status-presentation';

  interface Props {
    assets: Asset[];
  }

  let { assets }: Props = $props();

  // Calculate stats by status
  const statusBreakdown = $derived.by(() => {
    const breakdown: Record<
      string,
      { count: number; viewers: number; purchases: number; revenue: number }
    > = {};

    for (const asset of assets) {
      const status = asset.status;
      if (!breakdown[status]) {
        breakdown[status] = { count: 0, viewers: 0, purchases: 0, revenue: 0 };
      }
      breakdown[status].count++;
      breakdown[status].viewers += asset.uniqueViewers || 0;
      breakdown[status].purchases += asset.cumulativePurchases || 0;
      breakdown[status].revenue += asset.cumulativeRevenue || 0;
    }

    return breakdown;
  });

  // Calculate totals
  const totals = $derived.by(() => {
    let viewers = 0;
    let purchases = 0;
    let revenue = 0;

    for (const asset of assets) {
      // Only count performance from Published and Delisted
      if (['Published', 'Delisted'].includes(asset.status)) {
        viewers += asset.uniqueViewers || 0;
        purchases += asset.cumulativePurchases || 0;
        revenue += asset.cumulativeRevenue || 0;
      }
    }

    return { viewers, purchases, revenue };
  });

  const sortedStatuses = $derived.by(() => {
    return sortAssetStatuses(Object.keys(statusBreakdown)).filter((status) => statusBreakdown[status]?.count > 0);
  });

  // Calculate percentage for visual bar
  function getPercentage(count: number): number {
    const total = assets.length;
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  function getStatusLabel(status: string, count: number): string {
    return `${status} ${count}`;
  }
</script>

<div class="overview-stats">
  <!-- Performance Summary -->
  {#if totals.viewers > 0 || totals.purchases > 0 || totals.revenue > 0}
    <section class="overview-panel overview-panel--performance">
      <Card>
        <CardHeader>
          <div class="header-with-indicator">
            <CardTitle>Portfolio Performance</CardTitle>
            <DataFreshnessIndicator variant="inline" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="performance-grid">
            <div class="performance-item">
              <div class="performance-content">
                <span class="performance-value"><KineticNumber value={totals.viewers} /></span>
                <span class="performance-label">Total Viewers</span>
              </div>
            </div>

            <div class="performance-item">
              <div class="performance-content">
                <span class="performance-value"><KineticNumber value={totals.purchases} /></span>
                <span class="performance-label">Total Purchases</span>
              </div>
            </div>

            <div class="performance-item">
              <div class="performance-content">
                <span class="performance-value"
                  ><KineticNumber value={totals.revenue} prefix="$" /></span
                >
                <span class="performance-label">Total Revenue</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  {/if}

  <!-- Status Distribution -->
  {#if sortedStatuses.length > 0}
    <section class="overview-panel overview-panel--distribution">
      <Card>
        <CardHeader>
          <div class="distribution-heading">
            <CardTitle>Portfolio Distribution</CardTitle>
            <span class="distribution-total-inline">{assets.length} total</span>
          </div>
        </CardHeader>
        <CardContent>
          <div class="distribution-list">
            {#each sortedStatuses as status}
              {@const data = statusBreakdown[status]}
              {@const percentage = getPercentage(data.count)}
              {@const theme = getStatusColorTheme(status)}
              <div class="distribution-item">
                <div class="distribution-meta">
                  <span class="distribution-label" style="--status-color: {theme.accent}"
                    >{getStatusLabel(status, data.count)}</span
                  >
                  <span class="distribution-count"
                    >{data.count === 1 ? '1 template' : `${data.count} templates`}</span
                  >
                </div>
                <div class="distribution-track-row">
                  <div class="distribution-bar" aria-hidden="true">
                    <div
                      class="distribution-fill"
                      style="width: {percentage}%; background-color: {theme.accent}"
                    ></div>
                  </div>
                  <span class="distribution-percentage">{percentage}%</span>
                </div>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </section>
  {/if}
</div>

<style>
  .overview-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .overview-panel {
    width: 100%;
  }

  .header-with-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    width: 100%;
  }

  .performance-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem 1.5rem;
  }

  .performance-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-height: 4.5rem;
    padding: 0.25rem 0;
    background: transparent;
    border: none;
    border-radius: 0;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .performance-item:not(:first-child) {
    padding-left: 1.5rem;
    border-left: 1px solid var(--color-shell-border-default);
  }

  .performance-item:hover {
    background: transparent;
  }

  .performance-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .performance-value {
    font-family: var(--font-heading);
    font-size: clamp(1.15rem, 1vw + 0.75rem, 1.5rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  .performance-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .distribution-list {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .distribution-item {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .distribution-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .distribution-total-inline {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.03em;
  }

  .distribution-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .distribution-label {
    position: relative;
    padding-left: 0.75rem;
    font-size: 0.98rem;
    color: var(--color-fg-primary);
    font-weight: var(--font-medium);
  }

  .distribution-label::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 999px;
    background: var(--status-color, var(--color-fg-muted));
    transform: translateY(-50%);
  }

  .distribution-count {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .distribution-track-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
  }

  .distribution-percentage {
    min-width: 2.7rem;
    text-align: right;
    font-size: 1rem;
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .distribution-bar {
    height: 0.36rem;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .distribution-fill {
    height: 100%;
    border-radius: var(--radius-full);
    transition: width var(--duration-standard) var(--ease-standard);
  }

  @media (max-width: 900px) {
    .performance-grid {
      grid-template-columns: 1fr;
    }

    .performance-item:not(:first-child) {
      padding-left: 0;
      padding-top: 1rem;
      border-left: none;
      border-top: 1px solid var(--color-shell-border-default);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-item,
    .distribution-fill {
      transition: none;
    }
  }
</style>
