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
  import type { AssetActionDescriptor } from '$lib/utils/asset-actions';
  import { getAssetActionConfig, normalizeAssetStatus, sortAssetStatuses } from '$lib/utils/asset-actions';
  import { trackEvent } from '$lib/utils/analytics';
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

  const statusConfig: Record<string, { icon: typeof CalendarClock; bgClass: string }> = {
    Scheduled: { icon: CalendarClock, bgClass: 'status-scheduled' },
    Published: { icon: CheckCircle2, bgClass: 'status-published' },
    Upcoming: { icon: Rocket, bgClass: 'status-upcoming' },
    Delisted: { icon: AlertTriangle, bgClass: 'status-delisted' },
    Rejected: { icon: XCircle, bgClass: 'status-rejected' },
    Draft: { icon: CalendarClock, bgClass: 'status-scheduled' }
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
    return sortAssetStatuses(Object.keys(groupedAssets)).filter((status) => groupedAssets[status]?.length > 0);
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

  function runPrimaryAction(asset: Asset, action: AssetActionDescriptor) {
    trackEvent('dashboard_asset_primary_action_clicked', {
      asset_id: asset.id,
      asset_status: asset.status,
      action: action.key
    });

    if (action.handler === 'view') {
      onView?.(asset.id);
      return;
    }

    if (action.handler === 'edit') {
      onEdit?.(asset.id);
      return;
    }

    onArchive?.(asset.id);
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
        variant={showPerformance ? 'secondary' : 'outline'}
        size="sm"
        onclick={() => (showPerformance = !showPerformance)}
      >
        <BarChart3 size={16} />
        {showPerformance ? 'Hide' : 'Show'} Performance columns
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
      {@const normalizedStatus = normalizeAssetStatus(status)}
      {@const showTotals = showPerformance && !['Upcoming', 'Rejected'].includes(normalizedStatus)}
      {@const totals = showTotals ? calculateTotals(visibleAssets) : null}

      <section class="status-section">
        <div class="status-header">
          <div class="status-info">
            <div class="status-icon {config?.bgClass || ''}">
              {#if config?.icon}
                <config.icon size={15} />
              {:else}
                <span>•</span>
              {/if}
            </div>
            <div class="status-meta">
              <div class="status-line">
                <h3 class="status-title">{status} {statusAssets.length}</h3>
              </div>
              <span class="sort-summary">{getSortLabel()}</span>
            </div>
          </div>
        </div>

        <Card>
          <div class="table-container desktop-table">
            <Table>
              <colgroup>
                <col class="thumb-col" />
                <col class="name-col" />
                <col class="submitted-col" />
                <col class="type-col" />
                {#if showPerformance}
                  <col class="metric-col" />
                  <col class="metric-col" />
                  <col class="metric-col" />
                {/if}
                <col class="action-col" />
                <col class="more-col" />
              </colgroup>
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
                  <TableHead align="right">
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
                    <TableHead align="right">
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
                    <TableHead align="right">
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
                  <TableHead class="action-head">Action</TableHead>
                  <TableHead align="center" class="w-12 more-head">More</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each visibleAssets as asset (asset.id)}
                  <AssetTableRow
                    {asset}
                    {showPerformance}
                    onPrimaryAction={runPrimaryAction}
                    {onView}
                    {onEdit}
                    {onArchive}
                  />
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
                    <TableCell class="action-cell"></TableCell>
                    <TableCell class="more-cell"></TableCell>
                  </TableRow>
                {/if}
              </TableBody>
            </Table>
          </div>

          <div class="mobile-cards">
            {#each visibleAssets as asset (asset.id)}
              {@const actionConfig = getAssetActionConfig(asset.status)}
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
                  {#if showPerformance &&
                    !['Upcoming', 'Rejected'].includes(normalizeAssetStatus(asset.status))}
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
                  <Button
                    size="sm"
                    variant={actionConfig.primary.handler === 'edit' ? 'default' : 'secondary'}
                    onclick={() => runPrimaryAction(asset, actionConfig.primary)}
                  >
                    {actionConfig.primary.label}
                  </Button>
                  {#each actionConfig.secondary as action}
                    <Button
                      size="sm"
                      variant={action.handler === 'archive' ? 'destructive' : 'outline'}
                      onclick={() =>
                        action.handler === 'view'
                          ? onView?.(asset.id)
                          : action.handler === 'edit'
                            ? onEdit?.(asset.id)
                            : onArchive?.(asset.id)}
                    >
                      {action.label}
                    </Button>
                  {/each}
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
    gap: 0.38rem;
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
    color: var(--color-fg-tertiary);
    line-height: 1.5;
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
    gap: 0.75rem;
  }

  .status-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .revenue-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .action-head {
    white-space: nowrap;
  }

  .status-info {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .status-icon {
    width: 1.15rem;
    height: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: none;
    font-size: var(--text-caption);
    flex-shrink: 0;
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
    gap: 0.16rem;
  }

  .status-line {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .status-title {
    font-family: var(--font-heading);
    font-size: 1.08rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.01em;
    color: var(--color-fg-primary);
    margin: 0;
    font-variant-numeric: tabular-nums;
  }

  .sort-summary {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
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
      min-width: 0;
    }
  }

  .table-container {
    overflow-x: auto;
  }

  :global(.desktop-table col.thumb-col) {
    width: 4.25rem;
  }

  :global(.desktop-table col.name-col) {
    width: 44%;
  }

  :global(.desktop-table col.submitted-col) {
    width: 14%;
  }

  :global(.desktop-table col.type-col) {
    width: 12%;
  }

  :global(.desktop-table col.metric-col) {
    width: 10%;
  }

  :global(.desktop-table col.action-col) {
    width: 7rem;
  }

  :global(.desktop-table col.more-col) {
    width: 3.5rem;
  }

  .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    background: none;
    border: none;
    color: var(--color-fg-muted);
    font: inherit;
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .sort-btn:hover {
    color: var(--color-fg-secondary);
  }

  .sort-btn.active {
    color: var(--color-info);
    text-decoration: underline;
    text-underline-offset: 0.22rem;
    text-decoration-thickness: 1px;
  }

  .sort-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .show-more {
    display: flex;
    justify-content: center;
    padding: 0.85rem;
    border-top: 1px solid var(--color-shell-border-default);
  }

  .totals-row {
    border-top: 1px solid var(--color-border-emphasis);
    background: color-mix(in srgb, var(--color-bg-subtle) 60%, var(--color-bg-surface));
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
    color: var(--color-fg-muted);
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
    padding: 0.75rem;
  }

  .asset-card-mobile {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-md);
    padding: 0.85rem;
    background: var(--color-bg-surface);
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

  :global(.desktop-table td.text-center) {
    text-align: right;
  }

  :global(.desktop-table th.action-head),
  :global(.desktop-table td.action-cell) {
    width: 7rem;
    text-align: left;
  }

  :global(.desktop-table th.more-head),
  :global(.desktop-table td.more-cell) {
    width: 3.5rem;
    text-align: center;
  }
</style>
