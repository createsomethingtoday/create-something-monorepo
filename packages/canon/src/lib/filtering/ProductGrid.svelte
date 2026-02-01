<script lang="ts">
	/**
	 * ProductGrid
	 *
	 * Reusable product grid display component.
	 * Renders a responsive grid of product cards.
	 */
	import type { FilterableProduct } from './types.js';

	// Props
	export let products: FilterableProduct[] = [];
	export let emptyMessage: string = 'No products found.';
	export let formatPrice: (cents: number) => string = (cents) => `$${(cents / 100).toLocaleString()}`;
	export let formatDimensions: (d: { width: number; depth: number; height: number }) => string = (d) =>
		`W${d.width} x D${d.depth} x H${d.height} cm`;
</script>

{#if products.length === 0}
	<div class="empty-state">
		<p>{emptyMessage}</p>
		<slot name="empty-action" />
	</div>
{:else}
	<div class="product-grid">
		{#each products as product (product.id)}
			<article class="product-card">
				<div class="product-image">
					<img src={product.image_url} alt={product.name} loading="lazy" />
					{#if product.status === 'pre_order'}
						<span class="status-badge">Pre-order</span>
					{/if}
				</div>
				<div class="product-info">
					<h3 class="product-name">{product.name}</h3>
					<div class="product-details">
						{#if product.dimensions}
							<div class="detail-row">
								<span class="detail-label">Dimensions</span>
								<span class="detail-value">{formatDimensions(product.dimensions)}</span>
							</div>
						{/if}
						<div class="detail-row">
							<span class="detail-label">Material</span>
							<span class="detail-value">{product.materials.join(', ')}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Price</span>
							<span class="detail-value">{formatPrice(product.price)}</span>
						</div>
					</div>
				</div>
			</article>
		{/each}
	</div>
{/if}

<style>
	.empty-state {
		text-align: center;
		padding: var(--space-lg) var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.empty-state p {
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.product-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-md);
	}

	.product-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		overflow: hidden;
		transition: 
			border-color var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out),
			box-shadow var(--duration-fast) var(--ease-out);
	}

	.product-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.product-card:active {
		transform: translateY(0);
		transition-duration: var(--duration-micro);
	}

	.product-image {
		aspect-ratio: 4/3;
		background: var(--color-bg-surface);
		position: relative;
	}

	.product-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.status-badge {
		position: absolute;
		top: var(--space-xs);
		right: var(--space-xs);
		font-size: var(--text-caption);
		font-weight: 500;
		padding: 2px var(--space-xs);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-xs);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.product-info {
		padding: var(--space-sm);
	}

	.product-name {
		font-size: var(--text-body-sm);
		font-weight: 600;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-primary);
		line-height: 1.2;
	}

	.product-details {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-caption);
		padding: 4px 0;
		border-top: 1px solid var(--color-border-default);
	}

	.detail-row:first-child {
		border-top: none;
		padding-top: 0;
	}

	.detail-label {
		font-weight: 500;
		color: var(--color-fg-muted);
	}

	.detail-value {
		color: var(--color-fg-secondary);
	}

	@media (max-width: 640px) {
		.product-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
