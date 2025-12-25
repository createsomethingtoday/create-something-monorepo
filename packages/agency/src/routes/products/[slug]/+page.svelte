<script lang="ts">
	import type { PageData } from './$types';
	import SEO from '$lib/components/SEO.svelte';

	let { data }: { data: PageData } = $props();
	const { product } = data;

	const isFree = product.pricing === 'Free';
</script>

<SEO
	title="{product.title} | Products"
	description={product.description}
	keywords="AI tools, automation, {product.title.toLowerCase()}, subtractive design"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="product-page">
	<!-- Back Link -->
	<nav class="back-nav">
		<a href="/products" class="back-link">
			<span class="back-arrow">←</span>
			All products
		</a>
	</nav>

	<!-- Product Header -->
	<header class="product-header">
		<div class="product-badge" class:free={isFree}>
			{isFree ? 'Free' : product.pricing}
		</div>
		<h1 class="product-title">{product.title}</h1>
		<p class="product-triad">
			<span class="triad-action">{product.triadAction}</span>
			<span class="triad-separator">·</span>
			<span class="triad-question">{product.triadQuestion}</span>
		</p>
		<p class="product-description">{product.description}</p>
	</header>

	<!-- When to Use This -->
	<section class="product-section">
		<h2 class="section-label">When to Use This</h2>
		<ul class="use-list">
			{#each product.whenToUse as item}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<!-- What This Removes -->
	<section class="product-section">
		<h2 class="section-label">What This Removes</h2>
		<ul class="removes-list">
			{#each product.whatThisRemoves as item}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<!-- What You Get -->
	{#if product.deliverables && product.deliverables.length > 0}
		<section class="product-section">
			<h2 class="section-label">What You Get</h2>
			<ul class="deliverables-list">
				{#each product.deliverables as item}
					<li>{item}</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- CTA Section -->
	<section class="cta-section">
		<div class="cta-content">
			<div class="cta-info">
				<span class="cta-price">{product.pricing}</span>
				<span class="cta-timeline">{product.timeline}</span>
			</div>

			{#if isFree}
				<a href={product.caseStudyLink || '/discover'} class="cta-button primary">
					Get started free
				</a>
			{:else}
				<a href="/contact?product={product.id}" class="cta-button primary">
					Get {product.title}
				</a>
			{/if}
		</div>

		{#if product.caseStudyLink}
			<a href={product.caseStudyLink} class="case-study-link">
				See it in action: {product.caseStudy} →
			</a>
		{/if}
	</section>

	<!-- Alternative Path -->
	<section class="alt-section">
		<p class="alt-text">
			Need deeper partnership?
			<a href="/services" class="alt-link">Explore consulting services</a>
		</p>
	</section>
</main>

<style>
	.product-page {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	/* Back Nav */
	.back-nav {
		margin-bottom: var(--space-xl);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	.back-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover .back-arrow {
		transform: translateX(-4px);
	}

	/* Header */
	.product-header {
		margin-bottom: var(--space-xl);
		text-align: center;
	}

	.product-badge {
		display: inline-block;
		padding: 0.25rem 1rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-md);
	}

	.product-badge.free {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.product-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		line-height: var(--leading-tight);
		margin-bottom: var(--space-sm);
	}

	.product-triad {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.triad-action {
		font-family: monospace;
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
	}

	.triad-separator {
		color: var(--color-fg-muted);
	}

	.triad-question {
		font-size: var(--text-body);
		font-style: italic;
		color: var(--color-fg-muted);
	}

	.product-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: 1.7;
		max-width: 48ch;
		margin: 0 auto;
	}

	/* Sections */
	.product-section {
		padding: var(--space-lg) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.section-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	.use-list,
	.removes-list,
	.deliverables-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.use-list li,
	.deliverables-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		padding-left: 1.5rem;
		position: relative;
	}

	.use-list li::before,
	.deliverables-list li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
	}

	.removes-list li {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		padding-left: 1.5rem;
		position: relative;
	}

	.removes-list li::before {
		content: '−';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* CTA Section */
	.cta-section {
		padding: var(--space-xl) 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.cta-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.cta-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.cta-price {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.cta-timeline {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.cta-button {
		display: inline-block;
		padding: 0.875rem 2rem;
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.cta-button.primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.cta-button.primary:hover {
		opacity: 0.9;
	}

	.case-study-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.case-study-link:hover {
		color: var(--color-fg-primary);
	}

	/* Alternative Section */
	.alt-section {
		padding-top: var(--space-lg);
		text-align: center;
	}

	.alt-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.alt-link {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.alt-link:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.product-title {
			font-size: var(--text-h1);
		}

		.product-triad {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.triad-separator {
			display: none;
		}
	}
</style>
