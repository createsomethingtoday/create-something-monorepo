<script lang="ts">
	import type { PageData } from './$types';
	import type { StatusTimelineItem } from '$lib/types';
	import { Header } from '$lib/components/layout';
	import { Card, CardContent, Button, Badge, Separator } from '$lib/components/ui';
	import { StatusBadge } from '$lib/components/assets';
	import {
		ArrowLeft,
		ExternalLink,
		Edit,
		Eye,
		ShoppingCart,
		DollarSign,
		Calendar,
		MessageCircle,
		ClipboardCheck,
		CheckCircle,
		XCircle,
		Clock,
		FileText
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const asset = $derived(data.asset);
	const relatedAssets = $derived(data.relatedAssets ?? []);

	let activeTab = $state<'overview' | 'details' | 'related'>('overview');
	let showPerformanceMetrics = $state(false);

	function formatCurrency(value: number | undefined): string {
		if (!value) return '$0';
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(value);
	}

	function formatNumber(value: number | undefined): string {
		if (!value) return '0';
		return new Intl.NumberFormat('en-US').format(value);
	}

	function formatDate(dateStr: string | undefined): string {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Build status timeline
	const statusTimeline = $derived.by(() => {
		if (!asset) return [];

		const timeline: StatusTimelineItem[] = [];

		// Add submitted status
		if (asset.submittedDate) {
			timeline.push({
				date: formatDate(asset.submittedDate),
				status: 'Submitted'
			});
		}

		// Add review status if available
		if (asset.latestReviewStatus) {
			timeline.push({
				date: formatDate(asset.latestReviewDate),
				status: asset.latestReviewStatus,
				comment: asset.latestReviewFeedback
			});
		}

		// Add decision date if available
		if (asset.decisionDate) {
			timeline.push({
				date: formatDate(asset.decisionDate),
				status: asset.status
			});
		}

		return timeline;
	});

	// Status color config
	function getStatusColor(status: string) {
		const statusLower = status.toLowerCase();
		if (statusLower.includes('published') || statusLower.includes('approved')) {
			return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
		}
		if (statusLower.includes('rejected')) {
			return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
		}
		if (statusLower.includes('review') || statusLower.includes('changes')) {
			return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
		}
		if (statusLower.includes('scheduled') || statusLower.includes('upcoming')) {
			return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
		}
		if (statusLower.includes('delisted')) {
			return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' };
		}
		return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
	}
</script>

<svelte:head>
	<title>{asset?.name ?? 'Asset'} | Webflow Asset Dashboard</title>
</svelte:head>

<Header userEmail={data.user?.email} />

<main class="main">
	<div class="content">
		<nav class="breadcrumb">
			<a href="/assets" class="back-link">
				<ArrowLeft size={16} />
				Back to Assets
			</a>
		</nav>

		{#if asset}
			<!-- Sticky Header -->
			<div class="sticky-header">
				<div class="header-content">
					<div class="header-left">
						<h1 class="asset-name">{asset.name}</h1>
						<StatusBadge status={asset.status} />
					</div>
					<div class="header-actions">
						{#if asset.previewUrl}
							<a href={asset.previewUrl} target="_blank" rel="noopener noreferrer" class="action-btn">
								<Eye size={16} />
								Preview
							</a>
						{/if}
						{#if asset.websiteUrl}
							<a href={asset.websiteUrl} target="_blank" rel="noopener noreferrer" class="action-btn">
								<ExternalLink size={16} />
								View Live
							</a>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tabs Navigation -->
			<div class="tabs-nav">
				<button
					type="button"
					class="tab-btn"
					class:active={activeTab === 'overview'}
					onclick={() => (activeTab = 'overview')}
				>
					Overview
				</button>
				<button
					type="button"
					class="tab-btn"
					class:active={activeTab === 'details'}
					onclick={() => (activeTab = 'details')}
				>
					Additional Details
				</button>
				<button
					type="button"
					class="tab-btn"
					class:active={activeTab === 'related'}
					onclick={() => (activeTab = 'related')}
				>
					Related Assets
				</button>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'overview'}
				<div class="overview-layout">
					<!-- Left Column -->
					<div class="main-column">
						<Card>
							<CardContent>
								<div class="card-header-row">
									<h2 class="section-label">Template Details</h2>
									<button
										type="button"
										class="performance-toggle"
										class:active={showPerformanceMetrics}
										onclick={() => (showPerformanceMetrics = !showPerformanceMetrics)}
									>
										{showPerformanceMetrics ? 'Hide' : 'Show'} Performance
									</button>
								</div>

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
										<span class="detail-label">Current Status</span>
										<StatusBadge status={asset.status} />
									</div>
									{#if asset.qualityScore}
										<div class="detail-item">
											<span class="detail-label">Quality Score</span>
											<span class="detail-value">{asset.qualityScore}</span>
										</div>
									{/if}
									{#if asset.latestReviewStatus}
										<div class="detail-item">
											<span class="detail-label">Latest Review Status</span>
											<span class="detail-value">{asset.latestReviewStatus}</span>
										</div>
									{/if}

									{#if showPerformanceMetrics && asset.status !== 'Upcoming'}
										<div class="detail-item">
											<span class="detail-label">Unique Viewers</span>
											<span class="detail-value">{formatNumber(asset.uniqueViewers)}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Cumulative Purchases</span>
											<span class="detail-value">{formatNumber(asset.cumulativePurchases)}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Cumulative Revenue</span>
											<span class="detail-value">{formatCurrency(asset.cumulativeRevenue)}</span>
										</div>
									{/if}
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent>
								<h2 class="section-label">Description</h2>
								{#if asset.descriptionShort}
									<p class="description-short">{asset.descriptionShort}</p>
									<Separator />
								{/if}
								{#if asset.descriptionLongHtml}
									<div class="description-long">
										{@html asset.descriptionLongHtml}
									</div>
								{:else if asset.description}
									<p class="description">{asset.description}</p>
								{/if}
							</CardContent>
						</Card>

						<!-- Rejection Feedback -->
						{#if asset.status === 'Rejected' && (asset.rejectionFeedback || asset.rejectionFeedbackHtml)}
							<Card class="rejection-card">
								<CardContent>
									<div class="rejection-header">
										<MessageCircle size={20} class="rejection-icon" />
										<h2 class="rejection-title">Rejection Feedback</h2>
									</div>
									{#if asset.rejectionFeedbackHtml}
										<div class="rejection-content">
											{@html asset.rejectionFeedbackHtml}
										</div>
									{:else if asset.rejectionFeedback}
										<ul class="rejection-list">
											{#each asset.rejectionFeedback.split('-').filter((item) => item.trim()) as item}
												<li>{item.trim()}</li>
											{/each}
										</ul>
									{/if}
								</CardContent>
							</Card>
						{/if}
					</div>

					<!-- Right Column -->
					<aside class="sidebar-column">
						<Card>
							<CardContent>
								<h2 class="section-label">Preview</h2>
								<p class="preview-subtitle">Template's promotional images</p>
								{#if asset.thumbnailUrl}
									<div class="thumbnail-section">
										<span class="thumbnail-label">Primary Thumbnail</span>
										<img src={asset.thumbnailUrl} alt={asset.name} class="thumbnail-img" />
									</div>
								{/if}
								{#if asset.secondaryThumbnailUrl}
									<div class="thumbnail-section">
										<span class="thumbnail-label">Secondary Thumbnail</span>
										<img
											src={asset.secondaryThumbnailUrl}
											alt="{asset.name} secondary"
											class="thumbnail-img secondary"
										/>
									</div>
								{/if}
							</CardContent>
						</Card>

						<Card>
							<CardContent>
								<h2 class="section-label">Performance</h2>
								<div class="metrics">
									<div class="metric">
										<Eye size={18} class="metric-icon" />
										<div class="metric-content">
											<span class="metric-value">{formatNumber(asset.uniqueViewers)}</span>
											<span class="metric-label">Unique Viewers</span>
										</div>
									</div>
									<div class="metric">
										<ShoppingCart size={18} class="metric-icon" />
										<div class="metric-content">
											<span class="metric-value">{formatNumber(asset.cumulativePurchases)}</span>
											<span class="metric-label">Purchases</span>
										</div>
									</div>
									<div class="metric">
										<DollarSign size={18} class="metric-icon" />
										<div class="metric-content">
											<span class="metric-value">{formatCurrency(asset.cumulativeRevenue)}</span>
											<span class="metric-label">Revenue</span>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<Button variant="outline" class="edit-button">
							<Edit size={16} />
							Edit Asset
						</Button>
					</aside>
				</div>
			{/if}

			{#if activeTab === 'details'}
				<div class="details-layout">
					<div class="main-column">
						<!-- Status Timeline -->
						<Card>
							<CardContent>
								<h2 class="section-label">Status History</h2>
								<p class="timeline-subtitle">Timeline of status changes for this template</p>
								<Separator />

								<div class="timeline-container">
									<div class="timeline-track"></div>
									<div class="timeline-items">
										{#each statusTimeline as item, index}
											{@const colors = getStatusColor(item.status)}
											{@const isLatest = index === statusTimeline.length - 1}
											<div class="timeline-item" class:latest={isLatest}>
												<div class="timeline-date">{item.date}</div>
												<div class="timeline-node {colors.bg} {colors.border}">
													{#if item.status.toLowerCase().includes('submitted')}
														<Calendar size={isLatest ? 20 : 16} class={colors.text} />
													{:else if item.status.toLowerCase().includes('review') || item.status.toLowerCase().includes('changes')}
														<ClipboardCheck size={isLatest ? 20 : 16} class={colors.text} />
													{:else if item.status.toLowerCase().includes('approved') || item.status.toLowerCase().includes('published')}
														<CheckCircle size={isLatest ? 20 : 16} class={colors.text} />
													{:else if item.status.toLowerCase().includes('rejected')}
														<XCircle size={isLatest ? 20 : 16} class={colors.text} />
													{:else}
														<FileText size={isLatest ? 20 : 16} class={colors.text} />
													{/if}
												</div>
												<div class="timeline-status {colors.bg} {colors.text} {colors.border}">
													{item.status}
												</div>
												{#if item.comment}
													<button type="button" class="timeline-feedback-btn {colors.border} {colors.text}">
														<MessageCircle size={14} />
														View Feedback
													</button>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							</CardContent>
						</Card>

						<!-- Template Details Table -->
						<Card>
							<CardContent>
								<h2 class="section-label">Template Details</h2>
								<table class="details-table">
									<thead>
										<tr>
											<th>Property</th>
											<th>Value</th>
										</tr>
									</thead>
									<tbody>
										<tr>
											<td>Name</td>
											<td>{asset.name || 'N/A'}</td>
										</tr>
										<tr>
											<td>Website URL</td>
											<td>
												{#if asset.websiteUrl}
													<a href={asset.websiteUrl} target="_blank" rel="noopener noreferrer">
														{asset.websiteUrl}
													</a>
												{:else}
													N/A
												{/if}
											</td>
										</tr>
										<tr>
											<td>Price</td>
											<td>{asset.priceString || '$0'}</td>
										</tr>
										<tr>
											<td>Description (Short)</td>
											<td>{asset.descriptionShort || 'N/A'}</td>
										</tr>
										<tr>
											<td>Submitted Date</td>
											<td>{formatDate(asset.submittedDate)}</td>
										</tr>
									</tbody>
								</table>
							</CardContent>
						</Card>
					</div>

					<aside class="sidebar-column">
						<Card>
							<CardContent>
								<h2 class="section-label">Carousel Images</h2>
								{#if asset.carouselImages && asset.carouselImages.length > 0}
									<div class="carousel-images">
										{#each asset.carouselImages as img, i}
											<img src={img} alt="Carousel item {i + 1}" class="carousel-img" />
										{/each}
									</div>
								{:else}
									<p class="no-images">No carousel images available</p>
								{/if}
							</CardContent>
						</Card>
					</aside>
				</div>
			{/if}

			{#if activeTab === 'related'}
				<Card>
					<CardContent>
						<h2 class="section-label">Related Assets</h2>
						<p class="related-subtitle">Assets that are similar to this template</p>

						{#if relatedAssets.length === 0}
							<div class="empty-state">
								<div class="empty-icon">
									<FileText size={48} />
								</div>
								<h3>No related assets found</h3>
								<p>There are currently no assets similar to this template.</p>
							</div>
						{:else}
							<div class="related-grid">
								{#each relatedAssets as related}
									<a href="/assets/{related.id}" class="related-card">
										<div class="related-thumbnail">
											{#if related.thumbnailUrl}
												<img src={related.thumbnailUrl} alt={related.name} />
											{/if}
										</div>
										<h4 class="related-name">{related.name}</h4>
										<p class="related-type">{related.type}</p>
										<span class="related-link">View details</span>
									</a>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}
		{:else}
			<Card>
				<CardContent>
					<p class="not-found">Asset not found.</p>
				</CardContent>
			</Card>
		{/if}
	</div>
</main>

<style>
	.main {
		min-height: calc(100vh - 60px);
	}

	.content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.breadcrumb {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--webflow-fg-secondary);
		text-decoration: none;
		transition: color var(--webflow-duration) var(--webflow-ease);
	}

	.back-link:hover {
		color: var(--webflow-fg-primary);
	}

	/* Sticky Header */
	.sticky-header {
		position: sticky;
		top: 0;
		z-index: 10;
		background: var(--webflow-bg-secondary);
		border-bottom: 1px solid var(--webflow-border);
		padding: 0.75rem 0;
		margin-bottom: 1.5rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.asset-name {
		font-family: var(--webflow-font-medium);
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: var(--webflow-fg-secondary);
		background: var(--webflow-bg-tertiary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-md);
		text-decoration: none;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.action-btn:hover {
		color: var(--webflow-fg-primary);
		border-color: var(--webflow-border-emphasis);
	}

	/* Tabs Navigation */
	.tabs-nav {
		display: flex;
		border-bottom: 1px solid var(--webflow-border);
		margin-bottom: 1.5rem;
	}

	.tab-btn {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--webflow-fg-muted);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.tab-btn:hover {
		color: var(--webflow-fg-secondary);
	}

	.tab-btn.active {
		color: var(--webflow-blue);
		border-bottom-color: var(--webflow-blue);
	}

	/* Layout */
	.overview-layout,
	.details-layout {
		display: grid;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.overview-layout,
		.details-layout {
			grid-template-columns: 1fr 300px;
		}
	}

	.main-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.sidebar-column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Section Labels */
	.section-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--webflow-fg-muted);
		margin: 0 0 0.75rem;
	}

	/* Card Header Row */
	.card-header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.performance-toggle {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--webflow-fg-secondary);
		background: var(--webflow-bg-tertiary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-md);
		cursor: pointer;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.performance-toggle.active {
		background: var(--webflow-blue);
		color: white;
		border-color: var(--webflow-blue);
	}

	/* Details Grid */
	.details-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.detail-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--webflow-fg-muted);
	}

	.detail-value {
		font-size: 0.9375rem;
		color: var(--webflow-fg-primary);
	}

	/* Description */
	.description-short {
		font-size: 0.9375rem;
		color: var(--webflow-fg-secondary);
		line-height: 1.6;
		margin: 0 0 1rem;
	}

	.description-long {
		font-size: 0.9375rem;
		color: var(--webflow-fg-secondary);
		line-height: 1.6;
	}

	.description-long :global(h1),
	.description-long :global(h2),
	.description-long :global(h3) {
		color: var(--webflow-fg-primary);
		margin: 1rem 0 0.5rem;
	}

	.description-long :global(a) {
		color: var(--webflow-blue);
	}

	/* Rejection Card */
	.rejection-card {
		border-color: rgba(239, 68, 68, 0.3);
	}

	.rejection-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.rejection-icon {
		color: #ef4444;
	}

	.rejection-title {
		font-size: 1rem;
		font-weight: 600;
		color: #ef4444;
		margin: 0;
	}

	.rejection-content {
		font-size: 0.9375rem;
		color: var(--webflow-fg-secondary);
	}

	.rejection-content :global(a) {
		color: var(--webflow-blue);
	}

	.rejection-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.rejection-list li {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.9375rem;
		color: var(--webflow-fg-secondary);
		margin-bottom: 0.5rem;
	}

	.rejection-list li::before {
		content: '';
		width: 6px;
		height: 6px;
		background: rgba(239, 68, 68, 0.3);
		border-radius: 50%;
		margin-top: 0.5rem;
		flex-shrink: 0;
	}

	/* Thumbnails */
	.preview-subtitle {
		font-size: 0.875rem;
		color: var(--webflow-fg-muted);
		margin: 0 0 1rem;
	}

	.thumbnail-section {
		margin-bottom: 1rem;
	}

	.thumbnail-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--webflow-fg-muted);
		margin-bottom: 0.5rem;
	}

	.thumbnail-img {
		width: 100%;
		aspect-ratio: 7 / 9;
		object-fit: cover;
		border-radius: var(--webflow-radius-md);
	}

	.thumbnail-img.secondary {
		aspect-ratio: 16 / 10;
	}

	/* Metrics */
	.metrics {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.metric {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.metric-icon {
		color: var(--webflow-fg-muted);
	}

	.metric-content {
		display: flex;
		flex-direction: column;
	}

	.metric-value {
		font-family: var(--webflow-font-medium);
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
	}

	.metric-label {
		font-size: 0.75rem;
		color: var(--webflow-fg-muted);
	}

	/* Edit Button */
	.edit-button {
		width: 100%;
	}

	/* Timeline */
	.timeline-subtitle {
		font-size: 0.875rem;
		color: var(--webflow-fg-muted);
		margin: 0 0 1rem;
	}

	.timeline-container {
		position: relative;
		padding: 1rem 0;
		overflow-x: auto;
	}

	.timeline-track {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--webflow-border);
		transform: translateY(-50%);
	}

	.timeline-items {
		display: flex;
		justify-content: center;
		gap: 4rem;
		position: relative;
	}

	.timeline-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		min-width: 100px;
	}

	.timeline-date {
		font-size: 0.75rem;
		color: var(--webflow-fg-muted);
	}

	.timeline-node {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid;
		background: var(--webflow-bg-secondary);
		z-index: 1;
	}

	.timeline-item.latest .timeline-node {
		width: 56px;
		height: 56px;
		box-shadow: 0 0 0 4px var(--webflow-bg-secondary);
	}

	.timeline-status {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--webflow-radius-md);
		border: 1px solid;
	}

	.timeline-feedback-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background: var(--webflow-bg-secondary);
		border: 1px solid;
		border-radius: var(--webflow-radius-sm);
		cursor: pointer;
	}

	/* Details Table */
	.details-table {
		width: 100%;
		border-collapse: collapse;
	}

	.details-table th,
	.details-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--webflow-border);
	}

	.details-table th {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--webflow-fg-muted);
	}

	.details-table td {
		font-size: 0.875rem;
		color: var(--webflow-fg-secondary);
	}

	.details-table td a {
		color: var(--webflow-blue);
		text-decoration: none;
	}

	.details-table td a:hover {
		text-decoration: underline;
	}

	/* Carousel Images */
	.carousel-images {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.carousel-img {
		width: 100%;
		aspect-ratio: 16 / 10;
		object-fit: cover;
		border-radius: var(--webflow-radius-md);
	}

	.no-images {
		font-size: 0.875rem;
		color: var(--webflow-fg-muted);
		text-align: center;
		padding: 2rem 0;
	}

	/* Related Assets */
	.related-subtitle {
		font-size: 0.875rem;
		color: var(--webflow-fg-muted);
		margin: 0 0 1.5rem;
	}

	.related-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.related-card {
		display: block;
		padding: 1rem;
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-lg);
		text-decoration: none;
		transition: all var(--webflow-duration) var(--webflow-ease);
	}

	.related-card:hover {
		border-color: var(--webflow-border-emphasis);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.related-thumbnail {
		aspect-ratio: 16 / 9;
		background: var(--webflow-bg-tertiary);
		border-radius: var(--webflow-radius-md);
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.related-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.related-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--webflow-fg-primary);
		margin: 0 0 0.25rem;
	}

	.related-type {
		font-size: 0.875rem;
		color: var(--webflow-fg-muted);
		margin: 0 0 0.75rem;
	}

	.related-link {
		font-size: 0.875rem;
		color: var(--webflow-blue);
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.empty-icon {
		color: var(--webflow-fg-muted);
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
		margin: 0 0 0.5rem;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: var(--webflow-fg-muted);
		margin: 0;
	}

	.not-found {
		text-align: center;
		color: var(--webflow-fg-muted);
	}
</style>
