<script lang="ts">
  import {
    Button,
    Card,
    CardContent,
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    TableCell
  } from './ui';
  import AssetTableRow from './AssetTableRow.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import DataFreshnessIndicator from './DataFreshnessIndicator.svelte';
  import Search from './Search.svelte';
  import type { Asset } from '$lib/server/airtable';
  import {
    BarChart3,
    Package,
    TrendingUp,
    CalendarClock,
    CheckCircle2,
    Rocket,
    AlertTriangle,
    XCircle,
    SearchX,
    RefreshCw
  } from 'lucide-svelte';

  interface Props {
    assets: Asset[];
    searchTerm?: string;
    onSearch?: (term: string) => void;
    onView?: (id: string) => void;
    onEdit?: (id: string) => void;
    onArchive?: (id: string) => Promise<void>;
    onRefresh?: () => void;
  }

  let { assets, searchTerm = '', onSearch, onView, onEdit, onArchive, onRefresh }: Props = $props();

  let showPerformance = $state(false);
  let expandedStatuses = $state<string[]>([]);
  let sortConfig = $state<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'submittedDate',
    direction: 'desc'
  });

  // Status order for display
  const statusOrder = ['Scheduled', 'Published', 'Upcoming', 'Delisted', 'Rejected'];

  // Status icons and colors
  // Using typeof for lucide icon components (Svelte 5 compatible)
  const statusConfig: Record<string, { icon: typeof CalendarClock; bgClass: string }> = {
    Scheduled: { icon: CalendarClock, bgClass: 'status-scheduled' },
    Published: { icon: CheckCircle2, bgClass: 'status-published' },
    Upcoming: { icon: Rocket, bgClass: 'status-upcoming' },
    Delisted: { icon: AlertTriangle, bgClass: 'status-delisted' },
    Rejected: { icon: XCircle, bgClass: 'status-rejected' }
  };

  // Filter assets by search term
  const filteredAssets = $derived.by(() => {
    if (!searchTerm.trim()) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(term) ||
        asset.type.toLowerCase().includes(term) ||
        asset.status.toLowerCase().includes(term)
    );
  });

  // Group assets by status
  const groupedAssets = $derived.by(() => {
    const groups: Record<string, Asset[]> = {};

    for (const asset of filteredAssets) {
      const status = asset.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(asset);
    }

    // Sort each group
    for (const status of Object.keys(groups)) {
      groups[status].sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Asset];
        const bVal = b[sortConfig.key as keyof Asset];

        if (sortConfig.key === 'submittedDate' || sortConfig.key === 'publishedDate') {
          const dateA = aVal ? new Date(aVal as string).getTime() : 0;
          const dateB = bVal ? new Date(bVal as string).getTime() : 0;
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const strA = String(aVal || '');
        const strB = String(bVal || '');
        return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return groups;
  });

  // Get sorted status keys
  const sortedStatuses = $derived.by(() => {
    return statusOrder.filter((status) => groupedAssets[status]?.length > 0);
  });

  function toggleStatus(status: string) {
    if (expandedStatuses.includes(status)) {
      expandedStatuses = expandedStatuses.filter((s) => s !== status);
    } else {
      expandedStatuses = [...expandedStatuses, status];
    }
  }

  function requestSort(key: string) {
    if (sortConfig.key === key) {
      sortConfig = { key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      sortConfig = { key, direction: 'desc' };
    }
  }

  function getSortIndicator(key: string): string {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  }

  function getVisibleAssets(status: string): Asset[] {
    const all = groupedAssets[status] || [];
    if (expandedStatuses.includes(status)) {
      return all;
    }
    return all.slice(0, 10);
  }

  function calculateTotals(assets: Asset[]): {
    viewers: number;
    purchases: number;
    revenue: number;
  } {
    return assets.reduce(
      (acc, asset) => ({
        viewers: acc.viewers + (asset.uniqueViewers || 0),
        purchases: acc.purchases + (asset.cumulativePurchases || 0),
        revenue: acc.revenue + (asset.cumulativeRevenue || 0)
      }),
      { viewers: 0, purchases: 0, revenue: 0 }
    );
  }

  function clearSearch() {
    onSearch?.('');
  }

  function getSortLabel() {
    const fieldMap: Record<string, string> = {
      name: 'Name',
      submittedDate: 'Submitted date',
      uniqueViewers: 'Viewers',
      cumulativePurchases: 'Purchases',
      cumulativeRevenue: 'Revenue'
    };
    const directionLabel = sortConfig.direction === 'asc' ? 'ascending' : 'descending';
    return `${fieldMap[sortConfig.key] ?? sortConfig.key} (${directionLabel})`;
  }

  function isArchivedStatus(status: string): boolean {
    return status.toLowerCase().includes('delisted');
  }
</script>

<div class="assets-display">
  <div class="section-header">
    <div class="section-heading">
      <h2 class="section-title">Your Assets</h2>
      <p class="section-description">Search, sort, and review the templates in your portfolio.</p>
    </div>
    <div class="section-actions">
      <div class="section-search">
        <Search
          {onSearch}
          value={searchTerm}
          placeholder="Filter assets by name, type, or status"
          ariaLabel="Filter assets"
        />
      </div>
      <Button
        variant={showPerformance ? 'default' : 'outline'}
        size="sm"
        onclick={() => (showPerformance = !showPerformance)}
      >
        <BarChart3 size={16} />
        {showPerformance ? 'Hide' : 'Show'} Performance
      </Button>
    </div>
  </div>

  {#if sortedStatuses.length === 0}
    <Card>
      <CardContent>
        <div class="empty-state">
          {#if searchTerm}
            <SearchX size={64} strokeWidth={1.5} />
            <h3>No assets match "{searchTerm}"</h3>
            <p>Try a different keyword or clear your search to view all assets.</p>
            <div class="empty-actions">
              <Button variant="secondary" onclick={clearSearch}>Clear search</Button>
              {#if onRefresh}
                <Button variant="outline" onclick={onRefresh}>
                  <RefreshCw size={14} />
                  Refresh assets
                </Button>
              {/if}
            </div>
          {:else}
            <Package size={64} strokeWidth={1.5} />
            <h3>No assets yet</h3>
            <p>Your published and pending templates will appear here after sync.</p>
            {#if onRefresh}
              <div class="empty-actions">
                <Button variant="secondary" onclick={onRefresh}>
                  <RefreshCw size={14} />
                  Refresh assets
                </Button>
              </div>
            {/if}
          {/if}
        </div>
      </CardContent>
    </Card>
  {:else}
    {#each sortedStatuses as status}
      {@const statusAssets = groupedAssets[status] || []}
      {@const visibleAssets = getVisibleAssets(status)}
      {@const config = statusConfig[status]}
      {@const showTotals = showPerformance && !['Upcoming', 'Rejected'].includes(status)}
      {@const totals = showTotals ? calculateTotals(visibleAssets) : null}

      <section class="status-section">
        <div class="status-header">
          <div class="status-info">
            <div class="status-icon {config?.bgClass || ''}">
              {#if config?.icon}
                <config.icon size={18} />
              {:else}
                <span>•</span>
              {/if}
            </div>
            <div class="status-meta">
              <h3 class="status-title">{status}</h3>
              <span class="status-count">
                {statusAssets.length}
                {statusAssets.length === 1 ? 'asset' : 'assets'}
              </span>
              <span class="sort-summary">Sorted by {getSortLabel()}</span>
            </div>
          </div>
          <StatusBadge {status} />
        </div>

        <Card>
          <div class="table-container desktop-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-12"></TableHead>
                  <TableHead>
                    <button
                      type="button"
                      class="sort-btn"
                      class:active={sortConfig.key === 'name'}
                      aria-label="Sort by name"
                      onclick={() => requestSort('name')}
                    >
                      Name{getSortIndicator('name')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      class="sort-btn"
                      class:active={sortConfig.key === 'submittedDate'}
                      aria-label="Sort by submitted date"
                      onclick={() => requestSort('submittedDate')}
                    >
                      Submitted{getSortIndicator('submittedDate')}
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  {#if showPerformance}
                    <TableHead class="text-center">
                      <button
                        type="button"
                        class="sort-btn"
                        class:active={sortConfig.key === 'uniqueViewers'}
                        aria-label="Sort by viewers"
                        onclick={() => requestSort('uniqueViewers')}
                      >
                        Viewers{getSortIndicator('uniqueViewers')}
                      </button>
                    </TableHead>
                    <TableHead class="text-center">
                      <button
                        type="button"
                        class="sort-btn"
                        class:active={sortConfig.key === 'cumulativePurchases'}
                        aria-label="Sort by purchases"
                        onclick={() => requestSort('cumulativePurchases')}
                      >
                        Purchases{getSortIndicator('cumulativePurchases')}
                      </button>
                    </TableHead>
                    <TableHead class="text-center">
                      <div class="revenue-header">
                        <button
                          type="button"
                          class="sort-btn"
                          class:active={sortConfig.key === 'cumulativeRevenue'}
                          aria-label="Sort by revenue"
                          onclick={() => requestSort('cumulativeRevenue')}
                        >
                          Revenue{getSortIndicator('cumulativeRevenue')}
                        </button>
                        <DataFreshnessIndicator variant="tooltip" />
                      </div>
                    </TableHead>
                  {/if}
                  <TableHead class="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each visibleAssets as asset (asset.id)}
                  <AssetTableRow {asset} {showPerformance} {onView} {onEdit} {onArchive} />
                {/each}
                {#if totals}
                  <TableRow class="totals-row">
                    <TableCell>
                      <div class="totals-icon">
                        <TrendingUp size={16} />
                      </div>
                    </TableCell>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell class="text-center"
                      ><strong>{totals.viewers.toLocaleString()}</strong></TableCell
                    >
                    <TableCell class="text-center"
                      ><strong>{totals.purchases.toLocaleString()}</strong></TableCell
                    >
                    <TableCell class="text-center"
                      ><strong>${totals.revenue.toLocaleString()}</strong></TableCell
                    >
                    <TableCell></TableCell>
                  </TableRow>
                {/if}
              </TableBody>
            </Table>
          </div>

          <div class="mobile-cards">
            {#each visibleAssets as asset (asset.id)}
              <article class="asset-card-mobile">
                <div class="mobile-header-row">
                  <div class="mobile-asset-meta">
                    <h4 class="mobile-asset-name">{asset.name}</h4>
                    <p class="mobile-asset-type">{asset.type}</p>
                  </div>
                  <StatusBadge status={asset.status} size="sm" />
                </div>

                <div class="mobile-stats">
                  <div>
                    <span class="mobile-label">Submitted</span>
                    <span class="mobile-value">
                      {asset.submittedDate
                        ? new Date(asset.submittedDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                  {#if showPerformance && !['Upcoming', 'Rejected'].includes(asset.status)}
                    <div>
                      <span class="mobile-label">Viewers</span>
                      <span class="mobile-value"
                        >{asset.uniqueViewers?.toLocaleString() ?? '0'}</span
                      >
                    </div>
                    <div>
                      <span class="mobile-label">Purchases</span>
                      <span class="mobile-value"
                        >{asset.cumulativePurchases?.toLocaleString() ?? '0'}</span
                      >
                    </div>
                    <div>
                      <span class="mobile-label">Revenue</span>
                      <span class="mobile-value"
                        >${asset.cumulativeRevenue?.toLocaleString() ?? '0'}</span
                      >
                    </div>
                  {/if}
                </div>

                <div class="mobile-actions">
                  {#if onView}
                    <Button size="sm" variant="outline" onclick={() => onView(asset.id)}
                      >View</Button
                    >
                  {/if}
                  {#if onEdit}
                    <Button size="sm" variant="secondary" onclick={() => onEdit(asset.id)}
                      >Edit</Button
                    >
                  {/if}
                  {#if onArchive && !isArchivedStatus(asset.status)}
                    <Button size="sm" variant="destructive" onclick={() => onArchive(asset.id)}
                      >Archive</Button
                    >
                  {/if}
                </div>
              </article>
            {/each}
          </div>

          {#if statusAssets.length > 10}
            <div class="show-more">
              <Button variant="outline" onclick={() => toggleStatus(status)}>
                {expandedStatuses.includes(status)
                  ? 'Show Less'
                  : `Show ${statusAssets.length - 10} More`}
              </Button>
            </div>
          {/if}
        </Card>
      </section>
    {/each}
  {/if}
</div>

<style>
  .assets-display {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .section-heading {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .section-title {
    font-family: var(--font-heading);
    font-size: clamp(1.35rem, 1.35vw + 1rem, 1.65rem);
    font-weight: var(--font-semibold);
    letter-spacing: 0.02em;
    line-height: 1.12;
    color: var(--color-fg-primary);
    margin: 0;
  }

  .section-description {
    margin: 0;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    opacity: 0.8;
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-search {
    width: min(25rem, 100%);
    min-width: 18rem;
  }

  .status-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .status-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .revenue-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .status-icon {
    width: 2.25rem;
    height: 2.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    font-size: var(--text-body);
  }

  .status-icon.status-scheduled {
    background: var(--color-info-muted);
    color: var(--color-info);
    border-color: var(--color-info-border);
  }

  .status-icon.status-published {
    background: var(--color-success-muted);
    color: var(--color-success);
    border-color: var(--color-success-border);
  }

  .status-icon.status-upcoming {
    background: color-mix(in srgb, var(--color-data-3) 20%, transparent);
    color: var(--color-data-3);
    border-color: var(--color-data-3-border);
  }

  .status-icon.status-delisted {
    background: var(--color-warning-muted);
    color: var(--color-warning);
    border-color: var(--color-warning-border);
  }

  .status-icon.status-rejected {
    background: var(--color-error-muted);
    color: var(--color-error);
    border-color: var(--color-error-border);
  }

  .status-meta {
    display: flex;
    flex-direction: column;
  }

  .status-title {
    font-family: var(--font-heading);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    letter-spacing: 0.02em;
    color: var(--color-fg-primary);
    margin: 0;
  }

  .status-count {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    opacity: 0.78;
  }

  .sort-summary {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    opacity: 0.72;
  }

  @media (max-width: 900px) {
    .section-header,
    .section-actions {
      align-items: stretch;
    }

    .section-actions {
      flex: 1 1 100%;
      flex-wrap: wrap;
    }

    .section-search {
      flex: 1 1 20rem;
      min-width: 0;
    }
  }

  @media (max-width: 640px) {
    .section-actions {
      flex-direction: column;
    }

    .section-search {
      width: 100%;
    }
  }

  .table-container {
    overflow-x: auto;
  }

  .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .sort-btn:hover {
    color: var(--color-fg-primary);
  }

  .sort-btn.active {
    color: var(--color-info);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .sort-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .show-more {
    display: flex;
    justify-content: center;
    padding: var(--space-md);
    border-top: 1px solid var(--color-shell-border-default);
  }

  .totals-row {
    border-top: 2px solid var(--color-info-border);
    background: color-mix(in srgb, var(--color-info-muted) 35%, var(--color-bg-surface));
  }

  .totals-icon {
    width: 35px;
    height: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-surface);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-shell-border-default);
    color: var(--color-info);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl) var(--space-md);
    text-align: center;
  }

  .empty-state :global(svg) {
    color: var(--color-fg-muted);
    margin-bottom: var(--space-md);
  }

  .empty-state h3 {
    font-size: var(--text-body-lg);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-xs);
  }

  .empty-state p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin: 0;
    max-width: 24rem;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }

  .mobile-cards {
    display: none;
    padding: var(--space-sm);
  }

  .asset-card-mobile {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    background: var(--color-bg-surface);
    box-shadow: var(--shadow-sm);
  }

  .mobile-header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .mobile-asset-meta {
    min-width: 0;
  }

  .mobile-asset-name {
    margin: 0;
    font-size: var(--text-body);
    color: var(--color-fg-primary);
  }

  .mobile-asset-type {
    margin: 0;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .mobile-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-sm);
  }

  .mobile-label {
    display: block;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .mobile-value {
    display: block;
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .mobile-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  @media (max-width: 900px) {
    .desktop-table {
      display: none;
    }

    .mobile-cards {
      display: grid;
      gap: var(--space-sm);
    }
  }

  :global(.text-center) {
    text-align: center;
  }
</style>
