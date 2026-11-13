<script lang="ts">
  import type { PageData } from './$types';
  import type { Asset, AssetUpdateData } from '$lib/server/airtable';
  import { goto, invalidate, preloadData } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import {
    Button,
    Dialog,
    AssetsDisplay,
    AssetWorkQueue,
    OverviewStats,
    SubmissionTracker,
    DataFreshnessIndicator
  } from '$lib/components';
  import { toast } from '$lib/stores/toast';
  import { trackEvent } from '$lib/utils/analytics';
  import { getPortfolioTitle } from '$lib/utils/portfolio-title';
  import { getActionableAssetWorkQueue } from '$lib/utils/asset-actions';
  import { ArrowDown, ChartNoAxesColumn, LoaderCircle, ShieldCheck } from 'lucide-svelte';
  import { reveal } from '$lib/motion/actions';

  let { data }: { data: PageData } = $props();

  let searchTerm = $state('');
  let isEditModalOpen = $state(false);
  let openingEditAssetId = $state<string | null>(null);
  let currentEditingAsset = $state<Asset | null>(null);
  let archiveConfirmAssetId = $state<string | null>(null);
  let isArchivingAsset = $state(false);
  const preloadedAssetDetailIds = new Set<string>();

  // Lazy-loaded modal components
  // NOTE: Svelte 5 dynamic component typing is a bit different; keep this permissive for lazy-loading.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let EditAssetModal = $state<any>(null);

  const publishedCount = $derived(
    (data.assets || []).filter((asset) => asset.status === 'Published').length
  );
  const delistedCount = $derived(
    (data.assets || []).filter((asset) => asset.status === 'Delisted').length
  );
  const scheduledCount = $derived(
    (data.assets || []).filter((asset) => ['Scheduled', 'Upcoming'].includes(asset.status)).length
  );
  const rejectedCount = $derived(
    (data.assets || []).filter((asset) => asset.status === 'Rejected').length
  );
  const draftCount = $derived(
    (data.assets || []).filter((asset) => asset.status === 'Draft').length
  );
  // Zero counts are left out, except Published: a portfolio always reports it.
  const portfolioCounts = $derived(
    [
      { key: 'published', label: 'Published', count: publishedCount, always: true },
      { key: 'scheduled', label: 'Scheduled', count: scheduledCount },
      { key: 'draft', label: 'Draft', count: draftCount },
      { key: 'rejected', label: 'Rejected', count: rejectedCount },
      { key: 'delisted', label: 'Delisted', count: delistedCount }
    ].filter((entry) => entry.always || entry.count > 0)
  );
  const uniqueAssetTypes = $derived(
    Array.from(new Set((data.assets || []).map((asset) => asset.type).filter(Boolean)))
  );
  const heroAssetLabel = $derived(
    uniqueAssetTypes.length === 1 ? uniqueAssetTypes[0].toLowerCase() : 'asset'
  );
  const heroAssetLabelPlural = $derived(
    heroAssetLabel === 'library'
      ? 'libraries'
      : heroAssetLabel === 'asset'
        ? 'assets'
        : `${heroAssetLabel}s`
  );
  const heroSubtitle = $derived(
    heroAssetLabel === 'asset'
      ? 'Track published assets, upcoming submissions, and marketplace signals in one place.'
      : `Track published ${heroAssetLabelPlural}, upcoming submissions, and marketplace signals in one place.`
  );
  const portfolioTitle = $derived(getPortfolioTitle(data.assets || []));
  const actionableAssetWorkQueue = $derived(getActionableAssetWorkQueue(data.assets || []));
  const openingEditAssetName = $derived(
    (data.assets || []).find((asset) => asset.id === openingEditAssetId)?.name ?? 'asset'
  );
  const archiveConfirmAssetName = $derived(
    (data.assets || []).find((asset) => asset.id === archiveConfirmAssetId)?.name ?? 'this asset'
  );

  function handleSearch(term: string) {
    searchTerm = term;
  }

  function getAssetDetailHref(id: string) {
    return `/assets/${id}`;
  }

  function preloadAssetDetail(id: string) {
    if (preloadedAssetDetailIds.has(id)) return;

    preloadedAssetDetailIds.add(id);
    void preloadData(getAssetDetailHref(id)).catch(() => {
      preloadedAssetDetailIds.delete(id);
    });
  }

  function handleViewAsset(id: string) {
    if (openingEditAssetId) return;

    const selectedAsset = (data.assets || []).find((asset) => asset.id === id);
    trackEvent('dashboard_asset_opened', {
      asset_id: id,
      asset_status: selectedAsset?.status,
      asset_category: selectedAsset?.category,
      asset_subcategory: selectedAsset?.subcategory
    });
  }

  async function loadEditAssetModal() {
    if (EditAssetModal) return;

    const module = await import('$lib/components/EditAssetModal.svelte');
    EditAssetModal = module.default;
  }

  async function handleEditAsset(id: string) {
    if (openingEditAssetId) return;

    const selectedAsset = (data.assets || []).find((asset) => asset.id === id);
    trackEvent('dashboard_asset_edit_opened', {
      asset_id: id,
      asset_status: selectedAsset?.status,
      asset_category: selectedAsset?.category,
      asset_subcategory: selectedAsset?.subcategory
    });

    openingEditAssetId = id;
    currentEditingAsset = null;
    try {
      const [, response] = await Promise.all([
        loadEditAssetModal(),
        // Fetch full asset details (includes short + long description fields)
        fetch(`/api/assets/${id}`)
      ]);
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorData.message || 'Failed to load asset details');
      }
      const result = (await response.json()) as { asset: Asset };
      currentEditingAsset = result.asset;
      isEditModalOpen = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load asset details';
      toast.error(message);
      currentEditingAsset = null;
      isEditModalOpen = false;
    } finally {
      openingEditAssetId = null;
    }
  }

  async function handleEditClose() {
    isEditModalOpen = false;
    // Let the dynamic editor unmount before releasing its asset prop. The
    // Dialog's close handler still evaluates reactive modal state in this
    // render turn; clearing the asset first can leave it dereferencing null.
    await tick();
    currentEditingAsset = null;
  }

  async function handleEditSave(updateData: AssetUpdateData): Promise<{ versionWarning?: string }> {
    if (!currentEditingAsset) return {};

    const response = await fetch(`/api/assets/${currentEditingAsset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(errorData.message || 'Failed to update asset');
    }

    const result = (await response.json().catch(() => ({}))) as { versionWarning?: string };
    // The editor finishes its success bookkeeping before calling onClose. If
    // the dashboard clears currentEditingAsset here, that bookkeeping can
    // dereference a null asset after a successful save.
    await handleRefreshAssets();
    return { versionWarning: result.versionWarning };
  }

  function handleArchiveAsset(id: string) {
    // Destructive action: ask for confirmation first (matches the asset detail flow).
    archiveConfirmAssetId = id;
  }

  async function confirmArchiveAsset() {
    if (!archiveConfirmAssetId || isArchivingAsset) return;
    const id = archiveConfirmAssetId;

    isArchivingAsset = true;
    try {
      const response = await fetch(`/api/assets/${id}/archive`, { method: 'POST' });
      if (response.ok) {
        toast.success('Asset archived successfully');
        archiveConfirmAssetId = null;
        // Await invalidate to ensure data refresh completes
        await invalidate('app:assets');
      } else {
        const errorData = (await response.json().catch(() => ({}))) as { message?: string };
        toast.error(errorData.message || 'Failed to archive asset');
      }
    } catch {
      toast.error('Failed to archive asset');
    } finally {
      isArchivingAsset = false;
    }
  }

  async function handleRefreshAssets() {
    trackEvent('dashboard_assets_refreshed', { source: 'manual' });
    // Drop the server-side cache first so the reload hits Airtable for fresh data.
    await fetch('/api/assets/cache', { method: 'DELETE' }).catch(() => {});
    await invalidate('app:assets');
  }

  function handleReviewAssets() {
    trackEvent('dashboard_quick_action_clicked', { action: 'review_assets' });
    document
      .getElementById('asset-portfolio')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleOpenValidation() {
    trackEvent('dashboard_quick_action_clicked', { action: 'open_validation' });
    goto('/validation');
  }

  function handleExploreMarketplace() {
    trackEvent('dashboard_quick_action_clicked', { action: 'explore_marketplace' });
    goto('/marketplace');
  }

  onMount(() => {
    const assets = data.assets || [];
    trackEvent('dashboard_loaded', {
      total_assets: assets.length,
      published_assets: assets.filter((asset) => asset.status === 'Published').length,
      draft_assets: assets.filter((asset) => asset.status === 'Draft').length
    });

    const preloadTimer = window.setTimeout(() => {
      void loadEditAssetModal();
    }, 750);

    return () => window.clearTimeout(preloadTimer);
  });
</script>

<svelte:head>
  <title>Dashboard | Webflow Asset Dashboard</title>
</svelte:head>

<div class="dashboard">
  <main class="main-content">
    <div class="content-wrapper">
      <section class="overview-section">
        <div class="overview-top">
          <div class="page-header page-intro--dashboard">
            <div class="header-text">
              <h1 class="page-title page-intro__title" data-reveal use:reveal={{ kind: 'lines' }}>
                {portfolioTitle}
              </h1>
              <p class="page-subtitle page-intro__subtitle" data-reveal use:reveal>
                {heroSubtitle}
                <DataFreshnessIndicator variant="tooltip" />
              </p>
              <!-- The total leads; the status counts that follow are its parts. -->
              <dl class="portfolio-evidence" aria-label="Portfolio summary" data-reveal use:reveal>
                <div class="evidence-item evidence-item--total">
                  <dt>Total assets</dt>
                  <dd>{(data.assets || []).length}</dd>
                </div>
                {#each portfolioCounts as entry (entry.key)}
                  <div class="evidence-item evidence-item--{entry.key}">
                    <dt>{entry.label}</dt>
                    <dd>{entry.count}</dd>
                  </div>
                {/each}
              </dl>
              <div class="quick-actions" data-reveal use:reveal>
                <Button size="sm" onclick={handleReviewAssets}>
                  Review assets
                  <ArrowDown size={15} class="action-icon action-icon--down" />
                </Button>
                <Button variant="outline" size="sm" onclick={handleOpenValidation}>
                  <ShieldCheck size={15} class="action-icon" />
                  Open validation
                </Button>
                {#if data.hasTemplateAsset}
                  <Button variant="outline" size="sm" onclick={handleExploreMarketplace}>
                    <ChartNoAxesColumn size={15} class="action-icon" />
                    Explore marketplace
                  </Button>
                {/if}
              </div>

              <!-- Next actions sit with the summary, in the first screen. -->
              <div class="queue-slot">
                <AssetWorkQueue
                  items={actionableAssetWorkQueue}
                  {openingEditAssetId}
                  onView={handleViewAsset}
                  onPreloadView={preloadAssetDetail}
                  onEdit={handleEditAsset}
                />
              </div>
            </div>

            <!-- Two columns, each a stack. The last card in each grows, so both end level. -->
            <OverviewStats assets={data.assets || []} panel="performance" />
          </div>
          <div class="submission-column">
            <div class="submission-slot" data-reveal use:reveal={{ delay: 0.12 }}>
              <SubmissionTracker assets={data.assets || []} userEmail={data.user?.email} />
            </div>
            <OverviewStats assets={data.assets || []} panel="distribution" />
          </div>
        </div>
      </section>

      <section class="assets-section" id="asset-portfolio" data-reveal use:reveal>
        <AssetsDisplay
          assets={data.assets || []}
          errorMessage={data.assetsError}
          {searchTerm}
          onSearch={handleSearch}
          onView={handleViewAsset}
          onEdit={handleEditAsset}
          onArchive={handleArchiveAsset}
          onRefresh={handleRefreshAssets}
          onPreloadView={preloadAssetDetail}
          {openingEditAssetId}
        />
      </section>
    </div>
  </main>

  {#if openingEditAssetId && !isEditModalOpen}
    <Dialog
      isOpen={true}
      onClose={() => undefined}
      title={`Edit ${openingEditAssetName}`}
      size="xl"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <div class="edit-loading-state" role="status" aria-live="polite">
        <LoaderCircle size={22} class="loading-spinner" />
        <div>
          <p class="edit-loading-title">Opening editor</p>
          <p class="edit-loading-copy">Loading the latest marketplace fields.</p>
        </div>
      </div>
    </Dialog>
  {/if}

  {#if isEditModalOpen && currentEditingAsset && EditAssetModal}
    {@const AssetModal = EditAssetModal}
    <AssetModal asset={currentEditingAsset} onClose={handleEditClose} onSave={handleEditSave} />
  {/if}

  <Dialog
    isOpen={archiveConfirmAssetId !== null}
    onClose={() => {
      if (!isArchivingAsset) archiveConfirmAssetId = null;
    }}
    title="Archive this asset?"
    size="sm"
  >
    <div class="confirm-dialog">
      <p>
        <strong>{archiveConfirmAssetName}</strong> will be archived and removed from the active dashboard
        workflow. This action cannot be undone here.
      </p>
      <div class="confirm-actions">
        <Button
          variant="secondary"
          onclick={() => (archiveConfirmAssetId = null)}
          disabled={isArchivingAsset}
        >
          Cancel
        </Button>
        <Button variant="destructive" onclick={confirmArchiveAsset} disabled={isArchivingAsset}>
          {isArchivingAsset ? 'Archiving...' : 'Archive asset'}
        </Button>
      </div>
    </div>
  </Dialog>
</div>

<style>
  .dashboard {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .main-content {
    padding: var(--space-lg) var(--space-md);
  }

  .content-wrapper {
    max-width: var(--layout-content-max-width);
    margin: 0 auto;
  }

  .confirm-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .confirm-dialog p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  .edit-loading-state {
    min-height: 18rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    color: var(--color-fg-secondary);
  }

  .edit-loading-title {
    margin: 0;
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .edit-loading-copy {
    margin: 0.15rem 0 0;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  :global(.loading-spinner) {
    color: var(--color-info-ink);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* One gap between every block on the page. */
  .overview-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
    margin: 0;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding-top: 0.35rem;
  }

  .queue-slot {
    align-self: stretch;
    padding-top: 1.6rem;
  }

  .queue-slot:empty {
    display: none;
  }

  .page-subtitle :global(*) {
    display: inline-flex;
    vertical-align: middle;
  }

  /* Portfolio counts: one row of figures, each keyed to its status color. */
  .portfolio-evidence {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 1.1rem 0;
    margin: 1.5rem 0 0;
    padding: 0;
  }

  .evidence-item {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.3rem;
    padding-inline: 1.25rem;
    border-left: 1px solid var(--color-shell-border-default);
  }

  .evidence-item:first-child {
    padding-left: 0;
    border-left: 0;
  }

  .evidence-item dt {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8125rem;
    color: var(--color-fg-tertiary);
    white-space: nowrap;
  }

  .evidence-item dt::before {
    content: '';
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 999px;
    background: var(--evidence-color, var(--color-fg-subtle));
  }

  .evidence-item--published {
    --evidence-color: var(--color-success);
  }

  .evidence-item--scheduled {
    --evidence-color: var(--color-info);
  }

  .evidence-item--rejected {
    --evidence-color: var(--color-error);
  }

  .evidence-item--delisted {
    --evidence-color: var(--color-warning);
  }

  .evidence-item--total dt::before {
    display: none;
  }

  .evidence-item--total {
    padding-right: 1.75rem;
  }

  .evidence-item--total + .evidence-item {
    padding-left: 1.75rem;
    border-left-color: var(--color-border-emphasis);
  }

  .evidence-item:not(.evidence-item--total) dd {
    font-size: 1.3rem;
    color: var(--color-fg-secondary);
  }

  .evidence-item dd {
    margin: 0;
    font-family: var(--font-heading);
    font-size: 1.6rem;
    font-weight: var(--font-semibold);
    line-height: 1;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: var(--color-fg-primary);
  }

  .overview-top {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(24rem, 0.9fr);
    gap: var(--space-md) var(--space-lg);
    align-items: stretch;
  }

  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 1.6rem;
  }

  .quick-actions :global(.btn) {
    min-height: 2.5rem;
    padding-inline: 0.95rem;
    font-size: var(--text-body-sm);
  }

  .quick-actions :global(.btn-outline) {
    color: var(--color-fg-secondary);
    border-color: var(--color-border-emphasis);
  }

  .quick-actions :global(.action-icon) {
    flex-shrink: 0;
    transition: transform var(--duration-standard) var(--ease-standard);
  }

  .quick-actions :global(.btn-outline .action-icon) {
    color: var(--color-fg-muted);
  }

  .quick-actions :global(.btn-outline:hover .action-icon) {
    color: var(--color-info-ink);
  }

  .quick-actions :global(.btn:hover .action-icon--down) {
    transform: translateY(2px);
  }

  .submission-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  .submission-slot {
    display: flex;
  }

  .assets-section {
    margin-bottom: var(--space-xl);
  }

  /* One column: summary, then submission status (can I submit?), then the
     two stat cards. The column wrappers dissolve so their children can reorder. */
  @media (max-width: 1100px) {
    .overview-top {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    }

    .page-header,
    .submission-column {
      display: contents;
    }

    .header-text {
      order: 1;
    }

    .submission-slot {
      order: 2;
    }

    .page-header > :global(.overview-stats) {
      order: 3;
    }

    .submission-column > :global(.overview-stats) {
      order: 4;
    }
  }

  @media (max-width: 640px) {
    .main-content {
      padding: var(--space-md);
    }

    .overview-section {
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }

    .page-header {
      padding-bottom: 0;
    }

    /* Three even columns; the divider belongs to the grid, not to each item. */
    .portfolio-evidence {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem 0;
      width: 100%;
      margin-top: 1.2rem;
    }

    .evidence-item,
    .evidence-item:first-child {
      padding-inline: 0.85rem;
      border-left: 1px solid var(--color-shell-border-default);
    }

    .evidence-item:nth-child(3n + 1) {
      padding-left: 0;
      border-left: 0;
    }

    .evidence-item dd,
    .evidence-item:not(.evidence-item--total) dd {
      font-size: 1.3rem;
    }

    .evidence-item--total,
    .evidence-item--total + .evidence-item {
      padding-inline: 0.85rem;
      border-left-color: var(--color-shell-border-default);
    }

    .evidence-item--total {
      padding-left: 0;
    }

    .queue-slot {
      padding-top: 1.25rem;
    }

    .quick-actions {
      width: 100%;
      margin-top: 1.2rem;
    }

    .quick-actions :global(button) {
      flex: 1 1 auto;
    }

    .page-title {
      font-size: var(--text-h3);
    }

    .assets-section {
      margin-bottom: var(--space-lg);
    }
  }
</style>
