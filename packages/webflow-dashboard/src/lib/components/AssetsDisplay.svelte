<script lang="ts">
  import {
    Badge,
    Button,
    LinkButton,
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
  import { VIEWER_DATA_AVAILABLE, VIEWER_DATA_EPOCH_LABEL } from '$lib/config/viewer-data';
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
  import { onMount, tick } from 'svelte';
  import { DUR, EASE, Flip, ScrollTrigger, finePointer, gsap, motionOK } from '$lib/motion/core';
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
    LoaderCircle,
    PencilLine
  } from 'lucide-svelte';

  interface Props {
    assets: Asset[];
    errorMessage?: string | null;
    searchTerm?: string;
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
    Draft: { icon: PencilLine, bgClass: 'status-draft' }
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

  // With the performance columns on, a narrower window cannot hold every
  // column. Price gives way first, then Category, so Name always has room.
  let innerWidth = $state(1440);
  const showPrice = $derived(!(showPerformance && innerWidth < 1200));
  const showCategory = $derived(!(showPerformance && innerWidth < 1080));
  // Thumbnail, name, status and submitted are always present.
  const leadingColumns = $derived(4 + (showCategory ? 1 : 0) + (showPrice ? 1 : 0));
  const columnCount = $derived(
    leadingColumns + 1 + (showPerformance ? (VIEWER_DATA_AVAILABLE ? 3 : 2) : 0)
  );

  /* ------------------------------ Motion ------------------------------ */

  let displayEl = $state<HTMLElement | null>(null);
  let toolbarEl = $state<HTMLElement | null>(null);
  let listEl = $state<HTMLElement | null>(null);
  let previewEl = $state<HTMLElement | null>(null);
  let previewImgEl = $state<HTMLImageElement | null>(null);

  const FLIP_TARGETS = 'tr.type-row, tr.asset-table-row, tr.totals-row';

  // Two kinds of change, two motions:
  //  - Filtering or refreshing keeps rows in the same order, so the rows that
  //    stay glide up or down to close the gaps (Flip). Nothing crosses.
  //  - Sorting changes the order of every row at once. Rows crossing each
  //    other reads as noise, so the new order settles in place instead.
  let flipState: Flip.FlipState | null = null;
  let previousOrder: string[] = [];

  const rowIds = () =>
    Array.from(listEl?.querySelectorAll<HTMLElement>('tr.asset-table-row') ?? []).map(
      (row) => row.dataset.assetId ?? ''
    );

  $effect.pre(() => {
    void groupedAssetsByType;
    if (!listEl || !motionOK()) return;
    previousOrder = rowIds();
    flipState = Flip.getState(listEl.querySelectorAll(FLIP_TARGETS));
  });

  $effect(() => {
    void groupedAssetsByType;
    if (!flipState || !listEl) return;
    const state = flipState;
    flipState = null;

    const order = rowIds();
    const kept = new Set(order.filter((id) => previousOrder.includes(id)));
    const before = previousOrder.filter((id) => kept.has(id)).join();
    const after = order.filter((id) => kept.has(id)).join();

    if (before !== after) {
      gsap.fromTo(
        listEl.querySelectorAll('tr.asset-table-row'),
        { opacity: 0.3, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: EASE.out,
          stagger: { amount: 0.16 },
          overwrite: true,
          clearProps: 'transform,opacity'
        }
      );
      return;
    }

    Flip.from(state, {
      targets: listEl.querySelectorAll(FLIP_TARGETS),
      duration: 0.36,
      ease: 'power3.inOut',
      prune: true,
      onEnter: (elements) =>
        gsap.fromTo(elements, { opacity: 0 }, { opacity: 1, duration: DUR.fast, delay: 0.12 })
    });
  });

  // Performance columns: the new cells sweep in so the wider table reads as
  // "these three columns were added", not as a different table.
  async function togglePerformance() {
    showPerformance = !showPerformance;
    if (!showPerformance || !motionOK()) return;
    await tick();
    if (!listEl) return;
    // Opacity only: the new header cells hold sort buttons that must stay focusable.
    gsap.from(listEl.querySelectorAll('.metric-head, td.metric-cell'), {
      opacity: 0,
      x: 14,
      duration: 0.4,
      ease: EASE.out,
      stagger: { amount: 0.22 },
      clearProps: 'transform,opacity'
    });
  }

  // Mouse move: thumbnails in the list are small, so a larger preview tracks
  // the pointer while it is over an asset's thumbnail. It sits in the empty end
  // of the Name column, so it never covers a name.
  let previewSrc = '';
  let moveX: ((value: number) => void) | null = null;
  let moveY: ((value: number) => void) | null = null;
  let tilt: ((value: number) => void) | null = null;
  let lastX = 0;
  let settleTilt: gsap.core.Tween | null = null;

  const PREVIEW = { width: 184, height: 236, gap: 26 };

  function previewPosition(event: PointerEvent, nameCell: Element | null) {
    const fitsRight = event.clientX + PREVIEW.gap + PREVIEW.width < window.innerWidth - 12;
    const beside = fitsRight
      ? event.clientX + PREVIEW.gap
      : event.clientX - PREVIEW.gap - PREVIEW.width;
    // Docked against the end of the Name column when there is room for it.
    const docked = nameCell ? nameCell.getBoundingClientRect().right - PREVIEW.width - 12 : beside;
    const x = docked > event.clientX + PREVIEW.gap ? docked : beside;
    // Sits beside and a little above the pointer, clear of the row being read.
    const y = Math.min(
      Math.max(12, event.clientY - PREVIEW.height * 0.62),
      window.innerHeight - PREVIEW.height - 12
    );
    return { x, y };
  }

  function hidePreview() {
    if (!previewEl || !previewSrc) return;
    previewSrc = '';
    gsap.to(previewEl, { autoAlpha: 0, scale: 0.94, duration: 0.18, ease: 'power2.in', overwrite: 'auto' });
  }

  function handleListPointerMove(event: PointerEvent) {
    if (!previewEl || !previewImgEl || !moveX || !moveY || event.pointerType !== 'mouse') return;
    const cell = (event.target as HTMLElement).closest?.('td.thumbnail-cell');
    const src = cell?.closest<HTMLElement>('tr[data-preview]')?.dataset.preview ?? '';
    if (!src) {
      hidePreview();
      return;
    }

    const { x, y } = previewPosition(
      event,
      cell?.closest('tr')?.querySelector('td.asset-title-cell') ?? null
    );
    if (src !== previewSrc) {
      const wasHidden = previewSrc === '';
      previewSrc = src;
      previewImgEl.src = src;
      if (wasHidden) {
        gsap.set(previewEl, { x, y });
        // A short wait, so the preview does not flash while the pointer just crosses the list.
        gsap.fromTo(
          previewEl,
          { autoAlpha: 0, scale: 0.9 },
          { autoAlpha: 1, scale: 1, duration: 0.3, delay: 0.14, ease: EASE.settle, overwrite: 'auto' }
        );
      }
    }
    moveX(x);
    moveY(y);
    // Lean into the direction of travel, then settle upright.
    tilt?.(gsap.utils.clamp(-5, 5, (event.clientX - lastX) * 0.4));
    lastX = event.clientX;
    settleTilt?.kill();
    settleTilt = gsap.delayedCall(0.12, () => tilt?.(0));
  }

  onMount(() => {
    const triggers: ScrollTrigger[] = [];

    if (toolbarEl && displayEl) {
      // Scroll: once the toolbar pins, it gives its second line back to the list.
      const toolbar = toolbarEl;
      const description = toolbar.querySelector<HTMLElement>('.section-description');
      const title = toolbar.querySelector<HTMLElement>('.section-title');
      const setStuck = (stuck: boolean) => {
        toolbar.classList.toggle('is-stuck', stuck);
        if (window.matchMedia('(max-width: 900px)').matches) return;
        const duration = motionOK() ? 0.3 : 0;
        gsap.to(description, {
          height: stuck ? 0 : 'auto',
          autoAlpha: stuck ? 0 : 1,
          duration,
          ease: EASE.inOut,
          overwrite: 'auto'
        });
        gsap.to(title, {
          scale: stuck ? 0.82 : 1,
          transformOrigin: 'left center',
          duration,
          ease: EASE.inOut,
          overwrite: 'auto'
        });
      };
      triggers.push(
        ScrollTrigger.create({
          trigger: displayEl,
          start: () => `top top+=${toolbar.offsetTop > 0 ? 70 : 4}`,
          end: 'bottom top+=150',
          onToggle: (self) => setStuck(self.isActive)
        })
      );
    }

    // The pinned column header sits right under the toolbar, whatever its height.
    let toolbarObserver: ResizeObserver | null = null;
    if (toolbarEl && displayEl) {
      const toolbar = toolbarEl;
      const display = displayEl;
      toolbarObserver = new ResizeObserver(() =>
        display.style.setProperty('--toolbar-height', `${toolbar.offsetHeight}px`)
      );
      toolbarObserver.observe(toolbar);
    }

    if (previewEl && motionOK() && finePointer()) {
      moveX = gsap.quickTo(previewEl, 'x', { duration: 0.45, ease: EASE.out });
      moveY = gsap.quickTo(previewEl, 'y', { duration: 0.45, ease: EASE.out });
      tilt = gsap.quickTo(previewEl, 'rotation', { duration: 0.5, ease: EASE.out });
    }

    window.addEventListener('scroll', hidePreview, { passive: true });

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      toolbarObserver?.disconnect();
      window.removeEventListener('scroll', hidePreview);
    };
  });

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
      if (openingEditAssetId) return;
      onView?.(asset.id);
      return;
    }

    if (action.handler === 'edit') {
      if (openingEditAssetId) return;
      onEdit?.(asset.id);
      return;
    }

    onArchive?.(asset.id);
  }

  function runSecondaryAction(asset: Asset, action: AssetActionDescriptor) {
    if (action.handler === 'view') {
      if (openingEditAssetId) return;
      onView?.(asset.id);
      return;
    }

    if (action.handler === 'edit') {
      if (openingEditAssetId) return;
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
    if (action.handler === 'view') return openingEditAssetId !== null;
    if (action.handler === 'edit') return openingEditAssetId !== null;
    return false;
  }

  function isActionLoading(asset: Asset, action: AssetActionDescriptor) {
    return action.handler === 'edit' && openingEditAssetId === asset.id;
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

  function getAssetDetailHref(id: string) {
    return `/assets/${id}`;
  }

  function handleLinkedActionClick(
    event: MouseEvent,
    asset: Asset,
    action: AssetActionDescriptor,
    source: 'primary' | 'secondary'
  ) {
    if (isActionDisabled(action)) {
      event.preventDefault();
      return;
    }

    if (source === 'primary') {
      runPrimaryAction(asset, action);
    } else {
      runSecondaryAction(asset, action);
    }
  }
</script>

<svelte:window bind:innerWidth />

<div class="assets-display" bind:this={displayEl}>
  <div class="section-header" bind:this={toolbarEl}>
    <div class="section-heading">
      <h2 class="section-title">Your Assets</h2>
      <p class="section-description">
        {filteredAssets.length}
        {filteredAssets.length === 1 ? 'asset' : 'assets'}{searchTerm.trim()
          ? ` of ${assets.length}`
          : ''}, grouped by type. Sorted by {getSortLabel().toLowerCase()}.
      </p>
    </div>
    <div class="section-actions">
      <div class="section-search">
        <Search
          {onSearch}
          value={searchTerm}
          placeholder="Filter by name, type or status"
          ariaLabel="Filter assets"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        aria-label={`Type groups in ${getTypeOrderLabel()} order. Click to reverse.`}
        title="Reverse the order of the type groups"
        onclick={toggleTypeSortDirection}
      >
        <Package size={16} />
        Type order {getTypeOrderLabel()}
      </Button>
      <Button
        variant={showPerformance ? 'secondary' : 'outline'}
        size="sm"
        aria-pressed={showPerformance}
        onclick={togglePerformance}
      >
        <BarChart3 size={16} />
        {showPerformance ? 'Hide' : 'Show'} performance columns
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
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="type-list"
      bind:this={listEl}
      onpointermove={handleListPointerMove}
      onpointerleave={hidePreview}
    >
      <!-- Desktop: one table for the whole portfolio. Types and statuses are
           labelled groups of rows, so every column lines up and the header,
           with its sort controls, appears once and stays pinned. -->
      <div class="desktop-only">
        <Card class="asset-table-card">
          <div class="table-container desktop-table">
            <Table class={showPerformance ? 'asset-table with-performance' : 'asset-table'}>
            <colgroup>
              <col class="thumb-col" />
              <col class="name-col" />
              <col class="status-col" />
              {#if showCategory}
                <col class="category-col" />
              {/if}
              <col class="submitted-col" />
              {#if showPrice}
                <col class="price-col" />
              {/if}
              {#if showPerformance}
                {#if VIEWER_DATA_AVAILABLE}
                  <col class="metric-col" />
                {/if}
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
                <TableHead class="status-head">Status</TableHead>
                {#if showCategory}
                  <TableHead class="category-head">Category</TableHead>
                {/if}
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
                {#if showPrice}
                  <TableHead class="price-head">Price</TableHead>
                {/if}
                {#if showPerformance}
                  {#if VIEWER_DATA_AVAILABLE}
                    <TableHead
                      align="right"
                      class="metric-head"
                      aria-sort={getAriaSort('uniqueViewers')}
                    >
                      <button
                        type="button"
                        class="sort-btn"
                        class:active={sortConfig.key === 'uniqueViewers'}
                        aria-label="Sort by viewers ({VIEWER_DATA_EPOCH_LABEL})"
                        title="Viewers {VIEWER_DATA_EPOCH_LABEL}"
                        onclick={() => requestSort('uniqueViewers')}
                      >
                        Viewers{getSortIndicator('uniqueViewers')}
                      </button>
                    </TableHead>
                  {/if}
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
                <TableHead align="center" class="more-head">
                  <span class="sr-only">More actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
              {#each groupedAssetsByType as typeGroup (typeGroup.type)}
                <TableBody class="type-body">
                  <TableRow class="type-row">
                    <TableCell class="type-row-cell" colspan={columnCount}>
                      <div class="type-header">
                        <h3 class="type-title">{typeGroup.type}</h3>
                        <span class="type-summary"
                          >{typeGroup.totalCount}
                          {typeGroup.totalCount === 1 ? 'asset' : 'assets'}</span
                        >
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
                {#each typeGroup.statuses as statusGroup (statusGroup.key)}
                  {@const statusAssets = statusGroup.assets}
                  {@const visibleAssets = getVisibleAssets(statusGroup.key, statusAssets)}
                  {@const normalizedStatus = normalizeAssetStatus(statusGroup.status)}
                  <!-- A total of one asset repeats the row above it, so it is left out. -->
                  {@const showTotals =
                    showPerformance &&
                    statusAssets.length > 1 &&
                    !['Upcoming', 'Rejected'].includes(normalizedStatus)}
                  {@const totals = showTotals ? statusGroup.totals : null}
                  <TableBody class="status-body">
                    {#each visibleAssets as asset (asset.id)}
                      <AssetTableRow
                        {asset}
                        {showPerformance}
                        {showCategory}
                        {showPrice}
                        isViewDisabled={openingEditAssetId !== null}
                        isEditDisabled={openingEditAssetId !== null}
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
                        <TableCell class="totals-label-cell" colspan={leadingColumns - 1}>
                          <strong>{normalizedStatus} total</strong>
                          <span>{statusAssets.length} assets</span>
                        </TableCell>
                        {#if VIEWER_DATA_AVAILABLE}
                          <TableCell class="metric-cell totals-metric"
                            ><strong>{totals.viewers.toLocaleString()}</strong></TableCell
                          >
                        {/if}
                        <TableCell class="metric-cell totals-metric"
                          ><strong>{totals.purchases.toLocaleString()}</strong></TableCell
                        >
                        <TableCell class="metric-cell totals-metric"
                          ><strong>${totals.revenue.toLocaleString()}</strong></TableCell
                        >
                        <TableCell class="more-cell"></TableCell>
                      </TableRow>
                    {/if}
                    {#if statusAssets.length > 10}
                      <TableRow class="show-more-row">
                        <TableCell colspan={columnCount}>
                          <div class="show-more">
                            <Button
                              variant="outline"
                              size="sm"
                              onclick={() => toggleGroup(statusGroup.key)}
                            >
                              {expandedGroups.includes(statusGroup.key)
                                ? `Show fewer ${normalizedStatus.toLowerCase()}`
                                : `Show ${statusAssets.length - 10} more ${normalizedStatus.toLowerCase()}`}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    {/if}
                  </TableBody>
                {/each}
              {/each}
            </Table>
          </div>
        </Card>
      </div>

      <!-- Mobile: cards, grouped by type and status. -->
      <div class="mobile-groups">
        {#each groupedAssetsByType as typeGroup (typeGroup.type)}
          <section class="type-section">
            <div class="type-header">
              <h3 class="type-title">{typeGroup.type}</h3>
              <span class="type-summary"
                >{typeGroup.totalCount} {typeGroup.totalCount === 1 ? 'asset' : 'assets'}</span
              >
            </div>
            {#each typeGroup.statuses as statusGroup (statusGroup.key)}
              {@const statusAssets = statusGroup.assets}
              {@const visibleAssets = getVisibleAssets(statusGroup.key, statusAssets)}
              {@const normalizedStatus = normalizeAssetStatus(statusGroup.status)}
              {@const config = statusConfig[normalizedStatus]}
              <section class="status-section">
                <div class="status-info">
                  <div class="status-icon {config?.bgClass || ''}">
                    {#if config?.icon}
                      <config.icon size={14} />
                    {:else}
                      <span>•</span>
                    {/if}
                  </div>
                  <h4 class="status-title">{normalizedStatus}</h4>
                  <span class="status-count"
                    >{statusAssets.length}
                    {statusAssets.length === 1 ? 'asset' : 'assets'}</span
                  >
                </div>

                <div class="mobile-cards">
                  {#each visibleAssets as asset (asset.id)}
                    {@const actionConfig = getAssetActionConfig(asset.status)}
                    <article class="asset-card-mobile">
                      <div class="mobile-header-row">
                        <div class="mobile-asset-meta">
                          <h4 class="mobile-asset-name">
                            <a
                              class="mobile-asset-name-link"
                              href={getAssetDetailHref(asset.id)}
                              aria-disabled={openingEditAssetId !== null}
                              onmouseenter={() => onPreloadView?.(asset.id)}
                              onfocus={() => onPreloadView?.(asset.id)}
                              onclick={(event) => {
                                if (openingEditAssetId !== null) {
                                  event.preventDefault();
                                  return;
                                }
                                onView?.(asset.id);
                              }}>{asset.name}</a
                            >
                          </h4>
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
                        {#if showPerformance && !['Upcoming', 'Rejected'].includes(normalizeAssetStatus(asset.status))}
                          {#if VIEWER_DATA_AVAILABLE}
                            <div>
                              <span class="mobile-label">Viewers</span>
                              <span class="mobile-value"
                                >{asset.uniqueViewers?.toLocaleString() ?? '—'}</span
                              >
                            </div>
                          {/if}
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
                        {#if actionConfig.primary.handler === 'view'}
                          <LinkButton
                            href={getAssetDetailHref(asset.id)}
                            size="sm"
                            variant="default"
                            aria-disabled={isActionDisabled(actionConfig.primary)}
                            tabindex={isActionDisabled(actionConfig.primary) ? -1 : undefined}
                            onmouseenter={() => preloadViewAction(asset, actionConfig.primary)}
                            onfocus={() => preloadViewAction(asset, actionConfig.primary)}
                            onclick={(event) =>
                              handleLinkedActionClick(event, asset, actionConfig.primary, 'primary')}
                          >
                            {actionConfig.primary.label}
                          </LinkButton>
                        {:else}
                          <Button
                            size="sm"
                            variant={actionConfig.primary.handler === 'edit' ? 'default' : 'secondary'}
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
                        {/if}
                        {#each actionConfig.secondary as action}
                          {#if action.handler === 'view'}
                            <LinkButton
                              href={getAssetDetailHref(asset.id)}
                              size="sm"
                              variant="outline"
                              aria-disabled={isActionDisabled(action)}
                              tabindex={isActionDisabled(action) ? -1 : undefined}
                              onmouseenter={() => preloadViewAction(asset, action)}
                              onfocus={() => preloadViewAction(asset, action)}
                              onclick={(event) =>
                                handleLinkedActionClick(event, asset, action, 'secondary')}
                            >
                              {action.label}
                            </LinkButton>
                          {:else}
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
                          {/if}
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
              </section>
            {/each}
          </section>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Follows the pointer over an asset's thumbnail (see handleListPointerMove). -->
  <div class="thumb-preview" bind:this={previewEl} aria-hidden="true">
    <img bind:this={previewImgEl} alt="" />
  </div>
</div>

<style>
  .assets-display {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  /* Toolbar: pins under the header so search and sort stay in reach on a long list. */
  .section-header {
    position: sticky;
    top: var(--header-offset, 4.0625rem);
    z-index: 30;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-inline: calc(var(--space-md) * -1);
    padding: 0.7rem var(--space-md);
    background: var(--color-bg-pure);
    border-bottom: 1px solid transparent;
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      box-shadow var(--duration-standard) var(--ease-standard);
  }

  /* Set by ScrollTrigger while the toolbar is pinned. */
  .section-header:global(.is-stuck) {
    border-bottom-color: var(--color-shell-border-default);
  }

  /* While pinned, the column header casts a soft edge over the rows passing under it. */
  .section-header:global(.is-stuck) ~ :global(.type-list .table-head) {
    box-shadow:
      inset 0 -1px 0 var(--color-shell-border-default),
      0 6px 10px -8px rgba(8, 8, 8, 0.22);
  }

  .section-heading {
    display: flex;
    flex-direction: column;
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
    padding-top: 0.3rem;
    overflow: hidden;
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .section-search {
    flex: 0 1 auto;
    width: 18.5rem;
    max-width: 100%;
  }

  .type-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .type-section {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .type-header {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .type-title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 0.875rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.01em;
    color: var(--color-fg-primary);
  }

  .mobile-groups .type-title {
    font-size: 1.1rem;
  }

  .type-summary,
  .status-count {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .mobile-groups {
    display: none;
    flex-direction: column;
    gap: var(--space-md);
  }

  .status-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
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
    gap: 0.5rem;
  }

  .status-icon {
    width: 1.25rem;
    height: 1.25rem;
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
    color: var(--color-info-ink);
  }

  .status-icon.status-published {
    background: var(--color-success-muted);
    color: var(--color-success-ink);
  }

  .status-icon.status-upcoming {
    background: color-mix(in srgb, var(--color-data-3) 20%, transparent);
    color: var(--color-data-3-ink);
  }

  .status-icon.status-delisted {
    background: var(--color-warning-muted);
    color: var(--color-warning-ink);
  }

  .status-icon.status-rejected {
    background: var(--color-error-muted);
    color: var(--color-error-ink);
  }

  .status-icon.status-draft {
    background: var(--color-bg-subtle);
    color: var(--color-fg-tertiary);
  }

  .status-title {
    font-family: var(--font-heading);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    letter-spacing: 0.01em;
    color: var(--color-fg-primary);
    margin: 0;
  }

  @media (max-width: 900px) {
    .section-header {
      position: static;
      align-items: stretch;
      margin-inline: 0;
      padding: 0;
      background: transparent;
      backdrop-filter: none;
    }

    .section-actions {
      align-items: stretch;
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

  /* No clipping on the desktop table, so its header can pin under the toolbar. */
  .table-container,
  :global(.desktop-table .table-wrapper) {
    overflow: visible;
  }

  :global(.desktop-table .asset-table) {
    table-layout: fixed;
  }

  :global(.desktop-table .table-cell) {
    padding: 0.4rem 0.75rem;
    border-bottom-color: color-mix(in srgb, var(--color-border-default) 64%, transparent);
    letter-spacing: 0;
  }

  /* Rows are opaque so one can pass over another when the order changes. */
  :global(.desktop-table .table-row) {
    position: relative;
    background: var(--color-bg-surface);
    border-bottom-color: color-mix(in srgb, var(--color-border-default) 58%, transparent);
  }

  :global(.desktop-table .asset-table-row:hover) {
    background: color-mix(in srgb, var(--color-hover) 45%, var(--color-bg-surface));
  }

  :global(.desktop-table .asset-table-row:focus-within) {
    background: color-mix(in srgb, var(--color-info-muted) 14%, var(--color-bg-surface));
  }

  /* Column header: pinned under the toolbar, so sorting is always in reach. */
  :global(.desktop-table thead .table-row),
  :global(.desktop-table thead .table-row:hover) {
    background: transparent;
    border-bottom: 0;
  }

  :global(.desktop-table .table-head) {
    position: sticky;
    top: calc(var(--header-offset, 4.0625rem) + var(--toolbar-height, 4.25rem));
    z-index: 5;
    height: 2.25rem;
    padding: 0;
    background: var(--color-bg-surface);
    border-bottom: 0;
    box-shadow: inset 0 -1px 0 var(--color-shell-border-default);
    letter-spacing: 0;
    text-transform: none;
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
  }

  :global(.desktop-table .table-head:first-child) {
    border-top-left-radius: var(--radius-md);
  }

  :global(.desktop-table .table-head:last-child) {
    border-top-right-radius: var(--radius-md);
  }

  :global(.desktop-table .table-head-inner) {
    padding: 0.14rem 0.75rem;
  }

  /* Type label: opens each type's rows and pins under the column header,
     so the group in view is always named. */
  :global(.desktop-table .type-row),
  :global(.desktop-table .type-row:hover) {
    background: transparent;
    border-bottom: 0;
  }

  :global(.desktop-table .type-row .table-cell) {
    position: sticky;
    /* 1px under the column header, so no row shows between the two. */
    top: calc(var(--header-offset, 4.0625rem) + var(--toolbar-height, 4.25rem) + 2.25rem - 1px);
    z-index: 4;
    padding: 0.4rem 0.9rem;
    background: color-mix(in srgb, var(--color-bg-subtle) 55%, var(--color-bg-surface));
    border-bottom: 1px solid var(--color-shell-border-default);
  }

  :global(.desktop-table .type-body:not(:first-of-type) .type-row .table-cell) {
    border-top: 1px solid var(--color-shell-border-default);
  }

  :global(.desktop-table .show-more-row:hover) {
    background: var(--color-bg-surface);
  }

  :global(.desktop-table tbody:last-child .table-row:last-child .table-cell) {
    border-bottom: 0;
  }

  :global(.desktop-table tbody:last-child .table-row:last-child),
  :global(.desktop-table tbody:last-child .table-row:last-child .table-cell:first-child) {
    border-bottom-left-radius: var(--radius-md);
  }

  :global(.desktop-table tbody:last-child .table-row:last-child .table-cell:last-child) {
    border-bottom-right-radius: var(--radius-md);
  }

  /* Fixed widths for every column but the name, which takes what is left. */
  :global(.desktop-table col.thumb-col) {
    width: 3.9rem;
  }

  :global(.desktop-table col.status-col) {
    width: 8.5rem;
  }

  :global(.desktop-table col.category-col) {
    width: 23%;
  }

  :global(.desktop-table col.submitted-col) {
    width: 9rem;
  }

  :global(.desktop-table col.price-col) {
    width: 7rem;
  }

  :global(.desktop-table col.metric-col) {
    width: 7rem;
  }

  :global(.desktop-table .price-head .table-head-inner) {
    justify-content: flex-end;
  }

  :global(.desktop-table .metric-head .sort-btn),
  :global(.desktop-table .metric-head .revenue-header) {
    white-space: nowrap;
  }

  :global(.desktop-table col.more-col) {
    width: 3.5rem;
  }

  :global(.desktop-table .with-performance col.category-col) {
    width: 16%;
  }

  :global(.desktop-table .with-performance col.status-col) {
    width: 7.5rem;
  }

  :global(.desktop-table .with-performance col.price-col) {
    width: 6rem;
  }

  :global(.desktop-table td.thumbnail-cell) {
    padding-left: 0.9rem;
    padding-right: 0.28rem;
  }

  :global(.desktop-table td.asset-title-cell) {
    padding-left: 0.34rem;
  }

  :global(.desktop-table th.asset-title-head .table-head-inner) {
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

  /* Sort control: reads as a column label first; the arrow marks the active sort. */
  .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin: -0.2rem -0.4rem;
    padding: 0.2rem 0.4rem;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition:
      color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .sort-btn:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-subtle);
  }

  .sort-btn.active {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .sort-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .show-more {
    display: flex;
    justify-content: center;
    padding: 0.35rem;
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
    width: 32px;
    height: 32px;
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
    display: grid;
    gap: var(--space-sm);
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

  .mobile-asset-name-link {
    color: inherit;
    text-decoration: none;
  }

  .mobile-asset-name-link:hover {
    text-decoration: underline;
    text-underline-offset: 0.16rem;
  }

  .mobile-asset-name-link:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
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

  .button-spinner {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 900px) {
    .desktop-only {
      display: none;
    }

    .mobile-groups {
      display: flex;
    }
  }

  :global(.desktop-table th.more-head),
  :global(.desktop-table td.more-cell) {
    text-align: center;
  }

  /* Pointer preview. GSAP owns its transform and visibility. */
  .thumb-preview {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 80;
    width: 184px;
    height: 236px;
    visibility: hidden;
    pointer-events: none;
    overflow: hidden;
    border-radius: 0.75rem;
    border: 1px solid var(--color-shell-border-strong);
    background: var(--color-bg-subtle);
    box-shadow: var(--shadow-lg), 0 2px 6px rgba(8, 8, 8, 0.08);
    will-change: transform;
  }

  .thumb-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
  }
</style>
