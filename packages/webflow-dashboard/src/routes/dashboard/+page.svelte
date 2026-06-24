<script lang="ts">
  import type { PageData } from './$types';
  import type { Asset, AssetUpdateData } from '$lib/server/airtable';
  import { goto, invalidate, preloadData } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    Header,
    Button,
    Dialog,
    AssetsDisplay,
    OverviewStats,
    SubmissionTracker,
    DataFreshnessIndicator
  } from '$lib/components';
  import { toast } from '$lib/stores/toast';
  import { trackEvent } from '$lib/utils/analytics';
  import { getPortfolioTitle } from '$lib/utils/portfolio-title';
  import { LoaderCircle } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();

  let searchTerm = $state('');
  let isProfileOpen = $state(false);
  let isEditModalOpen = $state(false);
  let openingViewAssetId = $state<string | null>(null);
  let openingEditAssetId = $state<string | null>(null);
  let currentEditingAsset = $state<Asset | null>(null);
  let archiveConfirmAssetId = $state<string | null>(null);
  let isArchivingAsset = $state(false);
  const preloadedAssetDetailIds = new Set<string>();

  // Lazy-loaded modal components
  // NOTE: Svelte 5 dynamic component typing is a bit different; keep this permissive for lazy-loading.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let EditProfileModal = $state<any>(null);
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
  const openingViewAssetName = $derived(
    (data.assets || []).find((asset) => asset.id === openingViewAssetId)?.name ?? 'asset'
  );
  const openingEditAssetName = $derived(
    (data.assets || []).find((asset) => asset.id === openingEditAssetId)?.name ?? 'asset'
  );
  const archiveConfirmAssetName = $derived(
    (data.assets || []).find((asset) => asset.id === archiveConfirmAssetId)?.name ?? 'this asset'
  );

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function handleSearch(term: string) {
    searchTerm = term;
  }

  async function handleProfileClick() {
    // Lazy load the EditProfileModal component
    if (!EditProfileModal) {
      const module = await import('$lib/components/EditProfileModal.svelte');
      EditProfileModal = module.default;
    }
    isProfileOpen = true;
  }

  function handleProfileClose() {
    isProfileOpen = false;
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
    if (openingViewAssetId || openingEditAssetId) return;

    const selectedAsset = (data.assets || []).find((asset) => asset.id === id);
    trackEvent('dashboard_asset_opened', {
      asset_id: id,
      asset_status: selectedAsset?.status,
      asset_category: selectedAsset?.category,
      asset_subcategory: selectedAsset?.subcategory
    });

    openingViewAssetId = id;
    void goto(getAssetDetailHref(id)).catch(() => {
      openingViewAssetId = null;
      toast.error('Failed to open asset details');
    });
  }

  async function loadEditAssetModal() {
    if (EditAssetModal) return;

    const module = await import('$lib/components/EditAssetModal.svelte');
    EditAssetModal = module.default;
  }

  async function handleEditAsset(id: string) {
    if (openingEditAssetId || openingViewAssetId) return;

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

  function handleEditClose() {
    isEditModalOpen = false;
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
      const errorData = (await response.json()) as { message?: string };
      throw new Error(errorData.message || 'Failed to update asset');
    }

    const result = (await response.json().catch(() => ({}))) as { versionWarning?: string };
    handleEditClose();
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
        const errorData = (await response.json()) as { message?: string };
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
  <Header
    onLogout={handleLogout}
    onProfileClick={handleProfileClick}
    showMarketplace={data.hasTemplateAsset}
  />

  <main class="main-content">
    <div class="content-wrapper">
      <section class="overview-section">
        <div class="overview-top">
          <div class="page-header page-intro page-intro--dashboard">
            <div class="header-text">
              <span class="page-kicker">Portfolio overview</span>
              <h1 class="page-title page-intro__title">{portfolioTitle}</h1>
              <p class="page-subtitle page-intro__subtitle">
                {heroSubtitle}
                <DataFreshnessIndicator variant="tooltip" />
              </p>
              <div class="intro-support">
                <div class="portfolio-evidence" aria-label="Portfolio summary">
                  <span><strong>{publishedCount}</strong> published</span>
                  <span><strong>{delistedCount}</strong> delisted</span>
                  {#if scheduledCount > 0}
                    <span><strong>{scheduledCount}</strong> scheduled</span>
                  {/if}
                  {#if rejectedCount > 0}
                    <span><strong>{rejectedCount}</strong> rejected</span>
                  {/if}
                  <span><strong>{(data.assets || []).length}</strong> total assets</span>
                </div>
                <div class="quick-actions">
                  <Button variant="secondary" size="sm" onclick={handleReviewAssets}
                    >Review assets</Button
                  >
                  <Button variant="outline" size="sm" onclick={handleOpenValidation}
                    >Open validation</Button
                  >
                  {#if data.hasTemplateAsset}
                    <Button variant="outline" size="sm" onclick={handleExploreMarketplace}
                      >Explore marketplace</Button
                    >
                  {/if}
                </div>
              </div>
            </div>
          </div>
          <div class="submission-column">
            <SubmissionTracker assets={data.assets || []} userEmail={data.user?.email} />
          </div>
        </div>

        <div class="dashboard-summary-grid">
          <OverviewStats assets={data.assets || []} />
        </div>
      </section>

      <section class="assets-section" id="asset-portfolio">
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
          {openingViewAssetId}
          {openingEditAssetId}
        />
      </section>
    </div>
  </main>

  {#if isProfileOpen && EditProfileModal}
    {@const ProfileModal = EditProfileModal}
    <ProfileModal onClose={handleProfileClose} />
  {/if}

  {#if openingViewAssetId}
    <div class="navigation-loading" role="status" aria-live="polite">
      <LoaderCircle size={18} class="navigation-loading-spinner" />
      <span>Opening {openingViewAssetName}</span>
    </div>
  {/if}

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
        <strong>{archiveConfirmAssetName}</strong> will be archived and removed from the active
        dashboard workflow. This action cannot be undone here.
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
    color: var(--color-info);
    animation: spin 0.8s linear infinite;
  }

  .navigation-loading {
    position: fixed;
    top: 5.25rem;
    right: var(--space-md);
    z-index: 1100;
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    max-width: min(24rem, calc(100vw - 2rem));
    padding: 0.75rem 0.95rem;
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
  }

  .navigation-loading span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.navigation-loading-spinner) {
    flex-shrink: 0;
    color: var(--color-info);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .overview-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .page-header {
    margin: 0;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    justify-content: center;
    max-width: 37.5rem;
  }

  .page-kicker {
    display: inline-flex;
    align-items: center;
    margin-bottom: 0.65rem;
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .page-subtitle :global(*) {
    display: inline-flex;
    vertical-align: middle;
  }

  .portfolio-evidence {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.85rem;
    color: var(--color-fg-tertiary);
    font-size: 0.98rem;
    line-height: 1.4;
  }

  .portfolio-evidence span {
    position: relative;
    white-space: nowrap;
  }

  .portfolio-evidence span:not(:first-child)::before {
    content: '•';
    color: var(--color-fg-muted);
    margin-right: 0.85rem;
  }

  .portfolio-evidence strong {
    font-variant-numeric: tabular-nums;
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  .overview-top {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(23rem, 0.95fr);
    gap: var(--space-md);
    align-items: stretch;
  }

  .intro-support {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    margin-top: 1.15rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--color-shell-border-default);
    max-width: 35rem;
  }

  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .quick-actions :global(.btn) {
    min-height: 2.5rem;
    padding-inline: 0.9rem;
  }

  .quick-actions :global(.btn-secondary),
  .quick-actions :global(.btn-outline) {
    color: var(--color-fg-secondary);
  }

  .quick-actions :global(.btn-secondary) {
    background: var(--color-shell-surface-tertiary);
    border-color: var(--color-shell-border-default);
  }

  .submission-column {
    min-width: 0;
    display: flex;
  }

  .dashboard-summary-grid {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .assets-section {
    margin-bottom: var(--space-xl);
  }

  @media (max-width: 900px) {
    .overview-top {
      grid-template-columns: 1fr;
    }

    .header-text,
    .intro-support {
      max-width: none;
    }
  }

  @media (max-width: 640px) {
    .main-content {
      padding: var(--space-md);
    }

    .navigation-loading {
      top: 4.75rem;
      right: var(--space-sm);
      left: var(--space-sm);
      justify-content: center;
    }

    .overview-section {
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }

    .page-header {
      padding-bottom: 0;
    }

    .quick-actions :global(button) {
      width: 100%;
    }

    .page-title {
      font-size: var(--text-h3);
    }

    .assets-section {
      margin-bottom: var(--space-lg);
    }
  }
</style>
