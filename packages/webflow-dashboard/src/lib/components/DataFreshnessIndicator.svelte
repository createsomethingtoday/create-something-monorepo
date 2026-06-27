<script lang="ts">
  /**
   * DataFreshnessIndicator - Shows that financial data is from a weekly snapshot
   *
   * Use this component wherever cumulative financial data (revenue, purchases) is displayed
   * to set clear expectations about data freshness and update schedule.
   *
   * Variants:
   * - 'inline': Compact inline badge for table headers and stat cards
   * - 'tooltip': Icon-only with hover tooltip (fixed position, never clipped)
   * - 'full': Full message with icon (for page headers)
  */
  import { Info, Clock, X } from 'lucide-svelte';
  import { formatRelativeScheduleDate } from '$lib/utils/format';

  interface Props {
    variant?: 'inline' | 'tooltip' | 'full';
    showSchedule?: boolean;
  }

  let { variant = 'inline', showSchedule = false }: Props = $props();

  // Tooltip state for fixed-position tooltip
  let showTooltip = $state(false);
  let tooltipPosition = $state({ top: 0, left: 0 });
  let tooltipElement = $state<HTMLDivElement | null>(null);
  let triggerRect: DOMRect | null = null;

  function handleClick(e: MouseEvent) {
    triggerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    tooltipPosition = {
      top: triggerRect.bottom + 8,
      left: triggerRect.left + triggerRect.width / 2
    };
    showTooltip = !showTooltip;
  }

  // After the tooltip renders, clamp it to the viewport: flip above the
  // trigger when there's no room below, and keep it from running off either edge.
  $effect(() => {
    if (!showTooltip || !tooltipElement || !triggerRect) return;

    const margin = 12;
    const rect = tooltipElement.getBoundingClientRect();

    let top = triggerRect.bottom + 8;
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, triggerRect.top - 8 - rect.height);
    }

    const preferredLeft = triggerRect.left + triggerRect.width / 2 - rect.width / 2;
    const clampedLeft = Math.min(
      Math.max(preferredLeft, margin),
      Math.max(margin, window.innerWidth - margin - rect.width)
    );

    tooltipPosition = { top, left: clampedLeft + rect.width / 2 };
  });

  function closeTooltip() {
    showTooltip = false;
  }

  // Calculate next Monday 4 PM UTC
  function getNextUpdateInfo(): { lastUpdate: string; nextUpdate: string; daysUntil: number } {
    const now = new Date();
    const currentDay = now.getUTCDay();
    const currentHour = now.getUTCHours();

    // Calculate days until next Monday 4 PM UTC
    let daysUntilMonday: number;
    if (currentDay === 1) {
      daysUntilMonday = currentHour < 16 ? 0 : 7;
    } else if (currentDay === 0) {
      daysUntilMonday = 1;
    } else {
      daysUntilMonday = 8 - currentDay;
    }

    // Calculate last Monday
    let daysSinceLastMonday: number;
    if (currentDay === 1 && currentHour >= 16) {
      daysSinceLastMonday = 0;
    } else if (currentDay === 1) {
      daysSinceLastMonday = 7;
    } else if (currentDay === 0) {
      daysSinceLastMonday = 6;
    } else {
      daysSinceLastMonday = currentDay - 1;
    }

    const lastMonday = new Date(now);
    lastMonday.setUTCDate(now.getUTCDate() - daysSinceLastMonday);
    lastMonday.setUTCHours(16, 0, 0, 0);

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(16, 0, 0, 0);

    return {
      lastUpdate: formatRelativeScheduleDate(lastMonday),
      nextUpdate: formatRelativeScheduleDate(nextMonday),
      daysUntil: daysUntilMonday
    };
  }

  const updateInfo = $derived(getNextUpdateInfo());
</script>

{#if variant === 'full'}
  <div class="freshness-full">
    <div class="freshness-header">
      <Clock size={14} />
      <span class="freshness-label">Weekly Snapshot</span>
    </div>
    <p class="freshness-detail">
      Expected latest snapshot {updateInfo.lastUpdate} • Next scheduled update {updateInfo.nextUpdate}
    </p>
    {#if showSchedule}
      <p class="freshness-schedule">
        <Info size={12} />
        Data syncs every Monday at 4 PM UTC
      </p>
    {/if}
  </div>
{:else if variant === 'tooltip'}
  <button class="freshness-tooltip" onclick={handleClick} aria-label="Show data freshness info">
    <Info size={14} />
  </button>
  {#if showTooltip}
    <button
      type="button"
      class="tooltip-backdrop"
      onclick={closeTooltip}
      aria-label="Close data freshness tooltip"
    ></button>
    <div
      class="tooltip-fixed"
      bind:this={tooltipElement}
      style="top: {tooltipPosition.top}px; left: {tooltipPosition.left}px;"
    >
      <button class="tooltip-close" onclick={closeTooltip}>
        <X size={12} />
      </button>
      <div class="tooltip-title">Weekly Snapshot</div>
      <div class="tooltip-detail">Expected latest snapshot {updateInfo.lastUpdate}</div>
      <div class="tooltip-detail">Next scheduled update {updateInfo.nextUpdate}</div>
      <div class="tooltip-schedule">Syncs every Monday at 4 PM UTC</div>
    </div>
  {/if}
{:else}
  <!-- inline variant -->
  <span class="freshness-badge" title="Data syncs weekly on Mondays at 4 PM UTC">
    <Clock size={10} />
    <span>Weekly Snapshot</span>
  </span>
{/if}

<style>
  .freshness-full {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }

  .freshness-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
  }

  .freshness-detail {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0;
  }

  .freshness-schedule {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0.25rem 0 0;
  }

  .freshness-tooltip {
    display: inline-flex;
    align-items: center;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: color 100ms var(--ease-standard);
  }

  .freshness-tooltip:hover {
    color: var(--color-fg-secondary);
  }

  /* Fixed-position tooltip that won't clip */
  .tooltip-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: transparent;
    border: none;
    padding: 0;
  }

  .tooltip-fixed {
    position: fixed;
    transform: translateX(-50%);
    z-index: 1000;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    min-width: 200px;
    max-width: min(280px, calc(100vw - 24px));
  }

  .tooltip-close {
    position: absolute;
    top: var(--space-xs);
    right: var(--space-xs);
    padding: 4px;
    background: transparent;
    border: none;
    color: var(--color-fg-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 100ms,
      color 100ms;
  }

  .tooltip-close:hover {
    background: var(--color-bg-subtle);
    color: var(--color-fg-primary);
  }

  .tooltip-title {
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .tooltip-detail {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    line-height: 1.4;
  }

  .tooltip-schedule {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin-top: var(--space-xs);
    padding-top: var(--space-xs);
    border-top: 1px solid var(--color-border-default);
  }

  .freshness-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    cursor: help;
    white-space: nowrap;
  }

  .freshness-badge:hover {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-secondary);
  }

  .freshness-tooltip:focus-visible,
  .tooltip-close:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
