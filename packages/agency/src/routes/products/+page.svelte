<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	
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
	
	const products = [
		{
			id: 'loom',
			name: 'Loom',
			tagline: 'Memory and coordination for AI agents',
			description: 'Shared memory, smart task routing, crash recovery. Multi-agent coordination for Claude, Cursor, Codex.',
			badge: 'Free & Open Source'
		},
		{
			id: 'ground',
			name: 'Ground',
			tagline: 'Code analysis that checks before it claims',
			description: 'Stop hallucinated duplicates. Ground requires verification before claims—no more false positives.',
			badge: 'Free & Open Source'
		}
	];
</script>

<SEO
	title="Open Source MCPs | Ground & Loom"
	description="Free, open source MCP servers. Loom for multi-agent coordination. Ground for verified code analysis. Install in 2 minutes."
	keywords="MCP, Model Context Protocol, open source, Loom, Ground, multi-agent, code analysis, Claude, Cursor"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<p class="hero-eyebrow reveal">Open Source</p>
		<h1 class="hero-title reveal">MCPs We've Built</h1>
		<p class="hero-subtitle reveal">
			Free tools. Install in 2 minutes. Used by the same agents we build custom MCPs for.
		</p>
	</div>
</section>

<!-- Products Grid -->
<section class="products-section">
	<div class="products-container">
		{#each products as product, index}
			<a href="/products/{product.id}" class="product-card reveal" style="--delay: {index * 100}ms">
				<div class="product-badge">{product.badge}</div>
				<h2 class="product-name">{product.name}</h2>
				<p class="product-tagline">{product.tagline}</p>
				<p class="product-description">{product.description}</p>
				<span class="product-cta">Install →</span>
			</a>
		{/each}
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<h2 class="cta-heading reveal">Need something custom?</h2>
		<p class="cta-subtext reveal">We build MCPs for your specific tools and workflows.</p>
		<a href="/services" class="cta-link reveal">View services →</a>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}
	
	/* Hero with grid background */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
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
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
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
	
	/* Products Section */
	.products-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		border-top: 1px solid var(--color-border-default);
	}
	
	.products-container {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.product-card {
		padding: var(--space-6, 2rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		display: flex;
		flex-direction: column;
		transition: 
			border-color var(--duration-micro, 200ms) var(--ease-standard),
			transform var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.product-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}
	
	.product-badge {
		font-size: var(--text-caption);
		color: var(--color-success);
		background: var(--color-success-muted);
		padding: 0.25rem 0.75rem;
		border-radius: var(--radius-full, 9999px);
		width: fit-content;
		margin-bottom: var(--space-4, 1rem);
	}
	
	.product-name {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.product-tagline {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.product-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		flex: 1;
		margin-bottom: var(--space-4, 1rem);
	}
	
	.product-cta {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.product-card:hover .product-cta {
		color: var(--color-fg-primary);
	}
	
	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}
	
	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-5, 1.5rem);
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
	
	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
		
		.hero-title {
			font-size: var(--text-h1);
		}
		
		.products-container {
			grid-template-columns: 1fr;
		}
		
		.products-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
	}
</style>
