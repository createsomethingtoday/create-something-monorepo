<script lang="ts">
  import {
    Badge,
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
  import {
    getAssetActionConfig,
    groupAssetsByTypeAndStatus,
    normalizeAssetStatus,
    sortAssetStatuses,
    sortAssetTypes,
    type AssetTypeSortDirection
  } from '$lib/utils/asset-actions';
  import { trackEvent } from '$lib/utils/analytics';
  import { formatCompactCurrency } from '$lib/utils/format';
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
    RefreshCw,
    LoaderCircle
  } from 'lucide-svelte';

  interface Props {
    assets: Asset[];
    errorMessage?: string | null;
    searchTerm?: string;
    openingViewAssetId?: string | null;
    openingEditAssetId?: string | null;
    onSearch?: (term: string) => void;
    onView?: (id: string) => void;
    onPreloadView?: (id: string) => void;
    onEdit?: (id: string) => void;
    onArchive?: (id: string) => void | Promise<void>;
    onRefresh?: () => void;
  }

  let {
    assets,
    errorMessage = null,
    searchTerm = '',
    openingViewAssetId = null,
    openingEditAssetId = null,
    onSearch,
    onView,
    onPreloadView,
    onEdit,
    onArchive,
    onRefresh
  }: Props = $props();

  let showPerformance = $state(false);
  let expandedGroups = $state<string[]>([]);
  let typeSortDirection = $state<AssetTypeSortDirection>('asc');
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

  function sortAssetsForDisplay(assetList: Asset[]): Asset[] {
    return [...assetList].sort((a, b) => {
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

  const groupedAssetsByType = $derived.by(() => {
    const groups = groupAssetsByTypeAndStatus(filteredAssets);

    return sortAssetTypes(Object.keys(groups), typeSortDirection)
      .map((type) => {
        const statusGroups = sortAssetStatuses(Object.keys(groups[type] || {})).map((status) => {
          const sortedAssets = sortAssetsForDisplay(groups[type][status] || []);
          return {
            key: getGroupKey(type, status),
            status,
            assets: sortedAssets,
            // Computed here so the template doesn't re-reduce every group on each render.
            totals: calculateTotals(sortedAssets)
          };
        });

        return {
          type,
          totalCount: statusGroups.reduce((total, group) => total + group.assets.length, 0),
          statuses: statusGroups
        };
      })
      .filter((group) => group.statuses.length > 0);
  });

  function getGroupKey(type: string, status: string): string {
    return `${type}::${status}`;
  }

  function toggleGroup(groupKey: string) {
    if (expandedGroups.includes(groupKey)) {
      expandedGroups = expandedGroups.filter((key) => key !== groupKey);
    } else {
      expandedGroups = [...expandedGroups, groupKey];
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

  function getAriaSort(key: string): 'ascending' | 'descending' | 'none' {
    if (sortConfig.key !== key) return 'none';
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  }

  function getVisibleAssets(groupKey: string, allAssets: Asset[]): Asset[] {
    if (expandedGroups.includes(groupKey)) {
      return allAssets;
    }
    return allAssets.slice(0, 10);
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

  function toggleTypeSortDirection() {
    typeSortDirection = typeSortDirection === 'asc' ? 'desc' : 'asc';
  }

  function runPrimaryAction(asset: Asset, action: AssetActionDescriptor) {
    trackEvent('dashboard_asset_primary_action_clicked', {
      asset_id: asset.id,
      asset_status: asset.status,
      action: action.key
    });

    if (action.handler === 'view') {
      if (openingViewAssetId) return;
      onView?.(asset.id);
      return;
    }

    if (action.handler === 'edit') {
      if (openingEditAssetId || openingViewAssetId) return;
      onEdit?.(asset.id);
      return;
    }

    onArchive?.(asset.id);
  }

  function runSecondaryAction(asset: Asset, action: AssetActionDescriptor) {
    if (action.handler === 'view') {
      if (openingViewAssetId) return;
      onView?.(asset.id);
      return;
    }

    if (action.handler === 'edit') {
      if (openingEditAssetId || openingViewAssetId) return;
      onEdit?.(asset.id);
      return;
    }

    onArchive?.(asset.id);
  }

  function preloadViewAction(asset: Asset, action: AssetActionDescriptor) {
    if (action.handler === 'view') {
      onPreloadView?.(asset.id);
    }
  }

  function isActionDisabled(action: AssetActionDescriptor) {
    if (action.handler === 'view') return openingViewAssetId !== null || openingEditAssetId !== null;
    if (action.handler === 'edit') return openingEditAssetId !== null || openingViewAssetId !== null;
    return false;
  }

  function isActionLoading(asset: Asset, action: AssetActionDescriptor) {
    return (
      (action.handler === 'view' && openingViewAssetId === asset.id) ||
      (action.handler === 'edit' && openingEditAssetId === asset.id)
    );
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

  function getTypeOrderLabel() {
    return typeSortDirection === 'asc' ? 'A-Z' : 'Z-A';
  }

  function hasActiveOffer(asset: Asset): boolean {
    return Boolean(
      asset.activeOfferLabel ||
        asset.activeOfferCtaUrl ||
        asset.activeOfferStrategy ||
        asset.activeOfferEndsAt ||
        asset.activeOfferVisibility ||
        asset.activeOfferPrice !== undefined
    );
  }
</script>

<div class="assets-display">
  <div class="section-header">
    <div class="section-heading">
      <h2 class="section-title">Your Assets</h2>
      <p class="section-description">
        Search, sort, and review the assets in your portfolio, grouped by type.
      </p>
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
      <Button variant="outline" size="sm" onclick={toggleTypeSortDirection}>
        <Package size={16} />
        Type {getTypeOrderLabel()}
      </Button>
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

  {#if errorMessage}
    <Card>
      <CardContent>
        <div class="empty-state empty-state--error">
          <AlertTriangle size={64} strokeWidth={1.5} />
          <h3>Assets unavailable</h3>
          <p>{errorMessage}</p>
          {#if onRefresh}
            <div class="empty-actions">
              <Button variant="secondary" onclick={onRefresh}>
                <RefreshCw size={14} />
                Refresh assets
              </Button>
            </div>
          {/if}
        </div>
      </CardContent>
    </Card>
  {:else if groupedAssetsByType.length === 0}
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
            <p>Your published and pending assets will appear here after sync.</p>
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
    {#each groupedAssetsByType as typeGroup}
      <section class="type-section">
        <div class="type-header">
          <div class="type-meta">
            <h3 class="type-title">{typeGroup.type}</h3>
            <span class="type-summary"
              >{typeGroup.totalCount} {typeGroup.totalCount === 1 ? 'asset' : 'assets'}</span
            >
          </div>
        </div>

        <div class="type-statuses">
          {#each typeGroup.statuses as statusGroup}
            {@const statusAssets = statusGroup.assets}
            {@const visibleAssets = getVisibleAssets(statusGroup.key, statusAssets)}
            {@const normalizedStatus = normalizeAssetStatus(statusGroup.status)}
            {@const config = statusConfig[normalizedStatus]}
            {@const showTotals =
              showPerformance && !['Upcoming', 'Rejected'].includes(normalizedStatus)}
            {@const totals = showTotals ? statusGroup.totals : null}

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
                      <h4 class="status-title">{normalizedStatus}</h4>
                      <span class="status-count"
                        >{statusAssets.length}
                        {statusAssets.length === 1 ? 'asset' : 'assets'}</span
                      >
                    </div>
                    <span class="sort-summary">{getSortLabel()}</span>
                  </div>
                </div>
              </div>

              <Card class="asset-table-card">
                <div class="table-container desktop-table">
                  <Table class="asset-table">
                    <colgroup>
                      <col class="thumb-col" />
                      <col class="name-col" />
                      <col class="submitted-col" />
                      <col class="category-col" />
                      {#if showPerformance}
                        <col class="metric-col" />
                        <col class="metric-col" />
                        <col class="metric-col" />
                      {/if}
                      <col class="more-col" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead class="thumbnail-head"></TableHead>
                        <TableHead class="asset-title-head" aria-sort={getAriaSort('name')}>
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
                        <TableHead class="submitted-head" aria-sort={getAriaSort('submittedDate')}>
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
                        <TableHead class="category-head">Category</TableHead>
                        {#if showPerformance}
                          <TableHead
                            align="right"
                            class="metric-head"
                            aria-sort={getAriaSort('uniqueViewers')}
                          >
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
                          <TableHead
                            align="right"
                            class="metric-head"
                            aria-sort={getAriaSort('cumulativePurchases')}
                          >
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
                          <TableHead
                            align="right"
                            class="metric-head"
                            aria-sort={getAriaSort('cumulativeRevenue')}
                          >
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
                        <TableHead align="center" class="more-head">More</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {#each visibleAssets as asset (asset.id)}
                        <AssetTableRow
                          {asset}
                          {showPerformance}
                          isViewDisabled={openingViewAssetId !== null || openingEditAssetId !== null}
                          isViewLoading={openingViewAssetId === asset.id}
                          isEditDisabled={openingEditAssetId !== null || openingViewAssetId !== null}
                          isEditLoading={openingEditAssetId === asset.id}
                          {onView}
                          {onPreloadView}
                          {onEdit}
                          {onArchive}
                        />
                      {/each}
                      {#if totals}
                        <TableRow class="totals-row">
                          <TableCell class="totals-icon-cell">
                            <div class="totals-icon">
                              <TrendingUp size={16} />
                            </div>
                          </TableCell>
                          <TableCell class="totals-label-cell">
                            <strong>Group total</strong>
                            <span
                              >{statusAssets.length}
                              {statusAssets.length === 1 ? 'asset' : 'assets'}</span
                            >
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell class="metric-cell totals-metric"
                            ><strong>{totals.viewers.toLocaleString()}</strong></TableCell
                          >
                          <TableCell class="metric-cell totals-metric"
                            ><strong>{totals.purchases.toLocaleString()}</strong></TableCell
                          >
                          <TableCell class="metric-cell totals-metric"
                            ><strong>${totals.revenue.toLocaleString()}</strong></TableCell
                          >
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
                          {#if hasActiveOffer(asset)}
                            <div class="mobile-offer-badge">
                              <Badge variant="info">
                                {asset.activeOfferLabel || 'Limited offer'}
                                {#if asset.activeOfferPrice !== undefined}
                                  · {formatCompactCurrency(asset.activeOfferPrice)}
                                {/if}
                              </Badge>
                            </div>
                          {/if}
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
                        {#if showPerformance && !['Upcoming', 'Rejected'].includes(normalizeAssetStatus(asset.status))}
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
                          variant={actionConfig.primary.handler === 'edit'
                            ? 'default'
                            : 'secondary'}
                          disabled={isActionDisabled(actionConfig.primary)}
                          onmouseenter={() => preloadViewAction(asset, actionConfig.primary)}
                          onfocus={() => preloadViewAction(asset, actionConfig.primary)}
                          onclick={() => runPrimaryAction(asset, actionConfig.primary)}
                        >
                          {#if isActionLoading(asset, actionConfig.primary)}
                            <LoaderCircle size={14} class="button-spinner" />
                            Opening...
                          {:else}
                            {actionConfig.primary.label}
                          {/if}
                        </Button>
                        {#each actionConfig.secondary as action}
                          <Button
                            size="sm"
                            variant={action.handler === 'archive' ? 'destructive' : 'outline'}
                            disabled={isActionDisabled(action)}
                            onmouseenter={() => preloadViewAction(asset, action)}
                            onfocus={() => preloadViewAction(asset, action)}
                            onclick={() => runSecondaryAction(asset, action)}
                          >
                            {#if isActionLoading(asset, action)}
                              <LoaderCircle size={14} class="button-spinner" />
                              Opening...
                            {:else}
                              {action.label}
                            {/if}
                          </Button>
                        {/each}
                      </div>
                    </article>
                  {/each}
                </div>

                {#if statusAssets.length > 10}
                  <div class="show-more">
                    <Button variant="outline" onclick={() => toggleGroup(statusGroup.key)}>
                      {expandedGroups.includes(statusGroup.key)
                        ? 'Show Less'
                        : `Show ${statusAssets.length - 10} More`}
                    </Button>
                  </div>
                {/if}
              </Card>
            </section>
          {/each}
        </div>
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

  .type-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .type-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  .type-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .type-title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: clamp(1.2rem, 0.95vw + 1rem, 1.45rem);
    font-weight: var(--font-semibold);
    letter-spacing: 0.02em;
    color: var(--color-fg-primary);
  }

  .type-summary,
  .status-count {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .type-statuses {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
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

  :global(.asset-table-card) {
    overflow: hidden;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
  }

  :global(.desktop-table .asset-table) {
    table-layout: fixed;
  }

  :global(.desktop-table .table-cell) {
    padding: 0.28rem 0.62rem;
    border-bottom-color: color-mix(in srgb, var(--color-border-default) 64%, transparent);
    letter-spacing: 0;
  }

  :global(.desktop-table .table-head) {
    height: 1.72rem;
    padding: 0;
    border-bottom-color: color-mix(in srgb, var(--color-border-emphasis) 68%, transparent);
    letter-spacing: 0;
  }

  :global(.desktop-table .table-head-inner) {
    padding: 0.14rem 0.62rem;
  }

  :global(.desktop-table .table-row) {
    border-bottom-color: color-mix(in srgb, var(--color-border-default) 58%, transparent);
  }

  :global(.desktop-table .table-row:hover) {
    background: color-mix(in srgb, var(--color-hover) 18%, var(--color-bg-surface));
  }

  :global(.desktop-table .table-row:focus-within) {
    background: color-mix(in srgb, var(--color-info-muted) 14%, var(--color-bg-surface));
  }

  :global(.desktop-table col.thumb-col) {
    width: 3.45rem;
  }

  :global(.desktop-table col.name-col) {
    width: 42%;
  }

  :global(.desktop-table col.submitted-col) {
    width: 12.5%;
  }

  :global(.desktop-table col.category-col) {
    width: 12%;
  }

  :global(.desktop-table col.metric-col) {
    width: 9%;
  }

  :global(.desktop-table col.more-col) {
    width: 3.1rem;
  }

  :global(.desktop-table td.thumbnail-cell),
  :global(.desktop-table th.thumbnail-head) {
    padding-right: 0.28rem;
  }

  :global(.desktop-table td.asset-title-cell),
  :global(.desktop-table th.asset-title-head) {
    padding-left: 0.34rem;
  }

  :global(.desktop-table td.metric-cell),
  :global(.desktop-table .metric-head) {
    text-align: right;
  }

  :global(.desktop-table td.metric-cell) {
    padding-left: 0.4rem;
    padding-right: 0.72rem;
  }

  :global(.desktop-table .metric-head .table-head-inner),
  :global(.desktop-table .metric-head .revenue-header) {
    justify-content: flex-end;
  }

  :global(.desktop-table td.more-cell) {
    padding-left: 0.2rem;
    padding-right: 0.2rem;
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
    letter-spacing: 0;
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
    text-underline-offset: 0.18rem;
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

  :global(.desktop-table .totals-row) {
    border-top: 1px solid var(--color-border-emphasis);
    background: color-mix(in srgb, var(--color-bg-subtle) 42%, var(--color-bg-surface));
  }

  :global(.desktop-table .totals-row .table-cell) {
    padding-top: 0.38rem;
    padding-bottom: 0.38rem;
    border-bottom: none;
  }

  :global(.desktop-table .totals-label-cell) {
    color: var(--color-fg-primary);
    line-height: 1.12;
  }

  :global(.desktop-table .totals-label-cell strong) {
    display: block;
    font-size: 0.86rem;
    font-weight: var(--font-semibold);
  }

  :global(.desktop-table .totals-label-cell span) {
    display: block;
    margin-top: 0.05rem;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  :global(.desktop-table .totals-metric strong) {
    color: var(--color-fg-primary);
    font-size: 0.86rem;
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  .totals-icon {
    width: 30px;
    height: 38px;
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
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
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

  .mobile-offer-badge {
    display: inline-flex;
    max-width: 100%;
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

  .button-spinner {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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

  :global(.desktop-table th.more-head),
  :global(.desktop-table td.more-cell) {
    width: 3.1rem;
    text-align: center;
  }
</style>
