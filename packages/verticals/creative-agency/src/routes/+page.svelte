<script lang="ts">
	/**
	 * Creative Agency Home
	 *
	 * Philosophy: Results speak louder than claims.
	 * Bold typography establishes presence; metrics prove capability.
	 * Each section earns its moment through scroll-triggered revelation.
	 *
	 * Zuhandenheit: The portfolio recedes; the impact remains.
	 */

	import { config } from '$lib/config/runtime';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { onMount } from 'svelte';

	let heroVisible = $state(false);
	let statsRevealed = $state(false);
	let workRevealed = $state(false);
	let servicesRevealed = $state(false);
	let clientsRevealed = $state(false);

	onMount(() => {
		// Hero entrance
		requestAnimationFrame(() => {
			heroVisible = true;
		});

		// Section observers
		const createObserver = (id: string, callback: () => void, threshold = 0.2) => {
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						callback();
						observer.disconnect();
					}
				},
				{ threshold }
			);
			const el = document.getElementById(id);
			if (el) observer.observe(el);
			return observer;
		};

		const observers = [
			createObserver('stats', () => (statsRevealed = true)),
			createObserver('work', () => (workRevealed = true)),
			createObserver('services', () => (servicesRevealed = true)),
			createObserver('clients', () => (clientsRevealed = true))
		];

		return () => observers.forEach((o) => o.disconnect());
	});
</script>

<SEOHead />

<!-- Hero -->
<section class="hero" class:visible={heroVisible}>
	<div class="hero-content">
		<h1 class="hero-headline">{$config.hero.headline}</h1>
		<p class="hero-subheadline">{$config.hero.subheadline}</p>
		<div class="hero-actions">
			<a href="/contact" class="btn-primary">{$config.hero.cta}</a>
			<a href="/work" class="btn-secondary">View Work →</a>
		</div>
	</div>
</section>

<!-- Stats -->
<section class="stats section" id="stats" class:revealed={statsRevealed}>
	<div class="stats-grid">
		{#each $config.stats as stat, i}
			<div class="metric" style="--delay: {i * 100}ms">
				<span class="metric-number">{stat.number}</span>
				<span class="metric-label">{stat.label}</span>
			</div>
		{/each}
	</div>
</section>

<!-- Featured Work -->
<section class="work section" id="work" class:revealed={workRevealed}>
	<div class="section-header">
		<h2 class="section-title">Selected Work</h2>
		<a href="/work" class="view-all">View All →</a>
	</div>

	<div class="work-grid">
		{#each $config.work as project, i}
			<a href="/work/{project.slug}" class="case-card" style="--delay: {i * 80}ms">
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
<section class="services section" id="services" class:revealed={servicesRevealed}>
	<div class="section-header">
		<span class="section-eyebrow">Capabilities</span>
		<h2 class="section-title">What We Do</h2>
	</div>

	<div class="services-grid">
		{#each $config.services as service, i}
			<div class="service-card" style="--delay: {i * 80}ms">
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
<section class="clients section" id="clients" class:revealed={clientsRevealed}>
	<p class="clients-label">Trusted by</p>
	<div class="clients-grid">
		{#each $config.clients as client, i}
			<span class="client-name" style="--delay: {i * 50}ms">{client}</span>
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
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.hero-content {
		max-width: var(--content-width);
		margin: 0 auto;
		width: 100%;
	}

	.hero-headline {
		font-size: var(--text-display-xl);
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 0.95;
		margin: 0 0 var(--space-lg);
		max-width: 14ch;
		color: var(--color-fg-primary);
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s var(--ease-decelerate);
	}

	.hero.visible .hero-headline {
		opacity: 1;
		transform: translateY(0);
	}

	.hero-subheadline {
		font-size: var(--text-h3);
		font-weight: 400;
		color: var(--color-fg-secondary);
		line-height: 1.5;
		max-width: 50ch;
		margin: 0 0 var(--space-xl);
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.8s var(--ease-decelerate) 0.15s;
	}

	.hero.visible .hero-subheadline {
		opacity: 1;
		transform: translateY(0);
	}

	.hero-actions {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		opacity: 0;
		transform: translateY(15px);
		transition: all 0.6s var(--ease-decelerate) 0.3s;
	}

	.hero.visible .hero-actions {
		opacity: 1;
		transform: translateY(0);
	}

	.btn-primary {
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: 600;
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.btn-primary:hover {
		background: var(--color-fg-secondary);
	}

	.btn-secondary {
		padding: var(--space-sm) var(--space-lg);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.btn-secondary:hover {
		color: var(--color-fg-primary);
	}

	/* Section base */
	.section {
		padding: var(--space-2xl) var(--space-lg);
	}

	/* Stats */
	.stats {
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
		padding: var(--space-2xl) var(--space-lg);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.metric {
		text-align: center;
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.stats.revealed .metric {
		opacity: 1;
		transform: translateY(0);
	}

	.metric-number {
		display: block;
		font-size: var(--text-display);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1;
		margin-bottom: var(--space-sm);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
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
		flex-wrap: wrap;
		gap: var(--space-sm);
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.work.revealed .section-header,
	.services.revealed .section-header {
		opacity: 1;
		transform: translateY(0);
	}

	.section-eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		width: 100%;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.view-all {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
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
		text-decoration: none;
		opacity: 0;
		transform: translateY(30px);
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.work.revealed .case-card {
		opacity: 1;
		transform: translateY(0);
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
		transform: scale(1.03);
	}

	.case-info {
		padding: var(--space-md);
		flex: 1;
	}

	.case-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.case-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: var(--space-xs) 0;
	}

	.case-client {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
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
		color: var(--color-fg-primary);
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
		opacity: 0;
		transform: translateY(20px);
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.services.revealed .service-card {
		opacity: 1;
		transform: translateY(0);
	}

	.service-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.service-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-variant-numeric: tabular-nums;
	}

	.service-name {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: var(--space-sm) 0;
	}

	.service-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin: 0 0 var(--space-md);
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
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
	}

	/* Clients */
	.clients {
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.clients-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		margin: 0 0 var(--space-lg);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.clients.revealed .clients-label {
		opacity: 1;
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
		opacity: 0;
		transition: all var(--duration-standard) var(--ease-standard);
		transition-delay: var(--delay);
	}

	.clients.revealed .client-name {
		opacity: 1;
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

		.section {
			padding: var(--space-xl) var(--space-md);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-headline,
		.hero-subheadline,
		.hero-actions,
		.metric,
		.section-header,
		.case-card,
		.service-card,
		.clients-label,
		.client-name {
			opacity: 1;
			transform: none;
			transition: none;
		}

		.case-card:hover,
		.case-image img {
			transform: none;
			transition: none;
		}
	}
</style>
