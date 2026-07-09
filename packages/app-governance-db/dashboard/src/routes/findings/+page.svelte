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
  import { shortTimestamp } from '$lib/format';
  import { findingStatusBadge, priorityBadge, stateLabel } from '$lib/status';
  import type { PageData } from './$types';
  import type { FindingRow } from '$lib/types';

  let { data }: { data: PageData } = $props();

  const FINDING_STATUSES = ['flagged', 'in_progress', 'needs_decision', 'shipped', 'parked'];

  const columns: DataTableColumn[] = [
    { key: 'id', label: 'ID', mono: true, width: '4rem', sortable: true },
    { key: 'title', label: 'Finding', sortable: true },
    { key: 'status', label: 'Status', sortable: true, width: '11rem' },
    { key: 'priority', label: 'Priority', sortable: true, width: '6rem' },
    { key: 'category_title', label: 'Category' },
    { key: 'owner', label: 'Owner', width: '8rem' },
    { key: 'updated_at', label: 'Updated', mono: true, align: 'right', sortable: true, width: '10rem' }
  ];

  function applyFilter(name: string, value: string) {
    const params = new URLSearchParams($page.url.searchParams);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    goto(`/findings?${params.toString()}`, { keepFocus: true });
  }

  function applySort(key: string, direction: DataTableSortDirection) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('sort', key);
    params.set('dir', direction);
    goto(`/findings?${params.toString()}`, { keepFocus: true });
  }

  const hasFilters = $derived(
    Boolean(data.filters.status || data.filters.category || data.filters.decision || data.filters.owner)
  );
</script>

<h1 class="page-title">Findings</h1>

<!-- Filters -->
<div class="mt-6 flex flex-wrap items-end gap-4">
  <label class="filter-field">
    <span class="filter-label">Status</span>
    <select
      class="filter-select"
      value={data.filters.status}
      onchange={(e) => applyFilter('status', e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each FINDING_STATUSES as status (status)}
        <option value={status}>{stateLabel(status)}</option>
      {/each}
    </select>
  </label>

  <label class="filter-field">
    <span class="filter-label">Category</span>
    <select
      class="filter-select"
      value={data.filters.category}
      onchange={(e) => applyFilter('category', e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each data.categories as category (category.id)}
        <option value={category.id}>{category.title}</option>
      {/each}
    </select>
  </label>

  <label class="filter-field">
    <span class="filter-label">Decision</span>
    <select
      class="filter-select"
      value={data.filters.decision}
      onchange={(e) => applyFilter('decision', e.currentTarget.value)}
    >
      <option value="">All</option>
      <option value="1">Decision needed</option>
    </select>
  </label>

  <label class="filter-field">
    <span class="filter-label">Owner</span>
    <select
      class="filter-select"
      value={data.filters.owner}
      onchange={(e) => applyFilter('owner', e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each data.owners as owner (owner)}
        <option value={owner}>{owner}</option>
      {/each}
    </select>
  </label>

  {#if hasFilters}
    <a href="/findings" class="clear-filters">Clear filters</a>
  {/if}
</div>

<div class="mt-6">
  <Panel
    title="Findings"
    count={data.findings.length < data.total
      ? `${data.findings.length} of ${data.total}`
      : data.total}
  >
    <DataTable
      {columns}
      rows={data.findings}
      rowKey={(row) => row.id}
      sortKey={data.sort.key}
      sortDirection={data.sort.direction}
      onsort={applySort}
      onrowclick={(row) => goto(`/findings/${row.id}`)}
      caption="Governance findings"
      stickyHeader
    >
      {#snippet cell({ row, column, value })}
        {@const finding = row as FindingRow}
        {#if column.key === 'status'}
          {@const badge = findingStatusBadge(finding.status)}
          <StatusBadge
            label={stateLabel(finding.status)}
            tone={badge.tone}
            emphasis={badge.emphasis}
            variant="dot"
          />
        {:else if column.key === 'priority'}
          {#if finding.priority}
            {@const badge = priorityBadge(finding.priority)}
            <StatusBadge label={finding.priority} tone={badge.tone} variant="dot" />
          {:else}
            <span class="cell-muted">—</span>
          {/if}
        {:else if column.key === 'updated_at'}
          <span title={finding.updated_at}>{shortTimestamp(finding.updated_at)}</span>
        {:else if value === null || value === undefined || value === ''}
          <span class="cell-muted">—</span>
        {:else}
          {String(value)}
        {/if}
      {/snippet}
      {#snippet empty()}
        {#if hasFilters}
          <span class="cell-muted">No findings match these filters.</span>
        {:else}
          <span class="cell-muted">No findings recorded yet.</span>
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

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-label {
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .filter-select {
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-xs) var(--space-sm);
    max-width: 18rem;
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  .clear-filters {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-decoration: underline;
    padding-bottom: var(--space-xs);
  }

  .cell-muted {
    color: var(--color-fg-subtle);
  }
</style>
