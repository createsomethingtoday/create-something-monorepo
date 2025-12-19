<script lang="ts">
	import type { Asset } from '$lib/types';
	import { Card, CardContent, Badge } from '$lib/components/ui';
	import StatusBadge from './StatusBadge.svelte';
	import { ExternalLink, Eye, DollarSign, ShoppingCart } from 'lucide-svelte';

	interface Props {
		asset: Asset;
		onclick?: () => void;
	}

	let { asset, onclick }: Props = $props();

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
</script>

<button class="asset-card-wrapper" {onclick} type="button">
	<Card variant="elevated">
		<div class="card-inner">
			{#if asset.thumbnailUrl}
				<div class="thumbnail">
					<img src={asset.thumbnailUrl} alt={asset.name} />
				</div>
			{:else}
				<div class="thumbnail placeholder">
					<span class="placeholder-text">{asset.type}</span>
				</div>
			{/if}

			<CardContent>
				<div class="header">
					<h3 class="title">{asset.name}</h3>
					<StatusBadge status={asset.status} />
				</div>

				{#if asset.description}
					<p class="description">{asset.description}</p>
				{/if}

				<div class="type-row">
					<Badge variant="default">{asset.type}</Badge>
					{#if asset.marketplaceUrl}
						<a
							href={asset.marketplaceUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="marketplace-link"
							onclick={(e) => e.stopPropagation()}
						>
							<ExternalLink size={14} />
							View
						</a>
					{/if}
				</div>

				{#if asset.status === 'Published'}
					<div class="metrics">
						<div class="metric">
							<Eye size={14} />
							<span>{formatNumber(asset.uniqueViewers)}</span>
						</div>
						<div class="metric">
							<ShoppingCart size={14} />
							<span>{formatNumber(asset.cumulativePurchases)}</span>
						</div>
						<div class="metric">
							<DollarSign size={14} />
							<span>{formatCurrency(asset.cumulativeRevenue)}</span>
						</div>
					</div>
				{/if}
			</CardContent>
		</div>
	</Card>
</button>

<style>
	.asset-card-wrapper {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.asset-card-wrapper:focus-visible {
		outline: 2px solid var(--webflow-blue);
		outline-offset: 2px;
		border-radius: var(--webflow-radius-xl);
	}

	.card-inner {
		display: flex;
		flex-direction: column;
	}

	.thumbnail {
		width: 100%;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: var(--webflow-radius-xl) var(--webflow-radius-xl) 0 0;
	}

	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumbnail.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--webflow-bg-hover);
	}

	.placeholder-text {
		color: var(--webflow-fg-muted);
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.title {
		font-family: var(--webflow-font-medium);
		font-size: 1rem;
		font-weight: 600;
		color: var(--webflow-fg-primary);
		margin: 0;
		line-height: 1.4;
	}

	.description {
		font-size: 0.875rem;
		color: var(--webflow-fg-secondary);
		margin: 0 0 0.75rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.type-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.marketplace-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--webflow-blue);
		text-decoration: none;
		transition: opacity var(--webflow-duration) var(--webflow-ease);
	}

	.marketplace-link:hover {
		opacity: 0.8;
	}

	.metrics {
		display: flex;
		gap: 1rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--webflow-border);
	}

	.metric {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--webflow-fg-secondary);
	}

	.metric :global(svg) {
		color: var(--webflow-fg-muted);
	}
</style>
