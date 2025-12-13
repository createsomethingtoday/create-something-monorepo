<script lang="ts">
	import type { PageData } from './$types';
	import SEO from '$lib/components/SEO.svelte';

	let { data }: { data: PageData } = $props();
	const { service } = data;
</script>

<SEO
	title="{service.title} | CREATE SOMETHING"
	description={service.description}
	keywords="agentic systems, AI automation, {service.title.toLowerCase()}"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<main class="service-page">
	<!-- Back Link -->
	<nav class="back-nav">
		<a href="/services" class="back-link">
			<span class="back-arrow">←</span>
			All services
		</a>
	</nav>

	<!-- Service Header -->
	<header class="service-header">
		<div class="service-icon">
			{#if service.icon === 'globe'}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
					/>
				</svg>
			{:else if service.icon === 'automation'}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
			{:else if service.icon === 'robot'}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
					/>
				</svg>
			{:else if service.icon === 'partnership'}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
			{:else if service.icon === 'academy'}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
			{:else if service.icon === 'advisor'}
				<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
			{/if}
		</div>
		<h1 class="service-title">{service.title}</h1>
		<p class="service-triad">
			<span class="triad-action">{service.triadAction}</span>
			<span class="triad-separator">·</span>
			<span class="triad-question">{service.triadQuestion}</span>
		</p>
		<p class="service-description">{service.description}</p>
	</header>

	<!-- When to Use This -->
	<section class="service-section">
		<h2 class="section-label">When to Use This</h2>
		<ul class="use-list">
			{#each service.whenToUse as item}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<!-- What This Removes -->
	<section class="service-section">
		<h2 class="section-label">What This Removes</h2>
		<ul class="removes-list">
			{#each service.whatThisRemoves as item}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<!-- How It Works -->
	<section class="service-section">
		<h2 class="section-label">How It Works</h2>
		<ul class="works-list">
			{#each service.howItWorks as item}
				<li>{item}</li>
			{/each}
		</ul>
	</section>

	<!-- Proof -->
	<section class="service-section proof-section">
		<h2 class="section-label">Proof: {service.proof.name}</h2>
		<p class="proof-headline">{service.proof.headline}</p>
		<div class="proof-stats">
			{#each service.proof.stats as stat}
				<span class="proof-stat">{stat}</span>
			{/each}
		</div>
		<a href={service.proof.caseStudy} class="case-study-link">
			See case study
			<span class="link-arrow">→</span>
		</a>
	</section>

	<!-- Pricing & CTA -->
	<section class="service-section cta-section">
		<div class="pricing-row">
			<span class="pricing">{service.pricing}</span>
			<span class="timeline">{service.timeline}</span>
		</div>
		<a href="/contact" class="cta-button">
			Start a conversation
			<span class="cta-arrow">→</span>
		</a>
	</section>
</main>

<style>
	/*
	 * Golden Ratio Spacing System (φ = 1.618)
	 * --space-xs: 0.5rem   (base)
	 * --space-sm: 1rem     (×2)
	 * --space-md: 1.618rem (×φ)
	 * --space-lg: 2.618rem (×φ)
	 * --space-xl: 4.236rem (×φ)
	 * --space-2xl: 6.854rem (×φ)
	 *
	 * Hierarchy: Page → Sections → Elements → Details
	 * Each level uses spacing one step smaller than its parent.
	 */

	.service-page {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg); /* Page-level: 2xl vertical */
	}

	/* Back Navigation - minimal, recedes */
	.back-nav {
		margin-bottom: var(--space-lg); /* lg before header */
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

	/* Service Header - hero section, largest spacing */
	.service-header {
		margin-bottom: var(--space-2xl); /* 2xl after header (major transition) */
		padding-bottom: var(--space-xl); /* xl internal padding */
		border-bottom: 1px solid var(--color-border-default);
	}

	.service-icon {
		width: 4.236rem; /* φ⁴ × base = golden ratio icon */
		height: 4.236rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg); /* lg before title */
	}

	.service-icon svg {
		width: 2.618rem; /* φ³ × base */
		height: 2.618rem;
		color: var(--color-fg-secondary);
	}

	.service-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md); /* md after title */
		line-height: var(--leading-tight);
	}

	.service-triad {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--text-body-lg);
		margin-bottom: var(--space-lg); /* lg before description */
	}

	.triad-action {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.triad-separator {
		color: var(--color-fg-muted);
	}

	.triad-question {
		color: var(--color-fg-muted);
		font-style: italic;
	}

	.service-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Content Sections - xl spacing between sections */
	.service-section {
		margin-bottom: var(--space-xl); /* xl between sections */
		padding-bottom: var(--space-lg); /* lg internal padding */
		border-bottom: 1px solid var(--color-border-default);
	}

	.section-label {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-md); /* md before content */
	}

	/* When to Use - primary emphasis */
	.use-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.use-list li {
		position: relative;
		padding-left: var(--space-md); /* md indent */
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm); /* sm between items */
	}

	.use-list li:last-child {
		margin-bottom: 0;
	}

	.use-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* What This Removes - secondary emphasis */
	.removes-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.removes-list li {
		position: relative;
		padding-left: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.removes-list li:last-child {
		margin-bottom: 0;
	}

	.removes-list li::before {
		content: '−';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* How It Works - secondary emphasis */
	.works-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.works-list li {
		position: relative;
		padding-left: var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.works-list li:last-child {
		margin-bottom: 0;
	}

	.works-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	/* Proof Section - evidence with hierarchy */
	.proof-headline {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md); /* md after headline */
		font-weight: var(--font-medium);
	}

	.proof-stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm); /* sm between stats */
		margin-bottom: var(--space-md); /* md before link */
	}

	.proof-stat {
		padding: var(--space-xs) var(--space-sm); /* xs/sm internal */
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
	}

	.case-study-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.case-study-link:hover {
		color: var(--color-fg-primary);
	}

	.link-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.case-study-link:hover .link-arrow {
		transform: translateX(4px);
	}

	/* CTA Section - final emphasis, generous spacing */
	.cta-section {
		border-bottom: none;
		text-align: center;
		padding-top: var(--space-lg); /* extra breathing room */
	}

	.pricing-row {
		display: flex;
		justify-content: center;
		gap: var(--space-xl); /* xl between price/timeline */
		margin-bottom: var(--space-lg); /* lg before button */
	}

	.pricing {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.timeline {
		font-size: var(--text-h2);
		color: var(--color-fg-muted);
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg); /* sm/lg internal */
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover {
		opacity: 0.9;
	}

	.cta-arrow {
		transition: transform var(--duration-micro) var(--ease-standard);
	}

	.cta-button:hover .cta-arrow {
		transform: translateX(4px);
	}

	/* Responsive - maintain ratios at smaller scale */
	@media (max-width: 768px) {
		.service-page {
			padding: var(--space-xl) var(--space-md); /* xl/md on mobile */
		}

		.service-header {
			margin-bottom: var(--space-xl);
			padding-bottom: var(--space-lg);
		}

		.service-icon {
			width: 3.236rem; /* smaller on mobile */
			height: 3.236rem;
			margin-bottom: var(--space-md);
		}

		.service-icon svg {
			width: 2rem;
			height: 2rem;
		}

		.service-title {
			font-size: var(--text-h1);
		}

		.service-section {
			margin-bottom: var(--space-lg);
			padding-bottom: var(--space-md);
		}

		.pricing-row {
			flex-direction: column;
			gap: var(--space-xs);
		}

		.pricing,
		.timeline {
			font-size: var(--text-h3);
		}
	}
</style>
