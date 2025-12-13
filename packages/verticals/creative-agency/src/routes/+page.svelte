<script lang="ts">
	import { siteConfig } from '$lib/config/site';
	import SEOHead from '$lib/components/SEOHead.svelte';
</script>

<SEOHead />

<!-- Hero -->
<section class="hero">
	<div class="hero-content">
		<h1 class="hero-headline">{siteConfig.hero.headline}</h1>
		<p class="hero-subheadline">{siteConfig.hero.subheadline}</p>
		<div class="hero-actions">
			<a href="/contact" class="btn-primary">{siteConfig.hero.cta}</a>
			<a href="/work" class="btn-secondary">See Our Work</a>
		</div>
	</div>
</section>

<!-- Stats -->
<section class="stats section">
	<div class="stats-grid">
		{#each siteConfig.stats as stat}
			<div class="metric">
				<span class="metric-number">{stat.number}</span>
				<span class="metric-label">{stat.label}</span>
			</div>
		{/each}
	</div>
</section>

<!-- Featured Work -->
<section class="work section">
	<div class="section-header">
		<h2 class="section-title">Selected Work</h2>
		<a href="/work" class="view-all">View All</a>
	</div>

	<div class="work-grid">
		{#each siteConfig.work as project}
			<a href="/work/{project.slug}" class="case-card">
				<div class="case-image">
					<img src={project.heroImage} alt={project.title} loading="lazy" />
				</div>
				<div class="case-info">
					<span class="case-category">{project.category}</span>
					<h3 class="case-title">{project.title}</h3>
					<p class="case-client">{project.client}</p>
				</div>
				{#if project.results && project.results.length > 0}
					<div class="case-result">
						<span class="result-metric">{project.results[0].metric}</span>
						<span class="result-label">{project.results[0].label}</span>
					</div>
				{/if}
			</a>
		{/each}
	</div>
</section>

<!-- Services -->
<section class="services section">
	<div class="section-header">
		<h2 class="section-title">What We Do</h2>
	</div>

	<div class="services-grid">
		{#each siteConfig.services as service, i}
			<div class="service-card">
				<span class="service-number">{String(i + 1).padStart(2, '0')}</span>
				<h3 class="service-name">{service.name}</h3>
				<p class="service-description">{service.description}</p>
				<ul class="service-includes">
					{#each service.includes as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>

<!-- Clients -->
<section class="clients section">
	<p class="clients-label">Trusted by</p>
	<div class="clients-grid">
		{#each siteConfig.clients as client}
			<span class="client-name">{client}</span>
		{/each}
	</div>
</section>

<style>
	/* Hero */
	.hero {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		padding: var(--space-3xl) var(--gutter);
	}

	.hero-content {
		max-width: var(--content-width);
		margin: 0 auto;
		width: 100%;
	}

	.hero-headline {
		font-size: var(--text-display-xl);
		font-weight: 700;
		letter-spacing: var(--tracking-tight);
		line-height: 0.95;
		margin-bottom: var(--space-lg);
		max-width: 12ch;
		opacity: 0;
		animation: headline-reveal 0.8s var(--ease-decelerate) 0.2s forwards;
	}

	@keyframes headline-reveal {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.hero-subheadline {
		font-size: var(--text-h3);
		font-weight: 400;
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 50ch;
		margin-bottom: var(--space-xl);
		opacity: 0;
		animation: subheadline-reveal 0.8s var(--ease-decelerate) 0.4s forwards;
	}

	@keyframes subheadline-reveal {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.hero-actions {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		opacity: 0;
		animation: actions-reveal 0.6s var(--ease-decelerate) 0.6s forwards;
	}

	@keyframes actions-reveal {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Stats */
	.stats {
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
		padding: var(--space-2xl) var(--gutter);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	/* Work */
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xl);
		max-width: var(--content-width);
		margin-left: auto;
		margin-right: auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
	}

	.view-all {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		color: var(--color-fg-primary);
	}

	.work-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.case-card {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.case-card:hover {
		transform: translateY(-4px);
	}

	.case-image {
		aspect-ratio: 16/10;
		overflow: hidden;
	}

	.case-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-decelerate);
	}

	.case-card:hover .case-image img {
		transform: scale(1.02);
	}

	.case-info {
		padding: var(--space-md);
		flex: 1;
	}

	.case-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.case-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		margin: var(--space-xs) 0;
	}

	.case-client {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.case-result {
		padding: var(--space-md);
		border-top: 1px solid var(--color-border-default);
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.result-metric {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-accent);
	}

	.result-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	/* Services */
	.services-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.service-card {
		padding: var(--space-lg);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.service-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.service-name {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: var(--space-sm) 0;
	}

	.service-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.service-includes {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.service-includes li {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	/* Clients */
	.clients {
		text-align: center;
	}

	.clients-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin-bottom: var(--space-lg);
	}

	.clients-grid {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.client-name {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.client-name:hover {
		color: var(--color-fg-secondary);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.work-grid,
		.services-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.stats-grid,
		.work-grid,
		.services-grid {
			grid-template-columns: 1fr;
		}

		.hero-headline {
			font-size: var(--text-display);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-headline,
		.hero-subheadline,
		.hero-actions {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.case-card,
		.case-image img {
			transition: none;
		}
	}
</style>
