<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import {
    DataTable,
    StatusBadge,
    type DataTableColumn,
    type DataTableSortDirection
  } from '@create-something/canon/components';
  import Panel from '$lib/components/Panel.svelte';
  import { relativeTime, shortTimestamp } from '$lib/format';
  import { reviewStatusBadge, visibilityBadge } from '$lib/status';
  import type { AppRow } from '$lib/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const columns: DataTableColumn[] = [
    { key: 'slug', label: 'Slug', mono: true, sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'visibility', label: 'Visibility', sortable: true, width: '8rem' },
    { key: 'review_status', label: 'Review status', sortable: true, width: '10rem' },
    { key: 'client_id', label: 'Client ID', mono: true },
    { key: 'app_id', label: 'App ID', mono: true },
    { key: 'mrp_id', label: 'MRP ID', mono: true },
    { key: 'last_seen_at', label: 'Last seen', mono: true, align: 'right', sortable: true, width: '10rem' }
  ];

  function applySort(key: string, direction: DataTableSortDirection) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('sort', key);
    params.set('dir', direction);
    goto(`/apps?${params.toString()}`, { keepFocus: true });
  }
</script>

<h1 class="page-title">Apps</h1>

<!-- Search: LIKE on slug/name, exact or long-prefix on copied admin identifiers -->
<form class="search-form mt-6 flex items-center gap-3" method="GET" action="/apps">
  <input
    class="search-input"
    type="search"
    name="q"
    value={data.q}
    placeholder="Search slug, name, client_id, app_id, workspace_id, or mrp_id..."
    aria-label="Search apps by slug, name, client ID, app ID, workspace ID, or MRP ID"
  />
  <input type="hidden" name="sort" value={data.sort.key} />
  <input type="hidden" name="dir" value={data.sort.direction} />
  <button class="search-button" type="submit">Search</button>
  {#if data.q}
    <a class="search-clear" href="/apps">Clear</a>
  {/if}
</form>

<!-- Recent drift: apps whose admin badges changed after first snapshot -->
<div class="mt-6">
  <Panel title="Recent drift" count={data.drifted.length}>
    {#if data.drifted.length === 0}
      <p class="empty-note">No drift detected — no app has changed since its first snapshot.</p>
    {:else}
      <ul>
        {#each data.drifted as app (app.id)}
          {@const visibility = visibilityBadge(app.visibility)}
          {@const review = reviewStatusBadge(app.review_status)}
          <li class="drift-row flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span class="mono-value">{app.slug}</span>
            <span class="app-name">{app.name ?? ''}</span>
            {#if app.visibility}
              <StatusBadge label={app.visibility} tone={visibility.tone} variant="dot" />
            {/if}
            {#if app.review_status}
              <StatusBadge label={app.review_status} tone={review.tone} variant="dot" />
            {/if}
            <span class="mono-caption ml-auto" title={app.last_changed_at ?? undefined}>
              changed {relativeTime(app.last_changed_at)}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>
</div>

<div class="mt-6">
  <Panel
    title="Registry"
    count={data.q
      ? `${data.matched ?? data.apps.length} matching “${data.q}” · ${data.total} total`
      : data.apps.length < data.total
        ? `${data.apps.length} of ${data.total}`
        : data.total}
  >
    <DataTable
      {columns}
      rows={data.apps}
      rowKey={(row) => row.id}
      sortKey={data.sort.key}
      sortDirection={data.sort.direction}
      onsort={applySort}
      caption="Marketplace apps registry"
      stickyHeader
      dense
    >
      {#snippet cell({ row, column, value })}
        {@const app = row as AppRow}
        {#if column.key === 'visibility'}
          {#if app.visibility}
            {@const badge = visibilityBadge(app.visibility)}
            <StatusBadge label={app.visibility} tone={badge.tone} variant="dot" />
          {:else}
            <span class="cell-muted">—</span>
          {/if}
        {:else if column.key === 'review_status'}
          {#if app.review_status}
            {@const badge = reviewStatusBadge(app.review_status)}
            <StatusBadge label={app.review_status} tone={badge.tone} variant="dot" />
          {:else}
            <span class="cell-muted">—</span>
          {/if}
        {:else if column.key === 'last_seen_at'}
          <span title={app.last_seen_at}>{shortTimestamp(app.last_seen_at)}</span>
        {:else if value === null || value === undefined || value === ''}
          <span class="cell-muted">—</span>
        {:else}
          {String(value)}
        {/if}
      {/snippet}
      {#snippet empty()}
        {#if data.q}
          <span class="cell-muted">No apps match “{data.q}” — try a shorter fragment, or a full copied identifier.</span>
        {:else}
          <span class="cell-muted">No apps captured yet — the registry fills on first admin sync.</span>
        {/if}
      {/snippet}
    </DataTable>
  </Panel>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .search-input {
    flex: 1;
    max-width: 28rem;
    padding: var(--space-xs) var(--space-sm);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
  }

  .search-input::placeholder {
    color: var(--color-fg-muted);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  .search-button {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    background: transparent;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .search-button:hover {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .search-clear {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .search-clear:hover {
    color: var(--color-fg-primary);
  }

  .drift-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .drift-row:last-child {
    border-bottom: none;
  }

  .app-name {
    color: var(--color-fg-primary);
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

  .empty-note {
    padding: var(--space-md) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .cell-muted {
    color: var(--color-fg-subtle);
  }
</style>
