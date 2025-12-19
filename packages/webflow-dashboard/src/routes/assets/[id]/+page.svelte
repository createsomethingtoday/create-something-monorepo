<script lang="ts">
	import { Badge } from '$lib/components/ui';
	import { ArrowLeft, ExternalLink, Eye, DollarSign, ShoppingCart, Calendar, Clock } from 'lucide-svelte';

	let { data } = $props();

	function formatDate(dateString?: string): string {
		if (!dateString) return '-';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
	}

	function formatNumber(num?: number): string {
		if (num === undefined || num === null) return '0';
		return num.toLocaleString('en-US');
	}

	function formatCurrency(num?: number): string {
		if (num === undefined || num === null) return '$0';
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'Published': return 'var(--color-status-published)';
			case 'Scheduled': return 'var(--color-status-scheduled)';
			case 'Upcoming': return 'var(--color-status-upcoming)';
			case 'Delisted': return 'var(--color-status-delisted)';
			case 'Rejected': return 'var(--color-status-rejected)';
			default: return 'var(--color-fg-muted)';
		}
	}
</script>

<svelte:head>
	<title>{data.asset.name} | Asset Dashboard</title>
</svelte:head>

<div class="asset-detail-page">
	<header class="page-header">
		<a href="/" class="back-link">
			<ArrowLeft size={20} />
			Back to Dashboard
		</a>
	</header>

	<div class="content">
		<div class="main-content">
			<!-- Hero Section -->
			<section class="hero-section">
				<div class="hero-image">
					{#if data.asset.thumbnailUrl}
						<img src={data.asset.thumbnailUrl} alt={data.asset.name} />
					{:else}
						<div class="placeholder">No Image</div>
					{/if}
				</div>
				<div class="hero-info">
					<div class="status-row">
						<Badge variant="default" style="--badge-color: {getStatusColor(data.asset.status)}">{data.asset.status}</Badge>
						<span class="asset-type">{data.asset.type}</span>
					</div>
					<h1 class="asset-name">{data.asset.name}</h1>
					{#if data.asset.priceString}
						<p class="price">{data.asset.priceString}</p>
					{/if}
					<div class="action-buttons">
						{#if data.asset.previewUrl}
							<a href={data.asset.previewUrl} target="_blank" rel="noopener noreferrer" class="btn btn-primary">
								<Eye size={16} />
								Preview
							</a>
						{/if}
						{#if data.asset.marketplaceUrl}
							<a href={data.asset.marketplaceUrl} target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
								<ExternalLink size={16} />
								View on Marketplace
							</a>
						{/if}
					</div>
				</div>
			</section>

			<!-- Metrics Section -->
			<section class="metrics-section">
				<h2 class="section-title">Performance</h2>
				<div class="metrics-grid">
					<div class="metric-card">
						<div class="metric-icon">
							<Eye size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value">{formatNumber(data.asset.uniqueViewers)}</span>
							<span class="metric-label">Unique Viewers</span>
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-icon">
							<ShoppingCart size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value">{formatNumber(data.asset.cumulativePurchases)}</span>
							<span class="metric-label">Purchases</span>
						</div>
					</div>
					<div class="metric-card">
						<div class="metric-icon">
							<DollarSign size={24} />
						</div>
						<div class="metric-content">
							<span class="metric-value">{formatCurrency(data.asset.cumulativeRevenue)}</span>
							<span class="metric-label">Revenue</span>
						</div>
					</div>
				</div>
			</section>

			<!-- Details Section -->
			<section class="details-section">
				<h2 class="section-title">Details</h2>
				<div class="details-grid">
					<div class="detail-row">
						<span class="detail-label">
							<Calendar size={16} />
							Submitted
						</span>
						<span class="detail-value">{formatDate(data.asset.submittedDate)}</span>
					</div>
					{#if data.asset.publishedDate}
						<div class="detail-row">
							<span class="detail-label">
								<Clock size={16} />
								Published
							</span>
							<span class="detail-value">{formatDate(data.asset.publishedDate)}</span>
						</div>
					{/if}
					{#if data.asset.decisionDate}
						<div class="detail-row">
							<span class="detail-label">
								<Clock size={16} />
								Decision Date
							</span>
							<span class="detail-value">{formatDate(data.asset.decisionDate)}</span>
						</div>
					{/if}
				</div>
			</section>

			<!-- Description Section -->
			{#if data.asset.description || data.asset.descriptionShort}
				<section class="description-section">
					<h2 class="section-title">Description</h2>
					<p class="description">
						{data.asset.descriptionShort || data.asset.description}
					</p>
				</section>
			{/if}

			<!-- Rejection Feedback -->
			{#if data.asset.status === 'Rejected' && (data.asset.rejectionFeedback || data.asset.rejectionFeedbackHtml)}
				<section class="feedback-section">
					<h2 class="section-title feedback-title">Rejection Feedback</h2>
					<div class="feedback-content">
						{#if data.asset.rejectionFeedbackHtml}
							{@html data.asset.rejectionFeedbackHtml}
						{:else}
							<p>{data.asset.rejectionFeedback}</p>
						{/if}
					</div>
				</section>
			{/if}

			<!-- Carousel Images -->
			{#if data.asset.carouselImages && data.asset.carouselImages.length > 0}
				<section class="carousel-section">
					<h2 class="section-title">Gallery</h2>
					<div class="carousel-grid">
						{#each data.asset.carouselImages as image}
							<div class="carousel-image">
								<img src={image} alt="Gallery image" />
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<!-- Sidebar -->
		<aside class="sidebar">
			{#if data.relatedAssets.length > 0}
				<section class="related-section">
					<h3 class="sidebar-title">Related Templates</h3>
					<div class="related-list">
						{#each data.relatedAssets as related}
							<a href="/assets/{related.id}" class="related-item">
								<div class="related-thumbnail">
									{#if related.thumbnailUrl}
										<img src={related.thumbnailUrl} alt={related.name} />
									{:else}
										<div class="placeholder-sm">?</div>
									{/if}
								</div>
								<div class="related-info">
									<span class="related-name">{related.name}</span>
									<span class="related-type">{related.type}</span>
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/if}
		</aside>
	</div>
</div>

<style>
	.asset-detail-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.page-header {
		margin-bottom: var(--space-lg);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		font-size: var(--text-body-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.content {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: var(--space-xl);
	}

	@media (max-width: 900px) {
		.content {
			grid-template-columns: 1fr;
		}
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	/* Hero Section */
	.hero-section {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	@media (max-width: 600px) {
		.hero-section {
			grid-template-columns: 1fr;
		}
	}

	.hero-image img {
		width: 100%;
		aspect-ratio: 7/9;
		object-fit: cover;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.hero-image .placeholder {
		width: 100%;
		aspect-ratio: 7/9;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		color: var(--color-fg-muted);
	}

	.hero-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.asset-type {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.asset-name {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.price {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.action-buttons {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-primary {
		background: var(--color-info);
		color: white;
		border: none;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		background: transparent;
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.btn-secondary:hover {
		background: var(--color-hover);
	}

	/* Section Styles */
	.section-title {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md) 0;
	}

	/* Metrics Section */
	.metrics-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 600px) {
		.metrics-grid {
			grid-template-columns: 1fr;
		}
	}

	.metric-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
	}

	.metric-icon {
		color: var(--color-fg-muted);
	}

	.metric-content {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.metric-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Details Section */
	.details-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.details-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.detail-value {
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
	}

	/* Description Section */
	.description-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.description {
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	/* Feedback Section */
	.feedback-section {
		padding: var(--space-lg);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.feedback-title {
		color: var(--color-error);
	}

	.feedback-content {
		color: var(--color-fg-primary);
		line-height: 1.6;
	}

	/* Carousel Section */
	.carousel-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.carousel-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.carousel-image img {
		width: 100%;
		aspect-ratio: 16/9;
		object-fit: cover;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	/* Sidebar */
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.related-section {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.sidebar-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md) 0;
	}

	.related-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.related-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.related-item:hover {
		background: var(--color-hover);
	}

	.related-thumbnail {
		width: 50px;
		height: 65px;
		flex-shrink: 0;
	}

	.related-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-sm);
	}

	.placeholder-sm {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.related-info {
		display: flex;
		flex-direction: column;
	}

	.related-name {
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-weight: 500;
	}

	.related-type {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}
</style>
