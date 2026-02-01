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
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.empty-state p {
		margin: 0 0 var(--space-md);
		color: var(--color-fg-tertiary);
	}

	.product-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.product-card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition:
			transform var(--duration-micro),
			border-color var(--duration-micro);
	}

	.product-card:hover {
		transform: translateY(-2px);
		border-color: var(--color-border-emphasis);
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
		top: var(--space-sm);
		right: var(--space-sm);
		font-size: var(--text-caption-sm);
		font-weight: 500;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-pure);
		border-radius: var(--radius-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.product-info {
		padding: var(--space-md);
	}

	.product-name {
		font-size: var(--text-body);
		font-weight: 600;
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	.product-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-caption);
		padding: var(--space-sm) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.detail-row:first-child {
		border-top: none;
		padding-top: 0;
	}

	.detail-label {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.detail-value {
		color: var(--color-fg-tertiary);
	}

	@media (max-width: 640px) {
		.product-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
