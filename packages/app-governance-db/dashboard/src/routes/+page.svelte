<script lang="ts">
  import { StatusBadge } from '@create-something/canon/components';
  import Panel from '$lib/components/Panel.svelte';
  import { relativeTime, truncateMiddle, shortTimestamp } from '$lib/format';
  import {
    findingStatusBadge,
    freshnessBadge,
    notificationBadge,
    stateLabel,
    triageBadge
  } from '$lib/status';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const metricCells = $derived([
    { label: 'new items', value: data.metrics.newItems },
    { label: 'needs decision', value: data.metrics.needsDecision },
    { label: 'queued notifications', value: data.metrics.queuedNotifications },
    { label: 'findings total', value: data.metrics.totalFindings }
  ]);
</script>

<h1 class="page-title">Overview</h1>

<!-- Instrument strip -->
<div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
  {#each metricCells as cell (cell.label)}
    <div class="metric-cell">
      <span class="metric-value">{cell.value}</span>
      <span class="metric-label">{cell.label}</span>
    </div>
  {/each}
</div>

<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
  <!-- Sync cursors: the instrument cluster -->
  <Panel title="Sync cursors" count={data.cursors.length} class="lg:col-span-2">
    {#if data.cursors.length === 0}
      <p class="empty-note">No sources registered yet.</p>
    {:else}
      <ul>
        {#each data.cursors as cursor (cursor.source_type + cursor.external_id)}
          {@const freshness = freshnessBadge(cursor.last_synced_at)}
          <li class="cursor-row flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <StatusBadge label={freshness.label} tone={freshness.tone} variant="dot" />
            <span class="cursor-name">{cursor.name}</span>
            <span class="mono-value" title={cursor.cursor_value ?? undefined}>
              {truncateMiddle(cursor.cursor_value, 36)}
            </span>
            <span class="ml-auto flex items-baseline gap-3">
              <span
                class="cursor-time"
                title={cursor.last_synced_at ?? 'never synced'}
              >
                {relativeTime(cursor.last_synced_at)}
              </span>
              {#if cursor.synced_by}
                <span class="mono-caption">{cursor.synced_by}</span>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <!-- Findings by status -->
  <Panel title="Findings by status">
    {#if data.findingCounts.length === 0}
      <p class="empty-note">No findings recorded yet.</p>
    {:else}
      <ul>
        {#each data.findingCounts as row (row.key)}
          {@const badge = findingStatusBadge(row.key)}
          <li class="count-row flex items-baseline justify-between gap-4">
            <StatusBadge
              label={stateLabel(row.key)}
              tone={badge.tone}
              emphasis={badge.emphasis}
              variant="dot"
            />
            <span class="mono-value">{row.n}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <!-- Items by triage state -->
  <Panel title="Items by triage state">
    {#if data.triageCounts.length === 0}
      <p class="empty-note">No items synced yet.</p>
    {:else}
      <ul>
        {#each data.triageCounts as row (row.key)}
          {@const badge = triageBadge(row.key)}
          <li class="count-row flex items-baseline justify-between gap-4">
            <StatusBadge label={stateLabel(row.key)} tone={badge.tone} variant="dot" />
            <span class="mono-value">{row.n}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <!-- Notifications -->
  <Panel title="Notifications">
    {#if data.notificationCounts.length === 0}
      <p class="empty-note">Notification queue is empty.</p>
    {:else}
      <ul>
        {#each data.notificationCounts as row (row.key)}
          {@const badge = notificationBadge(row.key)}
          <li class="count-row flex items-baseline justify-between gap-4">
            <StatusBadge label={stateLabel(row.key)} tone={badge.tone} variant="dot" />
            <span class="mono-value">{row.n}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>

  <!-- Recent events feed -->
  <Panel title="Recent events" count={data.recentEvents.length}>
    {#if data.recentEvents.length === 0}
      <p class="empty-note">No events recorded yet.</p>
    {:else}
      <ul>
        {#each data.recentEvents as event (event.id)}
          <li class="event-row flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="mono-caption" title={event.created_at}>
              {shortTimestamp(event.created_at)}
            </span>
            <span class="mono-caption">{event.actor}</span>
            <span class="event-action">{event.action}</span>
            <span class="mono-caption">
              {event.entity_type}{event.entity_id ? `#${event.entity_id}` : ''}
            </span>
          </li>
        {/each}
      </ul>
      <div class="panel-footer">
        <a href="/events" class="footer-link">Full audit trail →</a>
      </div>
    {/if}
  </Panel>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .metric-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
  }

  .metric-value {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    line-height: 1;
  }

  .metric-label {
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .cursor-row,
  .count-row,
  .event-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .cursor-row:last-child,
  .count-row:last-child,
  .event-row:last-child {
    border-bottom: none;
  }

  .cursor-name {
    color: var(--color-fg-primary);
  }

  .cursor-time {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }

  .mono-value {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .mono-caption {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .event-action {
    color: var(--color-fg-primary);
  }

  .empty-note {
    padding: var(--space-md) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .panel-footer {
    padding: var(--space-xs) var(--space-sm);
  }

  .footer-link {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-decoration: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .footer-link:hover {
    color: var(--color-fg-secondary);
  }
</style>
