<script lang="ts">
	import type { PageData } from './$types';
	import type { Asset } from '$lib/server/airtable';
	import { goto, invalidateAll } from '$app/navigation';
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
		Sparkline
	} from '$lib/components';
	import EditAssetModal from '$lib/components/EditAssetModal.svelte';
	import { toast } from '$lib/stores/toast';
	import {
		ArrowLeft,
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
		Percent
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('overview');
	let showPerformance = $state(false);
	let imageError = $state(false);
	let showEditModal = $state(false);
	let isArchiving = $state(false);

	// Use reactive state so updates refresh the view
	let asset = $state<Asset>(data.asset);

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

	function handleBack() {
		goto('/dashboard');
	}

	// Can show metrics for non-Upcoming and non-Rejected statuses
	const canShowMetrics = $derived(!['Upcoming', 'Rejected'].includes(asset.status));

	// Can edit if not delisted
	const canEdit = $derived(!asset.status.includes('Delisted'));

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
		showEditModal = true;
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

		if (!confirm('Are you sure you want to archive this asset? This will remove it from the marketplace.')) {
			return;
		}

		isArchiving = true;

		try {
			await handleArchive();
			toast.success('Asset archived successfully');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to archive asset';
			toast.error(message);
		} finally {
			isArchiving = false;
		}
	}
</script>

<svelte:head>
	<title>{asset.name} | Webflow Asset Dashboard</title>
</svelte:head>

<div class="detail-page">
	<Header userEmail={data.user?.email} onLogout={handleLogout} showSearch={false} />

	<main class="main-content">
		<div class="content-wrapper">
			<!-- Breadcrumb / Back Navigation -->
			<div class="breadcrumb">
				<button type="button" class="back-btn" onclick={handleBack}>
					<ArrowLeft size={20} />
					Back to Dashboard
				</button>
			</div>

			<!-- Header Section -->
			<div class="detail-header">
				<div class="header-info">
					<h1 class="asset-title">{asset.name}</h1>
					<StatusBadge status={asset.status} size="lg" />
				</div>
				<div class="header-actions">
					{#if asset.previewUrl}
						<Button variant="outline" size="sm" onclick={() => window.open(asset.previewUrl, '_blank')}>
							<Eye size={16} />
							Preview
						</Button>
					{/if}
					{#if asset.websiteUrl}
						<Button variant="outline" size="sm" onclick={() => window.open(asset.websiteUrl, '_blank')}>
							<ExternalLink size={16} />
							View Live
						</Button>
					{/if}
					{#if asset.marketplaceUrl}
						<Button variant="outline" size="sm" onclick={() => window.open(asset.marketplaceUrl, '_blank')}>
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

			<!-- Tabs Navigation -->
			<div class="tabs-container">
				<div class="tabs-list">
					<button
						type="button"
						class="tab-trigger"
						class:active={activeTab === 'overview'}
						onclick={() => (activeTab = 'overview')}
					>
						Overview
					</button>
					<button
						type="button"
						class="tab-trigger"
						class:active={activeTab === 'details'}
						onclick={() => (activeTab = 'details')}
					>
						Details
					</button>
					{#if asset.carouselImages && asset.carouselImages.length > 0}
						<button
							type="button"
							class="tab-trigger"
							class:active={activeTab === 'gallery'}
							onclick={() => (activeTab = 'gallery')}
						>
							Gallery
						</button>
					{/if}
				</div>
			</div>

			<!-- Tab Content -->
			<div class="tab-content">
				{#if activeTab === 'overview'}
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
												<span class="detail-label">Unique Viewers</span>
												<span class="detail-value">{formatNumber(asset.uniqueViewers)}</span>
											</div>
											<div class="detail-item">
												<span class="detail-label">Total Purchases</span>
												<span class="detail-value">{formatNumber(asset.cumulativePurchases)}</span>
											</div>
											<div class="detail-item">
												<span class="detail-label">Total Revenue</span>
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
											{@html asset.descriptionLongHtml}
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
												{@html asset.rejectionFeedbackHtml}
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
				{:else if activeTab === 'details'}
					<Card>
						<CardHeader>
							<CardTitle>All Details</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="details-table">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Property</TableHead>
											<TableHead>Value</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										<TableRow>
											<TableCell class="property-cell">Name</TableCell>
											<TableCell>{asset.name}</TableCell>
										</TableRow>
										<TableRow>
											<TableCell class="property-cell">Type</TableCell>
											<TableCell>{asset.type}</TableCell>
										</TableRow>
										<TableRow>
											<TableCell class="property-cell">Status</TableCell>
											<TableCell><StatusBadge status={asset.status} size="sm" /></TableCell>
										</TableRow>
										<TableRow>
											<TableCell class="property-cell">Submitted Date</TableCell>
											<TableCell>{formatDate(asset.submittedDate)}</TableCell>
										</TableRow>
										<TableRow>
											<TableCell class="property-cell">Published Date</TableCell>
											<TableCell>{formatDate(asset.publishedDate)}</TableCell>
										</TableRow>
										<TableRow>
											<TableCell class="property-cell">Decision Date</TableCell>
											<TableCell>{formatDate(asset.decisionDate)}</TableCell>
										</TableRow>
										{#if asset.priceString}
											<TableRow>
												<TableCell class="property-cell">Price</TableCell>
												<TableCell>{asset.priceString}</TableCell>
											</TableRow>
										{/if}
										{#if asset.websiteUrl}
											<TableRow>
												<TableCell class="property-cell">Website URL</TableCell>
												<TableCell>
													<a href={asset.websiteUrl} target="_blank" rel="noopener noreferrer" class="link">
														{asset.websiteUrl}
													</a>
												</TableCell>
											</TableRow>
										{/if}
										{#if asset.previewUrl}
											<TableRow>
												<TableCell class="property-cell">Preview URL</TableCell>
												<TableCell>
													<a href={asset.previewUrl} target="_blank" rel="noopener noreferrer" class="link">
														{asset.previewUrl}
													</a>
												</TableCell>
											</TableRow>
										{/if}
										{#if asset.marketplaceUrl}
											<TableRow>
												<TableCell class="property-cell">Marketplace URL</TableCell>
												<TableCell>
													<a href={asset.marketplaceUrl} target="_blank" rel="noopener noreferrer" class="link">
														{asset.marketplaceUrl}
													</a>
												</TableCell>
											</TableRow>
										{/if}
										{#if asset.qualityScore}
											<TableRow>
												<TableCell class="property-cell">Quality Score</TableCell>
												<TableCell>{asset.qualityScore}</TableCell>
											</TableRow>
										{/if}
										{#if asset.latestReviewStatus}
											<TableRow>
												<TableCell class="property-cell">Latest Review Status</TableCell>
												<TableCell>{asset.latestReviewStatus}</TableCell>
											</TableRow>
										{/if}
										{#if asset.latestReviewDate}
											<TableRow>
												<TableCell class="property-cell">Latest Review Date</TableCell>
												<TableCell>{formatDate(asset.latestReviewDate)}</TableCell>
											</TableRow>
										{/if}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				{:else if activeTab === 'gallery' && asset.carouselImages}
					<Card>
						<CardHeader>
							<CardTitle>Gallery Images</CardTitle>
						</CardHeader>
						<CardContent>
							<div class="gallery-grid">
								{#each asset.carouselImages as image, index}
									<div class="gallery-item">
										<img src={image} alt="Gallery image {index + 1}" class="gallery-image" />
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
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

	.breadcrumb {
		margin-bottom: var(--space-md);
	}

	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: transparent;
		border: none;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.back-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
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

	.tabs-container {
		border-bottom: 1px solid var(--color-border-default);
		margin-bottom: var(--space-lg);
	}

	.tabs-list {
		display: flex;
		gap: 0;
	}

	.tab-trigger {
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.tab-trigger:hover {
		color: var(--color-fg-primary);
	}

	.tab-trigger.active {
		color: var(--color-fg-primary);
		border-bottom-color: var(--color-fg-primary);
	}

	.tab-content {
		/* Content container */
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

	.rejection-card {
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

	.details-table {
		overflow-x: auto;
	}

	.property-cell {
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		white-space: nowrap;
	}

	.link {
		color: var(--color-info);
		text-decoration: none;
	}

	.link:hover {
		text-decoration: underline;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.gallery-item {
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.gallery-image {
		width: 100%;
		aspect-ratio: 16/10;
		object-fit: cover;
	}
</style>
