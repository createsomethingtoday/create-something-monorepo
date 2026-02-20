<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import { products } from '$lib/data/services';

	// Scroll reveal observer
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
		);

		document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	});

	// Group products by category
	const featured = products.filter((p) => p.category === 'featured');
	const devTools = products.filter((p) => p.category === 'developer-tools');
	const framework = products.filter((p) => p.category === 'framework');
	const integrations = products.filter((p) => p.category === 'integration');
	const clientWork = products.filter((p) => p.category === 'client');

	function isExternal(href: string | undefined): boolean {
		return !!href && href.startsWith('http');
	}
</script>

<SEO
	title="What I've Built | 16+ Production Integrations"
	description="Open source tools and custom integrations connecting business tools to AI. Notion, Gmail, Zoom, Salesforce, HubSpot, Procore, and more."
	keywords="AI integrations, business tool automation, Notion AI, Gmail AI, Zoom AI, Salesforce AI, custom AI development, MCP servers"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<p class="hero-eyebrow reveal">Open Source + Custom</p>
		<h1 class="hero-title reveal">What I've Built</h1>
		<p class="hero-subtitle reveal">
			{products.length} integrations — open source tools, platform connectors, and custom builds for clients.
		</p>
	</div>
</section>

<!-- Featured Products -->
<section class="products-section">
	<div class="section-inner">
		<div class="section-header reveal">
			<h2 class="section-eyebrow">Flagship Tools</h2>
			<p class="section-desc">Install in 2 minutes. Powering the same agents we build for clients.</p>
		</div>
		<div class="featured-grid">
			{#each featured as product, index}
				<a href={product.href} class="product-card featured-card reveal" style="--delay: {index * 100}ms">
					<div class="product-badge badge-oss">{product.badge}</div>
					<h3 class="product-name">{product.title}</h3>
					<p class="product-tagline">{product.tagline}</p>
					<p class="product-description">{product.description}</p>
					<div class="product-footer">
						{#if product.npmPackage}
							<code class="product-npm">{product.npmPackage}</code>
						{/if}
						<span class="product-cta">Install →</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Developer Tools -->
<section class="products-section">
	<div class="section-inner">
		<div class="section-header reveal">
			<h2 class="section-eyebrow">Developer Tools</h2>
			<p class="section-desc">The Subtractive Triad — audit, learn, see — packaged for your editor.</p>
		</div>
		<div class="category-grid">
			{#each devTools as product, index}
				<a
					href={product.href}
					class="product-card category-card reveal"
					style="--delay: {index * 100}ms"
					target={isExternal(product.href) ? '_blank' : undefined}
					rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
				>
					<div class="product-badge badge-oss">{product.badge}</div>
					<h3 class="product-name">{product.title}</h3>
					<p class="product-tagline">{product.tagline}</p>
					<p class="product-description">{product.description}</p>
					<div class="product-footer">
						{#if product.npmPackage}
							<code class="product-npm">{product.npmPackage}</code>
						{/if}
						<span class="product-cta">View on GitHub →</span>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Framework & Infrastructure -->
<section class="products-section">
	<div class="section-inner">
		<div class="section-header reveal">
			<h2 class="section-eyebrow">Framework & Infrastructure</h2>
			<p class="section-desc">Structural components for agent systems. The frame that holds everything.</p>
		</div>
		<div class="category-grid">
			{#each framework as product, index}
				<a
					href={product.href}
					class="product-card category-card reveal"
					style="--delay: {index * 100}ms"
					target={isExternal(product.href) ? '_blank' : undefined}
					rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
				>
					<div class="product-badge badge-neutral">{product.badge}</div>
					<h3 class="product-name">{product.title}</h3>
					<p class="product-tagline">{product.tagline}</p>
					<p class="product-description">{product.description}</p>
					<span class="product-cta">View on GitHub →</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Integration MCPs -->
<section class="products-section">
	<div class="section-inner">
		<div class="section-header reveal">
			<h2 class="section-eyebrow">Integration MCPs</h2>
			<p class="section-desc">Bridges between your platforms and the agents that serve you.</p>
		</div>
		<div class="category-grid">
			{#each integrations as product, index}
				<a
					href={product.href}
					class="product-card category-card reveal"
					style="--delay: {index * 100}ms"
					target={isExternal(product.href) ? '_blank' : undefined}
					rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
				>
					<div class="product-badge badge-neutral">{product.badge}</div>
					<h3 class="product-name">{product.title}</h3>
					<p class="product-tagline">{product.tagline}</p>
					<p class="product-description">{product.description}</p>
					<span class="product-cta">View on GitHub →</span>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Client Portfolio -->
<section class="products-section">
	<div class="section-inner">
		<div class="section-header reveal">
			<h2 class="section-eyebrow">Client Portfolio</h2>
			<p class="section-desc">MCPs we've built for specific clients and workflows.</p>
		</div>
		<div class="client-grid">
			{#each clientWork as product, index}
				<div class="client-card reveal" style="--delay: {index * 100}ms">
					<div class="client-card-header">
						<div class="product-badge badge-accent">{product.badge}</div>
						{#if product.client}
							<span class="client-name">for {product.client}</span>
						{/if}
					</div>
					<h3 class="product-name">{product.title}</h3>
					<p class="product-tagline">{product.tagline}</p>
					<p class="product-description">{product.description}</p>
					{#if product.integrations && product.integrations.length > 0}
						<div class="integration-tags">
							{#each product.integrations as integration}
								<span class="integration-tag">{integration}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<p class="cta-heading reveal">Need something custom?</p>
		<p class="cta-subtext reveal">I build integrations for your specific tools and workflows.</p>
		<a href="/book" class="cta-link reveal">Book a call →</a>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}

	.section-inner {
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}

	/* Hero with grid background */
	.hero {
		position: relative;
		padding: 5rem var(--container-padding, 1.5rem) 3rem;
		overflow: hidden;
	}

	.hero-grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 60px 60px;
		mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		text-align: center;
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}

	.hero-eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
		line-height: 1.1;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: var(--content-width-xl);
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	/* Section Headers — compact: eyebrow + one-line description */
	.section-header {
		display: flex;
		flex-direction: column;
		margin-bottom: var(--space-5, 1.5rem);
	}

	.section-eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		font-weight: var(--font-semibold);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.section-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		text-wrap: balance;
	}

	/* Products Section */
	.products-section {
		padding: 3rem var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}

	/* Featured Grid — 2 col, larger cards */
	.featured-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}

	/* Category Grid — 3 col for smaller cards */
	.category-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}

	/* Client Grid — 2 col */
	.client-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}

	/* Product Card — shared base */
	.product-card {
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		display: flex;
		flex-direction: column;
		transition:
			border-color var(--duration-micro, 200ms) var(--ease-standard),
			transform var(--duration-micro, 200ms) var(--ease-standard);
		text-decoration: none;
	}

	.product-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	/* Featured cards — slightly larger type */
	.featured-card .product-name {
		font-size: var(--text-h3, 1.25rem);
	}

	/* Category cards — compact */
	.category-card .product-name {
		font-size: var(--text-body);
	}

	/* Client Card — distinct treatment */
	.client-card {
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%);
	}

	.client-card-header {
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
		margin-bottom: var(--space-4, 1rem);
	}

	.client-name {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	/* Badges */
	.product-badge {
		font-size: var(--text-caption);
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-full, 9999px);
		width: fit-content;
		margin-bottom: var(--space-3, 0.75rem);
	}

	.client-card-header .product-badge {
		margin-bottom: 0;
	}

	.badge-oss {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.badge-neutral {
		color: var(--color-fg-secondary);
		background: rgba(255, 255, 255, 0.06);
	}

	.badge-accent {
		color: var(--color-accent, #a78bfa);
		background: rgba(167, 139, 250, 0.1);
	}

	/* Product content */
	.product-name {
		font-size: var(--text-h3, 1.25rem);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-1, 0.25rem);
	}

	.product-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.product-description {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		flex: 1;
		margin-bottom: var(--space-3, 0.75rem);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.product-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3, 0.75rem);
		margin-top: auto;
		min-width: 0;
	}

	.product-npm {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: rgba(255, 255, 255, 0.04);
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		font-family: var(--font-mono, monospace);
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.product-cta {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
		margin-left: auto;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.product-card:hover .product-cta {
		color: var(--color-fg-primary);
	}

	/* Integration tags */
	.integration-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2, 0.5rem);
		margin-top: auto;
	}

	.integration-tag {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: rgba(255, 255, 255, 0.04);
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid var(--color-border-default);
	}

	/* CTA */
	.cta-section {
		padding: 3rem 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.cta-heading {
		font-size: var(--text-h3, 1.25rem);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.cta-subtext {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-4, 1rem);
	}

	.cta-link {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}

	.cta-link:hover {
		color: var(--color-fg-primary);
	}

	/* Scroll reveal animation */
	:global(.reveal) {
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity var(--duration-standard, 400ms) var(--ease-standard) var(--delay, 0ms),
			transform var(--duration-standard, 400ms) var(--ease-standard) var(--delay, 0ms);
	}

	:global(.reveal.visible) {
		opacity: 1;
		transform: translateY(0);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.category-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.hero {
			padding: 3rem var(--container-padding, 1.5rem) 2rem;
		}

		.hero-title {
			font-size: var(--text-h2);
		}

		.featured-grid,
		.category-grid,
		.client-grid {
			grid-template-columns: 1fr;
		}

		.products-section {
			padding: 2rem var(--container-padding, 1.5rem);
		}

		.cta-section {
			padding: 2rem 0;
		}

		.product-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.product-npm {
			width: 100%;
		}

		.product-cta {
			margin-left: 0;
		}
	}
</style>
