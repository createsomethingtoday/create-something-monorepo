<script lang="ts">
	import type { PageData } from './$types';
	import { Header } from '$lib/components/layout';
	import { Card, CardContent, Button, Badge, Separator } from '$lib/components/ui';
	import { StatusBadge } from '$lib/components/assets';
	import { ArrowLeft, ExternalLink, Edit, Eye, ShoppingCart, DollarSign, Calendar } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	const asset = $derived(data.asset);

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
			<div class="asset-layout">
				<div class="asset-main">
					{#if asset.thumbnailUrl}
						<div class="thumbnail-container">
							<img src={asset.thumbnailUrl} alt={asset.name} class="thumbnail" />
						</div>
					{/if}

					<Card>
						<CardContent>
							<div class="asset-header">
								<div class="title-row">
									<h1 class="asset-title">{asset.name}</h1>
									<StatusBadge status={asset.status} />
								</div>

								<div class="type-row">
									<Badge>{asset.type}</Badge>
									{#if asset.marketplaceUrl}
										<a
											href={asset.marketplaceUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="marketplace-link"
										>
											<ExternalLink size={14} />
											View on Marketplace
										</a>
									{/if}
								</div>
							</div>

							{#if asset.description}
								<Separator />
								<div class="description-section">
									<h2 class="section-label">Description</h2>
									<p class="description">{asset.description}</p>
								</div>
							{/if}
						</CardContent>
					</Card>

					{#if asset.websiteUrl}
						<Card>
							<CardContent>
								<h2 class="section-label">Preview</h2>
								<a href={asset.websiteUrl} target="_blank" rel="noopener noreferrer" class="preview-link">
									<ExternalLink size={16} />
									{asset.websiteUrl}
								</a>
							</CardContent>
						</Card>
					{/if}
				</div>

				<aside class="asset-sidebar">
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

					<Card>
						<CardContent>
							<h2 class="section-label">Timeline</h2>

							<div class="timeline">
								{#if asset.submittedDate}
									<div class="timeline-item">
										<Calendar size={14} />
										<span>Submitted {formatDate(asset.submittedDate)}</span>
									</div>
								{/if}
								{#if asset.publishedDate}
									<div class="timeline-item">
										<Calendar size={14} />
										<span>Published {formatDate(asset.publishedDate)}</span>
									</div>
								{/if}
							</div>
						</CardContent>
					</Card>

					<Button variant="outline" class="edit-button">
						<Edit size={16} />
						Edit Asset
					</Button>
				</aside>
			</div>
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

	.asset-layout {
		display: grid;
		gap: 1.5rem;
	}

	.thumbnail-container {
		margin-bottom: 1.5rem;
		border-radius: var(--webflow-radius-xl);
		overflow: hidden;
	}

	.thumbnail {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
	}

	.asset-header {
		margin-bottom: 1rem;
	}

	.title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.asset-title {
		font-family: var(--webflow-font-medium);
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
		margin: 0;
	}

	.type-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.marketplace-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: var(--webflow-blue);
		text-decoration: none;
	}

	.marketplace-link:hover {
		opacity: 0.8;
	}

	.section-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--webflow-fg-muted);
		margin: 0 0 0.75rem;
	}

	.description-section {
		padding-top: 1rem;
	}

	.description {
		font-size: 0.9375rem;
		color: var(--webflow-fg-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.preview-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--webflow-blue);
		text-decoration: none;
		word-break: break-all;
	}

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

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.timeline-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--webflow-fg-secondary);
	}

	.timeline-item :global(svg) {
		color: var(--webflow-fg-muted);
	}

	.edit-button {
		width: 100%;
	}

	.not-found {
		text-align: center;
		color: var(--webflow-fg-muted);
	}

	@media (min-width: 768px) {
		.asset-layout {
			grid-template-columns: 1fr 300px;
		}

		.asset-sidebar {
			display: flex;
			flex-direction: column;
			gap: 1.5rem;
		}
	}
</style>
