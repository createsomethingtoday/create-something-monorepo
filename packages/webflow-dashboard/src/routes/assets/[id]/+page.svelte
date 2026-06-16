<script lang="ts">
  import type { PageData } from './$types';
  import type { Asset, AssetUpdateData } from '$lib/server/airtable';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { sanitizeLongDescriptionHtml } from '@create-something/webflow-dashboard-core/long-description';
  import {
    Header,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Badge,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    StatusBadge,
    TimelineCard,
    AnalyticsCard,
    TemplateHealthCard,
    TemplateOfferRequestCard,
    DataFreshnessIndicator,
    Dialog,
    BackNavigation
  } from '$lib/components';
  import EditAssetModal from '$lib/components/EditAssetModal.svelte';
  import { toast } from '$lib/stores/toast';
  import { trackEvent } from '$lib/utils/analytics';
  import { computeTemplateHealth, isTemplateSearchSuppressed } from '$lib/utils/template-health';
  import { RECOVERY_REENTRY_QUALIFIED_SALES_30D } from '$lib/utils/template-lifecycle-policy';
  import {
    formatCompactCurrency,
    formatCompactNumber,
    formatLongDate,
    formatNumericDate,
    formatWholeNumber
  } from '$lib/utils/format';

  // Sanitize HTML to prevent XSS
  function sanitizeHtml(html: string | undefined): string {
    return sanitizeLongDescriptionHtml(html);
  }
  import {
    Eye,
    ExternalLink,
    Store,
    Pencil,
    Archive,
    BarChart3,
    AlertTriangle,
    Activity,
    Users,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    Clock,
    LineChart
  } from 'lucide-svelte';

  let { data }: { data: PageData } = $props();
  const getInitialAsset = () => data.asset;
  const tabOrder = ['overview', 'timeline', 'health', 'analytics'] as const;
  type TabValue = (typeof tabOrder)[number];

  // Use reactive state so updates refresh the view
  let asset = $state<Asset>(getInitialAsset());

  // Smart default tab based on asset status
  // - Pending/Review assets: Show Timeline (most actionable)
  // - Published assets: Show Overview (quick summary)
  // - Rejected assets: Show Timeline (shows feedback)
  function getDefaultTab(status: string): string {
    if (['Draft', 'Upcoming', 'Scheduled'].includes(status)) return 'timeline';
    if (status === 'Rejected') return 'overview';
    return 'overview';
  }

  let activeTab = $state<TabValue>(getDefaultTab(getInitialAsset().status) as TabValue);
  let showPerformance = $state(false);
  let imageError = $state(false);
  let showEditModal = $state(false);
  let isArchiving = $state(false);
  let showArchiveConfirm = $state(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // Can show metrics for non-Upcoming and non-Rejected statuses
  const canShowMetrics = $derived(!['Upcoming', 'Rejected'].includes(asset.status));

  // Template Health is a template-only creator guidance surface.
  const canShowHealth = $derived(asset.type === 'Template');
  const templateHealth = $derived(computeTemplateHealth(asset));

  const hasActiveOffer = $derived(
    Boolean(
      asset.activeOfferLabel ||
        asset.activeOfferCtaUrl ||
        asset.activeOfferStrategy ||
        asset.activeOfferEndsAt ||
        asset.activeOfferVisibility ||
        asset.activeOfferPrice !== undefined
    )
  );
  const canShowOfferRequest = $derived(
    canShowHealth &&
      asset.status === 'Published' &&
      (hasActiveOffer || templateHealth.automation.code === 'run_recovery_offer')
  );
  const isSearchSuppressed = $derived(isTemplateSearchSuppressed(asset.searchVisibility));

  // Can only edit Published templates
  const canEdit = $derived(asset.status === 'Published');

  // Can archive if not already delisted
  const canArchive = $derived(!asset.status.includes('Delisted'));

  // Tufte: Calculate derived metrics for relationships
  const conversionRate = $derived(() => {
    if (!canShowMetrics || !asset.uniqueViewers || asset.uniqueViewers === 0) return null;
    return ((asset.cumulativePurchases || 0) / asset.uniqueViewers) * 100;
  });

  const avgOrderValue = $derived(() => {
    if (!canShowMetrics || !asset.cumulativePurchases || asset.cumulativePurchases === 0)
      return null;
    return (asset.cumulativeRevenue || 0) / asset.cumulativePurchases;
  });

  function handleEditClick() {
    trackEvent('asset_edit_opened', {
      asset_id: asset.id,
      asset_status: asset.status
    });

    showEditModal = true;
  }

  function handleEditClose() {
    showEditModal = false;
  }

  async function handleEditSave(updateData: AssetUpdateData): Promise<void> {
    const response = await fetch(`/api/assets/${asset.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      throw new Error(data.message || 'Failed to update asset');
    }

    const result = (await response.json()) as { asset: typeof asset };

    // Update local state with new asset data
    asset = result.asset;

    // Reset image error state in case thumbnail changed
    imageError = false;
  }

  async function handleArchive(): Promise<void> {
    const response = await fetch(`/api/assets/${asset.id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      throw new Error(data.message || 'Failed to archive asset');
    }

    // Navigate back to dashboard after successful archive
    goto('/dashboard');
  }

  async function handleArchiveClick() {
    if (isArchiving) return;

    trackEvent('asset_archive_confirm_opened', {
      asset_id: asset.id,
      asset_status: asset.status
    });

    showArchiveConfirm = true;
  }

  async function confirmArchive() {
    if (isArchiving) return;
    isArchiving = true;

    try {
      await handleArchive();
      toast.success('Asset archived successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive asset';
      toast.error(message);
    } finally {
      isArchiving = false;
      showArchiveConfirm = false;
    }
  }

  function handleLifecycleApplied(updatedAsset: Asset): void {
    const previousVisibility = asset.searchVisibility;
    asset = updatedAsset;
    toast.success('Template lifecycle updated');
    trackEvent('template_lifecycle_applied', {
      asset_id: updatedAsset.id,
      previous_search_visibility: previousVisibility,
      search_visibility: updatedAsset.searchVisibility
    });
  }

  function setActiveTab(value: TabValue) {
    if (value === 'health' && !canShowHealth) return;
    if (value === 'analytics' && !canShowMetrics) return;
    if (value === activeTab) return;

    const previousTab = activeTab;
    activeTab = value;

    if (value === 'health') {
      const health = computeTemplateHealth(asset);
      trackEvent('template_health_viewed', {
        asset_id: asset.id,
        asset_status: asset.status,
        health_status: health.status,
        has_quality_score: Boolean(asset.qualityScore),
        has_active_offer: hasActiveOffer,
        active_offer_strategy: asset.activeOfferStrategy,
        has_purchases: Boolean(asset.cumulativePurchases && asset.cumulativePurchases > 0),
        has_viewers: Boolean(asset.uniqueViewers && asset.uniqueViewers > 0)
      });
    }

    trackEvent('asset_tab_viewed', {
      asset_id: asset.id,
      tab: value,
      previous_tab: previousTab,
      has_metrics: canShowMetrics,
      has_active_offer: hasActiveOffer,
      active_offer_strategy: asset.activeOfferStrategy
    });
  }

  function handleTabListKeydown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();

    const enabledTabs = tabOrder.filter(
      (tab) => (tab !== 'analytics' || canShowMetrics) && (tab !== 'health' || canShowHealth)
    );
    const currentIndex = enabledTabs.indexOf(activeTab as TabValue);

    if (event.key === 'Home') {
      setActiveTab(enabledTabs[0]);
      return;
    }

    if (event.key === 'End') {
      setActiveTab(enabledTabs[enabledTabs.length - 1]);
      return;
    }

    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + enabledTabs.length) % enabledTabs.length;
    setActiveTab(enabledTabs[nextIndex]);
  }

  function extractHost(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  function openExternalLink(url: string, source: 'preview' | 'live' | 'marketplace'): void {
    trackEvent('asset_external_link_opened', {
      asset_id: asset.id,
      source,
      destination_host: extractHost(url)
    });
    window.open(url, '_blank');
  }

  onMount(() => {
    trackEvent('asset_detail_loaded', {
      asset_id: asset.id,
      asset_status: asset.status,
      asset_type: asset.type,
      asset_category: asset.category,
      asset_subcategory: asset.subcategory,
      initial_tab: activeTab,
      has_metrics: canShowMetrics,
      has_active_offer: hasActiveOffer,
      active_offer_strategy: asset.activeOfferStrategy
    });
  });
</script>

<svelte:head>
  <title>{asset.name} | Webflow Asset Dashboard</title>
</svelte:head>

<div class="detail-page">
  <Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

  <main class="main-content">
    <div class="content-wrapper">
      <BackNavigation />

      <div class="detail-header page-intro">
        <div class="header-info">
          <div class="header-copy">
            <p class="detail-kicker">Asset detail</p>
            <div class="title-row">
              <h1 class="asset-title">{asset.name}</h1>
              <StatusBadge status={asset.status} size="lg" />
              {#if hasActiveOffer}
                <Badge variant="info">{asset.activeOfferLabel || 'Limited offer'}</Badge>
              {/if}
            </div>
            <p class="detail-subtitle">
              {asset.type}
              {#if asset.category}
                · {asset.category}
              {/if}
              {#if asset.subcategory}
                · {asset.subcategory}
              {/if}
            </p>
            <div class="detail-evidence" aria-label="Asset summary">
              <span><strong>{formatNumericDate(asset.submittedDate)}</strong> submitted</span>
              {#if asset.publishedDate}
                <span><strong>{formatNumericDate(asset.publishedDate)}</strong> published</span>
              {/if}
              {#if asset.priceString}
                <span><strong>{asset.priceString}</strong> price</span>
              {/if}
              {#if isSearchSuppressed}
                <span><strong>Detail only</strong> search visibility</span>
              {:else if asset.searchVisibility}
                <span><strong>{asset.searchVisibility}</strong> search visibility</span>
              {/if}
              {#if asset.qualifiedSales30d !== undefined || asset.recoveryOfferUsed}
                <span
                  ><strong>{asset.qualifiedSales30d ?? 0}/{RECOVERY_REENTRY_QUALIFIED_SALES_30D}</strong>
                  re-entry sales</span
                >
              {/if}
              {#if hasActiveOffer}
                <span>
                  <strong>{asset.activeOfferLabel || 'Limited offer'}</strong>
                  {#if asset.activeOfferPrice !== undefined}
                    at {formatCompactCurrency(asset.activeOfferPrice)}
                  {/if}
                </span>
              {/if}
              {#if asset.qualityScore}
                <span><strong>{asset.qualityScore}</strong> quality score</span>
              {/if}
              {#if canShowMetrics && showPerformance}
                <span><strong>{formatCompactNumber(asset.uniqueViewers)}</strong> viewers</span>
                <span
                  ><strong>{formatCompactNumber(asset.cumulativePurchases)}</strong> purchases</span
                >
                <span
                  ><strong>{formatCompactCurrency(asset.cumulativeRevenue)}</strong> revenue</span
                >
              {/if}
            </div>
          </div>
        </div>
        <div class="header-actions">
          {#if asset.previewUrl}
            <Button
              variant="outline"
              size="sm"
              onclick={() => asset.previewUrl && openExternalLink(asset.previewUrl, 'preview')}
            >
              <Eye size={16} />
              Preview
            </Button>
          {/if}
          {#if asset.websiteUrl}
            <Button
              variant="outline"
              size="sm"
              onclick={() => asset.websiteUrl && openExternalLink(asset.websiteUrl, 'live')}
            >
              <ExternalLink size={16} />
              View Live
            </Button>
          {/if}
          {#if asset.marketplaceUrl}
            <Button
              variant="outline"
              size="sm"
              onclick={() =>
                asset.marketplaceUrl && openExternalLink(asset.marketplaceUrl, 'marketplace')}
            >
              <Store size={16} />
              Marketplace
            </Button>
          {/if}
          {#if canEdit}
            <Button variant="default" size="sm" onclick={handleEditClick}>
              <Pencil size={16} />
              Edit
            </Button>
          {/if}
          {#if canArchive}
            <Button
              variant="destructive"
              size="sm"
              onclick={handleArchiveClick}
              disabled={isArchiving}
            >
              <Archive size={16} />
              {isArchiving ? 'Archiving...' : 'Archive'}
            </Button>
          {/if}
        </div>
      </div>

      <Tabs value={activeTab} class="tabs-container">
        <TabsList class="asset-tabs-list" onkeydown={handleTabListKeydown}>
          <TabsTrigger
            value="overview"
            active={activeTab === 'overview'}
            id="asset-tab-overview"
            aria-controls="asset-panel-overview"
            onclick={() => setActiveTab('overview')}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            active={activeTab === 'timeline'}
            id="asset-tab-timeline"
            aria-controls="asset-panel-timeline"
            onclick={() => setActiveTab('timeline')}
          >
            <Clock size={14} />
            Timeline
          </TabsTrigger>
          {#if canShowHealth}
            <TabsTrigger
              value="health"
              active={activeTab === 'health'}
              id="asset-tab-health"
              aria-controls="asset-panel-health"
              onclick={() => setActiveTab('health')}
            >
              <Activity size={14} />
              Health
            </TabsTrigger>
          {/if}
          <TabsTrigger
            value="analytics"
            active={activeTab === 'analytics'}
            id="asset-tab-analytics"
            aria-controls="asset-panel-analytics"
            onclick={() => setActiveTab('analytics')}
            disabled={!canShowMetrics}
            title={!canShowMetrics ? 'Analytics available after publishing' : ''}
          >
            <LineChart size={14} />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          active={activeTab === 'overview'}
          id="asset-panel-overview"
          aria-labelledby="asset-tab-overview"
          tabindex={0}
          class="tab-content"
        >
          <div class="overview-grid">
            <!-- Left Column -->
            <div class="left-column">
              <!-- Template Details Card -->
              <Card>
                <CardHeader>
                  <div class="card-header-flex">
                    <CardTitle>Asset Record</CardTitle>
                    <Button
                      variant={showPerformance ? 'default' : 'outline'}
                      size="sm"
                      onclick={() => (showPerformance = !showPerformance)}
                    >
                      <BarChart3 size={16} />
                      {showPerformance ? 'Hide' : 'Show'} Performance
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div class="details-grid">
                    <div class="detail-item">
                      <span class="detail-label">Name</span>
                      <span class="detail-value">{asset.name}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Type</span>
                      <span class="detail-value">{asset.type}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Submitted Date</span>
                      <span class="detail-value">{formatLongDate(asset.submittedDate)}</span>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Published Date</span>
                      <span class="detail-value">{formatLongDate(asset.publishedDate)}</span>
                    </div>
                    {#if asset.qualityScore}
                      <div class="detail-item">
                        <span class="detail-label">Quality Score</span>
                        <span class="detail-value">{asset.qualityScore}</span>
                      </div>
                    {/if}
                    {#if asset.priceString}
                      <div class="detail-item">
                        <span class="detail-label">Price</span>
                        <span class="detail-value">{asset.priceString}</span>
                      </div>
                    {/if}
                    {#if asset.searchVisibility}
                      <div class="detail-item">
                        <span class="detail-label">Search Visibility</span>
                        <span class="detail-value">{asset.searchVisibility}</span>
                      </div>
                    {/if}
                    {#if asset.qualifiedSales30d !== undefined}
                      <div class="detail-item">
                        <span class="detail-label">Qualified Sales (30d)</span>
                        <span class="detail-value"
                          >{asset.qualifiedSales30d}/{RECOVERY_REENTRY_QUALIFIED_SALES_30D}</span
                        >
                      </div>
                    {/if}
                    {#if asset.recoveryOfferUsed !== undefined}
                      <div class="detail-item">
                        <span class="detail-label">Recovery Offer</span>
                        <span class="detail-value">{asset.recoveryOfferUsed ? 'Used' : 'Available'}</span>
                      </div>
                    {/if}
                    {#if hasActiveOffer}
                      <div class="detail-item">
                        <span class="detail-label">Active Offer</span>
                        <span class="detail-value">{asset.activeOfferLabel || 'Limited offer'}</span>
                      </div>
                      {#if asset.activeOfferPrice !== undefined}
                        <div class="detail-item">
                          <span class="detail-label">Offer Price</span>
                          <span class="detail-value"
                            >{formatCompactCurrency(asset.activeOfferPrice)}</span
                          >
                        </div>
                      {/if}
                      {#if asset.activeOfferEndsAt}
                        <div class="detail-item">
                          <span class="detail-label">Offer Ends</span>
                          <span class="detail-value">{formatLongDate(asset.activeOfferEndsAt)}</span>
                        </div>
                      {/if}
                      {#if asset.activeOfferStrategy}
                        <div class="detail-item">
                          <span class="detail-label">Offer Strategy</span>
                          <span class="detail-value">{asset.activeOfferStrategy}</span>
                        </div>
                      {/if}
                      {#if asset.offerPruneReviewAt}
                        <div class="detail-item">
                          <span class="detail-label">Marketplace Review</span>
                          <span class="detail-value">{formatLongDate(asset.offerPruneReviewAt)}</span>
                        </div>
                      {/if}
                      {#if asset.postOfferAction}
                        <div class="detail-item">
                          <span class="detail-label">Post-Offer Action</span>
                          <span class="detail-value">{asset.postOfferAction}</span>
                        </div>
                      {/if}
                    {/if}

                    {#if showPerformance && canShowMetrics}
                      <div class="detail-item">
                        <span class="detail-label detail-label--with-freshness"
                          >Unique Viewers <DataFreshnessIndicator variant="tooltip" /></span
                        >
                        <span class="detail-value">{formatWholeNumber(asset.uniqueViewers)}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label detail-label--with-freshness"
                          >Total Purchases <DataFreshnessIndicator variant="tooltip" /></span
                        >
                        <span class="detail-value"
                          >{formatWholeNumber(asset.cumulativePurchases)}</span
                        >
                      </div>
                      <div class="detail-item">
                        <span class="detail-label detail-label--with-freshness"
                          >Total Revenue <DataFreshnessIndicator variant="tooltip" /></span
                        >
                        <span class="detail-value"
                          >{formatCompactCurrency(asset.cumulativeRevenue)}</span
                        >
                      </div>
                    {/if}
                  </div>
                </CardContent>
              </Card>

              <!-- Description Card -->
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {#if asset.descriptionShort}
                    <p class="description-short">{asset.descriptionShort}</p>
                  {/if}
                  {#if asset.descriptionLongHtml}
                    <div class="separator"></div>
                    <div class="description-long marketplace-long-description">
                      {@html sanitizeHtml(asset.descriptionLongHtml)}
                    </div>
                  {:else if asset.description}
                    <p class="description-text">{asset.description}</p>
                  {/if}
                </CardContent>
              </Card>

              <!-- Rejection Feedback Card (if rejected) -->
              {#if asset.status === 'Rejected' && (asset.rejectionFeedback || asset.rejectionFeedbackHtml)}
                <Card class="rejection-card">
                  <CardHeader>
                    <div class="rejection-header">
                      <AlertTriangle size={20} />
                      <CardTitle>Rejection Feedback</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {#if asset.rejectionFeedbackHtml}
                      <div class="rejection-content">
                        {@html sanitizeHtml(asset.rejectionFeedbackHtml)}
                      </div>
                    {:else}
                      <p class="rejection-text">{asset.rejectionFeedback}</p>
                    {/if}
                  </CardContent>
                </Card>
              {/if}
            </div>

            <!-- Right Column -->
            <div class="right-column">
              <!-- Thumbnail Card -->
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {#if asset.thumbnailUrl && !imageError}
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      class="thumbnail-image"
                      decoding="async"
                      onerror={() => (imageError = true)}
                    />
                  {:else}
                    <div class="thumbnail-placeholder">
                      <span>{asset.name.charAt(0).toUpperCase()}</span>
                    </div>
                  {/if}

                  {#if asset.secondaryThumbnailUrl}
                    <div class="secondary-thumbnail">
                      <p class="thumbnail-label">Secondary Thumbnail</p>
                      <img
                        src={asset.secondaryThumbnailUrl}
                        alt="{asset.name} secondary"
                        class="secondary-image"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  {/if}
                </CardContent>
              </Card>

              <!-- Quick Stats Card - current totals; real trends live in the analytics tab -->
              {#if canShowMetrics}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div class="quick-stats">
                      <div class="stat-item viewers">
                        <div class="stat-header">
                          <Users size={14} class="stat-icon" />
                          <span class="stat-number">{formatWholeNumber(asset.uniqueViewers)}</span>
                        </div>
                        <span class="stat-label">Viewers</span>
                      </div>
                      <div class="stat-item purchases">
                        <div class="stat-header">
                          <ShoppingCart size={14} class="stat-icon" />
                          <span class="stat-number"
                            >{formatWholeNumber(asset.cumulativePurchases)}</span
                          >
                          <DataFreshnessIndicator variant="tooltip" />
                        </div>
                        <span class="stat-label">Purchases</span>
                        {#if conversionRate() !== null}
                          <span class="stat-secondary">{conversionRate()?.toFixed(1)}% conv</span>
                        {/if}
                      </div>
                      <div class="stat-item revenue">
                        <div class="stat-header">
                          <DollarSign size={14} class="stat-icon" />
                          <span class="stat-number"
                            >{formatCompactCurrency(asset.cumulativeRevenue)}</span
                          >
                          <DataFreshnessIndicator variant="tooltip" />
                        </div>
                        <span class="stat-label">Revenue</span>
                      </div>
                    </div>
                    {#if avgOrderValue() !== null}
                      <div class="derived-stat">
                        <TrendingUp size={14} class="derived-icon" />
                        <span class="derived-label">Avg Order:</span>
                        <span class="derived-value"
                          >{formatCompactCurrency(avgOrderValue() ?? 0)}</span
                        >
                      </div>
                    {/if}
                  </CardContent>
                </Card>
              {/if}
            </div>
          </div>
        </TabsContent>
        <TabsContent
          value="timeline"
          active={activeTab === 'timeline'}
          id="asset-panel-timeline"
          aria-labelledby="asset-tab-timeline"
          tabindex={0}
          class="tab-content"
        >
          <TimelineCard {asset} />
        </TabsContent>
        {#if canShowHealth}
          <TabsContent
            value="health"
            active={activeTab === 'health'}
            id="asset-panel-health"
            aria-labelledby="asset-tab-health"
            tabindex={0}
            class="tab-content"
          >
            <div class="health-tab-stack">
              <TemplateHealthCard {asset} onLifecycleApplied={handleLifecycleApplied} />
              {#if canShowOfferRequest}
                <TemplateOfferRequestCard {asset} />
              {/if}
            </div>
          </TabsContent>
        {/if}
        <TabsContent
          value="analytics"
          active={activeTab === 'analytics'}
          id="asset-panel-analytics"
          aria-labelledby="asset-tab-analytics"
          tabindex={0}
          class="tab-content"
        >
          <AnalyticsCard {asset} />
        </TabsContent>
      </Tabs>
    </div>
  </main>
</div>

<!-- Edit Modal -->
{#if showEditModal}
  <EditAssetModal
    {asset}
    onClose={handleEditClose}
    onSave={handleEditSave}
    onArchive={canArchive ? handleArchive : undefined}
  />
{/if}

<Dialog
  isOpen={showArchiveConfirm}
  onClose={() => (showArchiveConfirm = false)}
  title="Archive this asset?"
>
  <div class="archive-dialog-content">
    <p>
      Are you sure you want to archive <strong>{asset.name}</strong>? This removes it from the
      marketplace.
    </p>
    <div class="archive-dialog-actions">
      <Button
        variant="secondary"
        onclick={() => (showArchiveConfirm = false)}
        disabled={isArchiving}
      >
        Cancel
      </Button>
      <Button variant="destructive" onclick={confirmArchive} disabled={isArchiving}>
        {isArchiving ? 'Archiving...' : 'Archive asset'}
      </Button>
    </div>
  </div>
</Dialog>

<style>
  .detail-page {
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

  .detail-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .header-info {
    display: flex;
    min-width: 0;
  }

  .header-copy {
    display: grid;
    gap: 0.35rem;
  }

  .detail-evidence {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.85rem;
    margin-top: 0.35rem;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .detail-evidence strong {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
    font-variant-numeric: tabular-nums;
  }

  .detail-kicker {
    margin: 0;
    font-size: var(--text-caption);
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .detail-subtitle {
    margin: 0;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .asset-title {
    font-size: clamp(1.75rem, 1.8vw + 1rem, 2.35rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  :global(.tabs-container) {
    margin-bottom: var(--space-lg);
  }

  :global(.asset-tabs-list) {
    display: flex;
    gap: var(--space-xs);
    background: transparent;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    border-radius: 0;
    padding: 0 0 0.4rem;
    overflow-x: auto;
    scrollbar-width: none;
  }

  :global(.asset-tabs-list::-webkit-scrollbar) {
    display: none;
  }

  :global(.asset-tabs-list button) {
    flex: 0 0 auto;
  }

  .archive-dialog-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    color: var(--color-fg-secondary);
  }

  .archive-dialog-content p {
    margin: 0;
  }

  .archive-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);
  }

  .health-tab-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  @media (min-width: 1024px) {
    .overview-grid {
      grid-template-columns: 2fr 1fr;
    }
  }

  .left-column,
  .right-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  :global(.overview-grid .card) {
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 74%, transparent);
  }

  :global(.overview-grid .card-header) {
    padding: 0.82rem 0.95rem 0.62rem;
  }

  :global(.overview-grid .card-content) {
    padding: 0 0.95rem 0.95rem;
  }

  :global(.overview-grid .card-title) {
    letter-spacing: 0;
  }

  .card-header-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.66rem 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .detail-label {
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .detail-label--with-freshness {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .detail-value {
    font-size: var(--text-body);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .description-short {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-md);
  }

  .separator {
    height: 1px;
    background: var(--color-border-default);
    margin: var(--space-md) 0;
  }

  .description-long,
  .description-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: 1.5;
  }

  .description-long :global(a) {
    color: var(--color-info);
  }

  .marketplace-long-description :global(h3),
  .marketplace-long-description :global(h4),
  .marketplace-long-description :global(h5),
  .marketplace-long-description :global(h6) {
    margin: var(--space-lg) 0 var(--space-sm);
    color: var(--color-fg-primary);
    line-height: 1.25;
  }

  .marketplace-long-description :global(h3) {
    font-size: var(--text-body-lg);
  }

  .marketplace-long-description :global(h4),
  .marketplace-long-description :global(h5),
  .marketplace-long-description :global(h6) {
    font-size: var(--text-body);
  }

  .marketplace-long-description :global(p),
  .marketplace-long-description :global(ul),
  .marketplace-long-description :global(ol),
  .marketplace-long-description :global(figure),
  .marketplace-long-description :global(blockquote),
  .marketplace-long-description :global(pre) {
    margin: 0 0 var(--space-md);
  }

  .marketplace-long-description :global(ul),
  .marketplace-long-description :global(ol) {
    padding-left: 1.35rem;
  }

  .marketplace-long-description :global(li + li) {
    margin-top: var(--space-xs);
  }

  .marketplace-long-description :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: var(--space-md) 0;
    border-radius: var(--radius-sm);
  }

  .marketplace-long-description :global(figcaption) {
    margin-top: calc(var(--space-sm) * -1);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    line-height: 1.4;
  }

  :global(.rejection-card) {
    border-color: var(--color-error-border);
  }

  .rejection-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-error);
  }

  .rejection-content,
  .rejection-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .thumbnail-image {
    width: 100%;
    aspect-ratio: 7/9;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  .thumbnail-placeholder {
    width: 100%;
    aspect-ratio: 7/9;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-muted);
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
  }

  .secondary-thumbnail {
    margin-top: var(--space-md);
  }

  .thumbnail-label {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-xs);
  }

  .secondary-image {
    width: 100%;
    aspect-ratio: 16/10;
    object-fit: cover;
    border-radius: var(--radius-sm);
  }

  .quick-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    padding: 0.62rem 0.7rem;
    border-right: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    min-width: 0;
  }

  .stat-item:last-child {
    border-right: none;
  }

  .stat-header {
    display: flex;
    align-items: center;
    gap: 0.32rem;
    min-width: 0;
  }

  .stat-item :global(.stat-icon) {
    flex-shrink: 0;
  }

  .stat-item.viewers :global(.stat-icon) {
    color: var(--color-info);
  }

  .stat-item.purchases :global(.stat-icon) {
    color: var(--color-warning);
  }

  .stat-item.revenue :global(.stat-icon) {
    color: var(--color-success);
  }

  .stat-number {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .stat-secondary {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .derived-stat {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    margin-top: 0.72rem;
    padding-top: 0.72rem;
    border-top: 1px solid color-mix(in srgb, var(--color-border-default) 72%, transparent);
  }

  .derived-stat :global(.derived-icon) {
    color: var(--color-fg-muted);
  }

  .derived-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .derived-value {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 768px) {
    .main-content {
      padding: var(--space-md);
    }

    .detail-header {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .header-info,
    .header-actions {
      width: 100%;
    }

    .header-actions {
      justify-content: stretch;
    }

    .header-actions :global(button) {
      flex: 1 1 12rem;
      min-height: 2.5rem;
    }

    :global(.asset-tabs-list) {
      width: 100%;
    }

    :global(.tab-content) {
      outline-offset: 0;
    }

    .card-header-flex :global(button) {
      width: 100%;
    }

    .archive-dialog-actions :global(button) {
      flex: 1 1 12rem;
    }
  }

  @media (max-width: 640px) {
    .asset-title {
      font-size: var(--text-h3);
      word-break: break-word;
    }

    .detail-header {
      gap: var(--space-sm);
    }

    .details-grid {
      grid-template-columns: 1fr;
    }

    .quick-stats {
      grid-template-columns: 1fr;
    }

    .stat-item {
      border-right: none;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border-default) 68%, transparent);
    }

    .stat-item:last-child {
      border-bottom: none;
    }

    .stat-header {
      flex-wrap: wrap;
    }

    .stat-number {
      font-size: var(--text-body);
    }

    .derived-stat {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .archive-dialog-actions {
      flex-direction: column;
    }

    .archive-dialog-actions :global(button) {
      width: 100%;
    }
  }
</style>
