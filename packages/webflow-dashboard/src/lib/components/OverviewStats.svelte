<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from './ui';
  import KineticNumber from './KineticNumber.svelte';
  import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';
  import type { Asset } from '$lib/server/airtable';
  import { VIEWER_DATA_AVAILABLE, VIEWER_DATA_EPOCH_LABEL } from '$lib/config/viewer-data';
  import { sortAssetTypes } from '$lib/utils/asset-actions';
  import { grow, reveal } from '$lib/motion/actions';
  import { DUR, gsap, motionOK } from '$lib/motion/core';

  interface Props {
    assets: Asset[];
    /** Render one panel only, so a page can place the two in different columns. */
    panel?: 'both' | 'performance' | 'distribution';
  }

  let { assets, panel = 'both' }: Props = $props();

  // Calculate totals
  const totals = $derived.by(() => {
    let viewers = 0;
    let purchases = 0;
    let revenue = 0;
    let fulfillment = 0;

    for (const asset of assets) {
      // Only count performance from Published and Delisted
      if (['Published', 'Delisted'].includes(asset.status)) {
        viewers += asset.uniqueViewers || 0;
        purchases += asset.cumulativePurchases || 0;
        revenue += asset.cumulativeRevenue || 0;
        fulfillment += asset.fulfillmentLinkSales || 0;
      }
    }

    return { viewers, purchases, revenue, fulfillment };
  });

  // Categories get distinct hues from the data palette, as before: a
  // breakdown by type is categorical, so a single-hue ramp would imply an order.
  function getAssetTypeTheme(type: string): { accent: string } {
    switch (type.trim().toLowerCase()) {
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

  const hasPerformance = $derived(
    (VIEWER_DATA_AVAILABLE && totals.viewers > 0) ||
      totals.purchases > 0 ||
      totals.revenue > 0 ||
      totals.fulfillment > 0
  );

  // Hover: a bar segment and its legend row are one thing, so they light up together.
  let distributionEl = $state<HTMLElement | null>(null);

  function focusType(type: string | null) {
    if (!distributionEl) return;
    const parts = distributionEl.querySelectorAll<HTMLElement>('[data-type]');
    const duration = motionOK() ? DUR.fast : 0;
    parts.forEach((part) => {
      const dimmed = type !== null && part.dataset.type !== type;
      const isSegment = part.classList.contains('distribution-segment');
      gsap.to(part, {
        opacity: dimmed ? (isSegment ? 0.3 : 0.55) : 1,
        // The matching bar segment swells, so the eye lands on it.
        scaleY: isSegment && type !== null && !dimmed ? 1.25 : 1,
        duration,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  }
</script>

<div
  class="overview-stats"
  class:overview-stats--split={panel === 'both' && hasPerformance && typeBreakdown.length > 0}
>
  <!-- Performance Summary -->
  {#if hasPerformance && panel !== 'distribution'}
    <section class="overview-panel overview-panel--performance" data-reveal use:reveal>
      <Card interactive>
        <CardHeader>
          <div class="header-with-indicator">
            <CardTitle>Portfolio Performance</CardTitle>
            <DataFreshnessIndicator variant="inline" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="performance-grid">
            {#if VIEWER_DATA_AVAILABLE}
              <div class="performance-item">
                <span class="performance-value"><KineticNumber value={totals.viewers} /></span>
                <span class="performance-label">Viewers {VIEWER_DATA_EPOCH_LABEL}</span>
              </div>
            {/if}

            <div class="performance-item">
              <span class="performance-value"><KineticNumber value={totals.purchases} /></span>
              <span class="performance-label">Total purchases</span>
              {#if totals.fulfillment > 0}
                <span class="performance-support"
                  >+{totals.fulfillment.toLocaleString()} through fulfillment links</span
                >
              {/if}
            </div>

            <div class="performance-item">
              <span class="performance-value"
                ><KineticNumber value={totals.revenue} prefix="$" /></span
              >
              <span class="performance-label">Total revenue</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  {/if}

  <!-- Asset Distribution -->
  {#if typeBreakdown.length > 0 && panel !== 'performance'}
    <section class="overview-panel overview-panel--distribution" data-reveal use:reveal>
      <Card interactive>
        <CardHeader>
          <div class="distribution-heading">
            <CardTitle>Portfolio Distribution</CardTitle>
            <span class="distribution-total-inline">{assets.length} total</span>
          </div>
        </CardHeader>
        <CardContent>
          <div
            class="distribution-stack"
            role="group"
            aria-label="Portfolio distribution by asset type"
            bind:this={distributionEl}
            onpointerover={(event) =>
              focusType(
                (event.target as HTMLElement).closest<HTMLElement>('[data-type]')?.dataset.type ?? null
              )}
            onpointerleave={() => focusType(null)}
          >
            <div
              class="distribution-bar distribution-bar--stacked"
              role="img"
              aria-label={distributionAriaLabel}
              use:grow={{ children: '.distribution-segment' }}
            >
              {#each typeBreakdown as entry}
                <div
                  class="distribution-segment"
                  data-type={entry.type}
                  style="width: {entry.share}%; background-color: {entry.theme.accent}"
                  title={`${entry.type}: ${entry.count} ${entry.count === 1 ? 'asset' : 'assets'} (${entry.percentage}%)`}
                ></div>
              {/each}
            </div>

            <ul class="distribution-list">
              {#each typeBreakdown as entry}
                <li class="distribution-item" data-type={entry.type}>
                  <span class="distribution-label" style="--distribution-color: {entry.theme.accent}"
                    >{entry.type}</span
                  >
                  <span class="distribution-count"
                    >{entry.count} · <strong>{entry.percentage}%</strong></span
                  >
                </li>
              {/each}
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  {/if}
</div>

<style>
  .overview-stats {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);
  }

  .overview-stats:empty {
    display: none;
  }

  /* Both panels present: share one row so the asset list starts sooner. */
  .overview-stats--split {
    grid-template-columns: minmax(0, 1.75fr) minmax(19rem, 1fr);
  }

  .overview-panel {
    display: flex;
    min-width: 0;
  }

  .overview-panel :global(.card) {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  /* The figures sit in the middle of whatever height the row gives the card. */
  .overview-panel--performance :global(.card-content) {
    display: flex;
    flex: 1;
    align-items: center;
  }

  .overview-panel--performance .performance-grid {
    flex: 1;
    padding-top: 0;
  }

  .header-with-indicator,
  .distribution-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    width: 100%;
  }

  .performance-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 1rem 0;
    padding-top: 0.35rem;
  }

  .performance-item {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-inline: 1.5rem;
    border-left: 1px solid var(--color-shell-border-default);
  }

  .performance-item:first-child {
    padding-left: 0;
    border-left: 0;
  }

  /* The headline figures of the page: larger than any other number on it. */
  .performance-value {
    font-family: var(--font-heading);
    font-size: clamp(1.75rem, 1.3vw + 1.1rem, 2.4rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    letter-spacing: 0.005em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .performance-label {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .performance-support {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .distribution-total-inline {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .distribution-stack {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding-top: 0.35rem;
  }

  .distribution-bar {
    width: 100%;
  }

  .distribution-bar--stacked {
    display: flex;
    gap: 3px;
    height: 0.7rem;
  }

  .distribution-segment {
    height: 100%;
    min-width: 0.35rem;
    border-radius: 2px;
  }

  .distribution-segment:first-child {
    border-radius: 999px 2px 2px 999px;
  }

  .distribution-segment:last-child {
    border-radius: 2px 999px 999px 2px;
  }

  /* Legend on one line: each type with its count and share. */
  .distribution-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .distribution-item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .distribution-label {
    position: relative;
    padding-left: 0.85rem;
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
    font-weight: var(--font-medium);
  }

  .distribution-label::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--distribution-color, var(--color-fg-muted));
    transform: translateY(-50%);
  }

  .distribution-count {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .distribution-count strong {
    color: var(--color-fg-secondary);
    font-weight: var(--font-semibold);
  }

  @media (max-width: 1100px) {
    .overview-stats--split {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 640px) {
    .performance-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .performance-item,
    .performance-item:first-child {
      padding: 0.9rem 0;
      border-left: 0;
      border-top: 1px solid var(--color-shell-border-default);
    }

    .performance-item:first-child {
      padding-top: 0;
      border-top: 0;
    }
  }
</style>
