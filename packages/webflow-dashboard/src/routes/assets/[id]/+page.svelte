<script lang="ts">
	import type { PageData } from './$types';
	import type { Asset } from '$lib/server/airtable';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import DOMPurify from 'isomorphic-dompurify';
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
		Sparkline,
		TimelineCard,
		AnalyticsCard,
		DataFreshnessIndicator,
		Dialog,
		BackNavigation
	} from '$lib/components';
	import EditAssetModal from '$lib/components/EditAssetModal.svelte';
	import { toast } from '$lib/stores/toast';
	import { trackEvent } from '$lib/utils/analytics';

	// Sanitize HTML to prevent XSS
	function sanitizeHtml(html: string | undefined): string {
		if (!html) return '';
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	}
	import {
		Eye,
		ExternalLink,
		Store,
		Pencil,
		Archive,
		BarChart3,
		AlertTriangle,
		Users,
		ShoppingCart,
		DollarSign,
		TrendingUp,
		Clock,
		LineChart
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
	const getInitialAsset = () => data.asset;
	const tabOrder = ['overview', 'timeline', 'analytics'] as const;
	type TabValue = (typeof tabOrder)[number];

	// Use reactive state so updates refresh the view
	let asset = $state<Asset>(getInitialAsset());

	// Smart default tab based on asset status
	// - Pending/Review assets: Show Timeline (most actionable)
	// - Published assets: Show Overview (quick summary)
	// - Rejected assets: Show Timeline (shows feedback)
	function getDefaultTab(status: string): string {
		if (['Draft', 'Upcoming', 'Scheduled'].includes(status)) return 'timeline';
		if (status === 'Rejected') return 'timeline';
		return 'overview';
	}

	let activeTab = $state<TabValue>(getDefaultTab(getInitialAsset().status) as TabValue);
	let showPerformance = $state(false);
	let imageError = $state(false);
	let showEditModal = $state(false);
	let isArchiving = $state(false);
	let showArchiveConfirm = $state(false);

	// Format dates
	function formatDate(dateStr?: string): string {
		if (!dateStr) return 'N/A';
		try {
			return new Date(dateStr).toLocaleDateString();
		} catch {
			return 'N/A';
		}
	}

	// Format numbers
	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return 'N/A';
		return num.toLocaleString();
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		return `$${num.toLocaleString()}`;
	}

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	// Can show metrics for non-Upcoming and non-Rejected statuses
	const canShowMetrics = $derived(!['Upcoming', 'Rejected'].includes(asset.status));

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
		if (!canShowMetrics || !asset.cumulativePurchases || asset.cumulativePurchases === 0) return null;
		return (asset.cumulativeRevenue || 0) / asset.cumulativePurchases;
	});

	// Simulated trend data (would come from historical API in production)
	const viewersTrend = $derived(() => {
		if (!canShowMetrics || !asset.uniqueViewers) return [];
		const base = asset.uniqueViewers / 4;
		return [base * 0.7, base * 0.85, base * 0.95, base];
	});

	const revenueTrend = $derived(() => {
		if (!canShowMetrics || !asset.cumulativeRevenue) return [];
		const base = asset.cumulativeRevenue / 4;
		return [base * 0.6, base * 0.8, base * 0.9, base];
	});

	function handleEditClick() {
		// #region agent log
		const clickTime = performance.now();
		console.log('[DEBUG:A,E] Edit button clicked', { clickTime: clickTime.toFixed(2) });
		// #endregion

		trackEvent('asset_edit_opened', {
			asset_id: asset.id,
			asset_status: asset.status
		});

		showEditModal = true;
		// #region agent log
		console.log('[DEBUG:E] showEditModal set to true', { elapsed: (performance.now() - clickTime).toFixed(2) + 'ms' });
		// #endregion
	}

	function handleEditClose() {
		showEditModal = false;
	}

	interface AssetUpdateData {
		name?: string;
		descriptionShort?: string;
		descriptionLongHtml?: string;
		websiteUrl?: string;
		previewUrl?: string;
		thumbnailUrl?: string | null;
		secondaryThumbnailUrl?: string | null;
		carouselImages?: string[];
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

	function setActiveTab(value: TabValue) {
		if (value === 'analytics' && !canShowMetrics) return;
		if (value === activeTab) return;

		const previousTab = activeTab;
		activeTab = value;

		trackEvent('asset_tab_viewed', {
			asset_id: asset.id,
			tab: value,
			previous_tab: previousTab,
			has_metrics: canShowMetrics
		});
	}

	function handleTabListKeydown(event: KeyboardEvent) {
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

		event.preventDefault();

		const enabledTabs = tabOrder.filter((tab) => tab !== 'analytics' || canShowMetrics);
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
			has_metrics: canShowMetrics
		});
	});
</script>

<svelte:head>
	<title>{asset.name} | Webflow Asset Dashboard</title>
</svelte:head>

<div class="detail-page">
	<Header userEmail={data.user?.email} onLogout={handleLogout} showSearch={false} />

	<main class="main-content">
		<div class="content-wrapper">
			<BackNavigation />

			<!-- Header Section -->
			<div class="detail-header">
				<div class="header-info">
					<h1 class="asset-title">{asset.name}</h1>
					<StatusBadge status={asset.status} size="lg" />
				</div>
				<div class="header-actions">
					{#if asset.previewUrl}
						<Button variant="outline" size="sm" onclick={() => openExternalLink(asset.previewUrl, 'preview')}>
							<Eye size={16} />
							Preview
						</Button>
					{/if}
					{#if asset.websiteUrl}
						<Button variant="outline" size="sm" onclick={() => openExternalLink(asset.websiteUrl, 'live')}>
							<ExternalLink size={16} />
							View Live
						</Button>
					{/if}
					{#if asset.marketplaceUrl}
						<Button variant="outline" size="sm" onclick={() => openExternalLink(asset.marketplaceUrl, 'marketplace')}>
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
						<Button variant="destructive" size="sm" onclick={handleArchiveClick} disabled={isArchiving}>
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
										<CardTitle>Template Details</CardTitle>
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
											<span class="detail-label">Template Name</span>
											<span class="detail-value">{asset.name}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Type</span>
											<span class="detail-value">{asset.type}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Submitted Date</span>
											<span class="detail-value">{formatDate(asset.submittedDate)}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Published Date</span>
											<span class="detail-value">{formatDate(asset.publishedDate)}</span>
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

										{#if showPerformance && canShowMetrics}
											<div class="detail-item">
												<span class="detail-label">Unique Viewers <DataFreshnessIndicator variant="tooltip" /></span>
												<span class="detail-value">{formatNumber(asset.uniqueViewers)}</span>
											</div>
											<div class="detail-item">
												<span class="detail-label">Total Purchases <DataFreshnessIndicator variant="tooltip" /></span>
												<span class="detail-value">{formatNumber(asset.cumulativePurchases)}</span>
											</div>
											<div class="detail-item">
												<span class="detail-label">Total Revenue <DataFreshnessIndicator variant="tooltip" /></span>
												<span class="detail-value">{formatCurrency(asset.cumulativeRevenue)}</span>
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
										<div class="description-long">
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
											/>
										</div>
									{/if}
								</CardContent>
							</Card>

							<!-- Quick Stats Card - Tufte: High density with sparklines -->
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
													<span class="stat-number">{formatNumber(asset.uniqueViewers)}</span>
												</div>
												<span class="stat-label">Viewers</span>
												{#if viewersTrend().length > 0}
													<Sparkline data={viewersTrend()} color="var(--color-info)" />
												{/if}
											</div>
											<div class="stat-item purchases">
												<div class="stat-header">
													<ShoppingCart size={14} class="stat-icon" />
													<span class="stat-number">{formatNumber(asset.cumulativePurchases)}</span>
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
													<span class="stat-number">{formatCurrency(asset.cumulativeRevenue)}</span>
													<DataFreshnessIndicator variant="tooltip" />
												</div>
												<span class="stat-label">Revenue</span>
												{#if revenueTrend().length > 0}
													<Sparkline data={revenueTrend()} color="var(--color-success)" filled />
												{/if}
											</div>
										</div>
										{#if avgOrderValue() !== null}
											<div class="derived-stat">
												<TrendingUp size={14} class="derived-icon" />
												<span class="derived-label">Avg Order:</span>
												<span class="derived-value">{formatCurrency(avgOrderValue() ?? 0)}</span>
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

<Dialog isOpen={showArchiveConfirm} onClose={() => (showArchiveConfirm = false)} title="Archive this asset?">
	<div class="archive-dialog-content">
		<p>
			Are you sure you want to archive <strong>{asset.name}</strong>? This removes it from the marketplace.
		</p>
		<div class="archive-dialog-actions">
			<Button variant="secondary" onclick={() => (showArchiveConfirm = false)} disabled={isArchiving}>
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
		max-width: 80rem;
		margin: 0 auto;
	}

	.detail-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.asset-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	:global(.tabs-container) {
		margin-bottom: var(--space-lg);
	}

	:global(.asset-tabs-list) {
		display: flex;
		gap: var(--space-xs);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		padding: var(--space-xs);
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
	}

	.overview-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-lg);
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
		gap: var(--space-lg);
	}

	.card-header-flex {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.detail-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
	}

	.detail-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
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
		line-height: 1.6;
	}

	.description-long :global(a) {
		color: var(--color-info);
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
		border-radius: var(--radius-md);
	}

	.thumbnail-placeholder {
		width: 100%;
		aspect-ratio: 7/9;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
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
		border-radius: var(--radius-md);
	}

	.quick-stats {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
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
		font-size: var(--text-body-lg);
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
		color: var(--color-fg-tertiary);
		padding: 0.125rem 0.375rem;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		font-variant-numeric: tabular-nums;
	}

	.derived-stat {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.derived-stat :global(.derived-icon) {
		color: var(--color-fg-tertiary);
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

</style>
