<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { products } from '$lib/data/services';

	// Group products by pricing tier
	const freeProducts = products.filter((p) => p.pricing === 'Free');
	const paidProducts = products.filter((p) => p.pricing !== 'Free');
</script>

<SEO
	title="Products"
	description="Self-serve tools to apply subtractive thinking. From free templates to complete AI development environments."
	keywords="AI tools, automation templates, subtractive design, Canon CSS, vertical templates"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero Section -->
<section class="hero-section">
	<div class="max-w-4xl mx-auto px-6 text-center">
		<p class="eyebrow">Tools that teach</p>
		<h1 class="hero-title">Products</h1>
		<p class="hero-subtitle">
			Self-serve tools to apply subtractive thinking. Start free, go deeper when ready.
		</p>
	</div>
</section>

<!-- Free Products -->
<section class="products-section">
	<div class="max-w-5xl mx-auto px-6">
		<h2 class="section-title">Free Tools</h2>
		<p class="section-subtitle">Start here. No commitment required.</p>

		<div class="products-grid">
			{#each freeProducts as product, index}
				<a
					href="/products/{product.id}"
					class="product-card animate-reveal"
					style="--delay: {index}"
				>
					<div class="product-header">
						<h3 class="product-title">{product.title}</h3>
						<span class="product-price free">Free</span>
					</div>
					<p class="product-description">{product.description}</p>
					<span class="product-cta">Get started →</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Paid Products -->
<section class="products-section paid">
	<div class="max-w-5xl mx-auto px-6">
		<h2 class="section-title">Premium Tools</h2>
		<p class="section-subtitle">Production-ready solutions with support.</p>

		<div class="products-grid">
			{#each paidProducts as product, index}
				<a
					href="/products/{product.id}"
					class="product-card animate-reveal"
					style="--delay: {index}"
				>
					<div class="product-header">
						<h3 class="product-title">{product.title}</h3>
						<span class="product-price">{product.pricing}</span>
					</div>
					<p class="product-description">{product.description}</p>
					<div class="product-meta">
						<span class="product-timeline">{product.timeline}</span>
					</div>
					<span class="product-cta">Learn more →</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Consulting CTA -->
<section class="cta-section">
	<div class="max-w-3xl mx-auto px-6 text-center">
		<div class="cta-card">
			<h3 class="cta-title">Need deeper partnership?</h3>
			<p class="cta-text">
				Products teach you to fish. Consulting catches the big ones together.
			</p>
			<a href="/services" class="cta-button">View consulting services →</a>
		</div>
	</div>
</section>

<style>
	/* Hero Section */
	.hero-section {
		padding: var(--space-2xl) 0;
		min-height: 30vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		font-style: italic;
		margin-bottom: var(--space-sm);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-md);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
		max-width: 42rem;
		margin: 0 auto;
	}

	/* Products Section */
	.products-section {
		padding: var(--space-xl) 0 var(--space-2xl);
		border-top: 1px solid var(--color-border-default);
	}

	.products-section.paid {
		background: var(--color-bg-elevated);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.section-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-lg);
	}

	.products-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
	}

	/* Product Card */
	.product-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			background var(--duration-standard) var(--ease-standard);
	}

	.product-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.product-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	.product-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.product-price {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full);
		white-space: nowrap;
	}

	.product-price.free {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.product-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
		flex-grow: 1;
	}

	.product-meta {
		display: flex;
		gap: var(--space-sm);
	}

	.product-timeline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.product-cta {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.product-card:hover .product-cta {
		color: var(--color-fg-primary);
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-xl) 0 var(--space-2xl);
	}

	.cta-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.cta-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.cta-text {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
	}

	.cta-button {
		display: inline-block;
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		color: var(--color-fg-primary);
	}

	/* Animation */
	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 80ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-h1);
		}

		.products-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
