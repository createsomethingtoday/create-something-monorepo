<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from './ui';
  import KineticNumber from './KineticNumber.svelte';
  import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';
  import type { Asset } from '$lib/server/airtable';
  import { sortAssetTypes } from '$lib/utils/asset-actions';

  interface Props {
    assets: Asset[];
  }

  let { assets }: Props = $props();

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

  function getAssetTypeTheme(type: string): { accent: string } {
    const normalizedType = type.trim().toLowerCase();

    switch (normalizedType) {
      case 'app':
        return { accent: 'var(--color-data-1)' };
      case 'library':
        return { accent: 'var(--color-data-2)' };
      case 'template':
        return { accent: 'var(--color-data-3)' };
      default:
        return { accent: 'var(--color-data-4)' };
    }
  }

  const typeBreakdown = $derived.by(() => {
    const breakdown: Record<string, number> = {};

    for (const asset of assets) {
      const type = asset.type?.trim() || 'Other';
      breakdown[type] = (breakdown[type] || 0) + 1;
    }

    return sortAssetTypes(Object.keys(breakdown))
      .filter((type) => breakdown[type] > 0)
      .map((type) => {
        const count = breakdown[type];
        const share = assets.length === 0 ? 0 : (count / assets.length) * 100;

        return {
          type,
          count,
          share,
          percentage: Math.round(share),
          theme: getAssetTypeTheme(type)
        };
      });
  });

  const distributionAriaLabel = $derived.by(() => {
    if (typeBreakdown.length === 0) {
      return 'No assets in portfolio';
    }

    return `Portfolio distribution: ${typeBreakdown
      .map((entry) => `${entry.type} ${entry.count} ${entry.count === 1 ? 'asset' : 'assets'} ${entry.percentage}%`)
      .join(', ')}`;
  });

  function getAssetCountLabel(count: number): string {
    return count === 1 ? '1 asset' : `${count} assets`;
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

  <!-- Asset Distribution -->
  {#if typeBreakdown.length > 0}
    <section class="overview-panel overview-panel--distribution">
      <Card>
        <CardHeader>
          <div class="distribution-heading">
            <CardTitle>Portfolio Distribution</CardTitle>
            <span class="distribution-total-inline">{assets.length} total</span>
          </div>
        </CardHeader>
        <CardContent>
          <div class="distribution-stack">
            <div class="distribution-bar distribution-bar--stacked" role="img" aria-label={distributionAriaLabel}>
              {#each typeBreakdown as entry}
                <div
                  class="distribution-segment"
                  style="width: {entry.share}%; background-color: {entry.theme.accent}"
                  title={`${entry.type}: ${entry.count} ${entry.count === 1 ? 'asset' : 'assets'} (${entry.percentage}%)`}
                ></div>
              {/each}
            </div>

            <div class="distribution-list">
              {#each typeBreakdown as entry}
                <div class="distribution-item">
                  <div class="distribution-legend-row">
                    <div class="distribution-meta">
                      <span class="distribution-label" style="--distribution-color: {entry.theme.accent}"
                        >{entry.type}</span
                      >
                      <span class="distribution-count">{getAssetCountLabel(entry.count)}</span>
                    </div>
                    <span class="distribution-percentage">{entry.percentage}%</span>
                  </div>
                </div>
              {/each}
            </div>
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
    gap: 0.85rem;
  }

  .distribution-stack {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .distribution-item {
    display: block;
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

  .distribution-legend-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.9rem;
  }

  .distribution-meta {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex-wrap: wrap;
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
    background: var(--distribution-color, var(--color-fg-muted));
    transform: translateY(-50%);
  }

  .distribution-count {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
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
    width: 100%;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .distribution-bar--stacked {
    display: flex;
    height: 0.75rem;
  }

  .distribution-segment {
    height: 100%;
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

    .distribution-legend-row {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    .distribution-meta {
      gap: 0.35rem 0.75rem;
    }

    .distribution-percentage {
      min-width: 0;
      text-align: left;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-item,
    .distribution-segment {
      transition: none;
    }
  }
</style>
