<script lang="ts">
	import { config } from '$lib/config/runtime';
	import type { CaseStudy } from '$lib/config/site';
	import SEOHead from '$lib/components/SEOHead.svelte';

	interface Props {
		data: {
			project: CaseStudy;
		};
	}

	let { data }: Props = $props();
	const { project } = data;

	// Navigation
	const currentIndex = $config.work.findIndex((p) => p.slug === project.slug);
	const nextProject = $config.work[(currentIndex + 1) % $config.work.length];
</script>

<SEOHead
	title="{project.client} - {project.title}"
	description={project.description}
	canonical="/work/{project.slug}"
	ogImage={project.heroImage}
/>

<article class="case-study">
	<!-- Hero -->
	<header class="case-hero">
		<div class="hero-content">
			<span class="case-category">{project.category}</span>
			<h1 class="case-title">{project.title}</h1>
			<p class="case-client">{project.client}</p>
		</div>
	</header>

	<!-- Hero Image -->
	<div class="hero-image">
		<img src={project.heroImage} alt={project.title} />
	</div>

	<!-- Results -->
	{#if project.results && project.results.length > 0}
		<section class="results-section">
			<div class="results-grid">
				{#each project.results as result}
					<div class="metric">
						<span class="metric-number">{result.metric}</span>
						<span class="metric-label">{result.label}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Challenge & Solution -->
	<section class="content-section">
		<div class="content-grid">
			<div class="content-block">
				<h2 class="content-label">The Challenge</h2>
				<p class="content-text">{project.challenge}</p>
			</div>
			<div class="content-block">
				<h2 class="content-label">The Solution</h2>
				<p class="content-text">{project.solution}</p>
			</div>
		</div>
	</section>

	<!-- Services -->
	<section class="services-section">
		<h2 class="section-label">Services</h2>
		<div class="services-list">
			{#each project.services as service}
				<span class="service-tag">{service}</span>
			{/each}
		</div>
	</section>

	<!-- Gallery -->
	{#if project.images && project.images.length > 0}
		<section class="gallery-section">
			{#each project.images as image, i}
				<div class="gallery-image" class:full={i === 0}>
					<img src={image} alt="{project.title} - Image {i + 1}" loading="lazy" />
				</div>
			{/each}
		</section>
	{/if}

	<!-- Testimonial -->
	{#if project.testimonial}
		<section class="testimonial-section">
			<blockquote class="testimonial">
				<p class="testimonial-quote">"{project.testimonial.quote}"</p>
				<footer class="testimonial-author">
					<span class="author-name">{project.testimonial.author}</span>
					<span class="author-role">{project.testimonial.role}</span>
				</footer>
			</blockquote>
		</section>
	{/if}

	<!-- Navigation -->
	<nav class="case-nav">
		<a href="/work/{nextProject.slug}" class="next-case">
			<span class="next-label">Next Case Study</span>
			<span class="next-title">{nextProject.title}</span>
			<span class="next-client">{nextProject.client}</span>
		</a>
	</nav>
</article>

<style>
	.case-study {
		padding-top: 80px;
	}

	/* Hero */
	.case-hero {
		padding: var(--space-2xl) var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.hero-content {
		max-width: var(--content-narrow);
	}

	.case-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.case-title {
		font-size: var(--text-display);
		font-weight: 700;
		margin: var(--space-sm) 0;
	}

	.case-client {
		font-size: var(--text-h3);
		color: var(--color-fg-secondary);
	}

	.hero-image {
		width: 100%;
		aspect-ratio: 21/9;
		overflow: hidden;
	}

	.hero-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Results */
	.results-section {
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-elevated);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
		text-align: center;
	}

	/* Content */
	.content-section {
		padding: var(--space-2xl) var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-2xl);
	}

	.content-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin-bottom: var(--space-md);
	}

	.content-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Services */
	.services-section {
		padding: var(--space-xl) var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto;
		border-top: 1px solid var(--color-border-default);
	}

	.section-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin-bottom: var(--space-md);
	}

	.services-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.service-tag {
		font-size: var(--text-body-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-full);
	}

	/* Gallery */
	.gallery-section {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
		padding: var(--space-xl) var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.gallery-image {
		aspect-ratio: 4/3;
		overflow: hidden;
		border-radius: var(--radius-md);
	}

	.gallery-image.full {
		grid-column: span 2;
		aspect-ratio: 21/9;
	}

	.gallery-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Testimonial */
	.testimonial-section {
		padding: var(--space-2xl) var(--gutter);
		background: var(--color-bg-surface);
	}

	.testimonial {
		max-width: var(--content-narrow);
		margin: 0 auto;
		text-align: center;
	}

	.testimonial-quote {
		font-size: var(--text-h2);
		font-weight: 400;
		line-height: var(--leading-snug);
		margin-bottom: var(--space-lg);
	}

	.testimonial-author {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.author-name {
		font-size: var(--text-body);
		font-weight: 600;
	}

	.author-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Navigation */
	.case-nav {
		padding: var(--space-2xl) var(--gutter);
		border-top: 1px solid var(--color-border-default);
	}

	.next-case {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-sm);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.next-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.next-title {
		font-size: var(--text-h2);
		font-weight: 600;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.next-case:hover .next-title {
		color: var(--color-accent);
	}

	.next-client {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.results-grid,
		.content-grid,
		.gallery-section {
			grid-template-columns: 1fr;
		}

		.gallery-image.full {
			grid-column: span 1;
			aspect-ratio: 4/3;
		}
	}
</style>
