<script lang="ts">
	import { siteConfig } from '$lib/config/site';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEOHead />
<StructuredData page="home" />

<!-- Hero - Full bleed image with minimal text -->
<section class="hero">
	<img src={siteConfig.hero.image} alt={siteConfig.hero.alt} class="hero-img" />
	<div class="hero-overlay">
		<div class="hero-content">
			<p class="hero-caption">{siteConfig.hero.caption}</p>
		</div>
	</div>
</section>

<!-- Selected Projects -->
<section class="projects section">
	<div class="projects-header">
		<h2 class="section-title">Selected Projects</h2>
		<a href="/projects" class="view-all">View All</a>
	</div>

	<div class="projects-grid">
		{#each siteConfig.projects.slice(0, 3) as project, i}
			<a href="/projects/{project.slug}" class="project-card" class:large={i === 0}>
				<div class="project-image-wrapper">
					<img src={project.heroImage} alt={project.title} class="project-img" loading="lazy" />
				</div>
				<div class="project-info">
					<h3 class="project-title">{project.title}</h3>
					<p class="project-meta">
						{project.location} · {project.year}
					</p>
				</div>
			</a>
		{/each}
	</div>
</section>

<!-- Studio Philosophy -->
<section class="philosophy section">
	<div class="philosophy-content">
		<p class="philosophy-text">{siteConfig.studio.philosophy}</p>
	</div>
</section>

<!-- Approach -->
<section class="approach section">
	<div class="approach-grid">
		{#each siteConfig.studio.approach as principle, i}
			<div class="approach-item">
				<span class="approach-number">{String(i + 1).padStart(2, '0')}</span>
				<p class="approach-text">{principle}</p>
			</div>
		{/each}
	</div>
</section>

<!-- Recognition -->
{#if siteConfig.recognition.length > 0}
	<section class="recognition section">
		<h2 class="section-title">Recognition</h2>
		<div class="recognition-list">
			{#each siteConfig.recognition as item}
				<span class="recognition-item">
					{item.publication}, {item.year}
				</span>
			{/each}
		</div>
	</section>
{/if}

<style>
	/* Hero */
	.hero {
		position: relative;
		height: 100vh;
		height: 100dvh;
		width: 100%;
		overflow: hidden;
		background: var(--color-bg-pure);
	}

	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		animation: hero-reveal 1.2s var(--ease-decelerate) 0.2s forwards;
	}

	@keyframes hero-reveal {
		from {
			opacity: 0;
			transform: scale(1.02);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, transparent 20%),
			linear-gradient(to top, rgba(0, 0, 0, 0.4) 0%, transparent 30%);
		display: flex;
		align-items: flex-end;
		pointer-events: none;
	}

	.hero-content {
		padding: var(--space-xl) var(--gutter);
		width: 100%;
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.hero-caption {
		color: var(--color-fg-inverse);
		font-size: var(--text-body-sm);
		font-weight: 300;
		letter-spacing: var(--tracking-wide);
		opacity: 0;
		animation: caption-fade 0.8s var(--ease-decelerate) 1s forwards;
	}

	@keyframes caption-fade {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 0.9;
			transform: translateY(0);
		}
	}

	/* Projects */
	.projects-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xl);
		max-width: var(--content-width);
		margin-left: auto;
		margin-right: auto;
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 300;
	}

	.view-all {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		color: var(--color-fg-primary);
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: var(--space-sm);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.project-card {
		display: block;
		grid-column: span 4;
		overflow: hidden;
	}

	.project-card.large {
		grid-column: span 8;
	}

	.project-image-wrapper {
		aspect-ratio: 4/3;
		overflow: hidden;
		margin-bottom: var(--space-md);
	}

	.project-card.large .project-image-wrapper {
		aspect-ratio: 16/10;
	}

	.project-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-decelerate);
	}

	.project-card:hover .project-img {
		transform: scale(1.02);
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.project-title {
		font-size: var(--text-body-lg);
		font-weight: 400;
	}

	.project-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Philosophy */
	.philosophy {
		background: var(--color-bg-surface);
	}

	.philosophy-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
		text-align: center;
	}

	.philosophy-text {
		font-size: var(--text-h2);
		font-weight: 300;
		line-height: var(--leading-snug);
		color: var(--color-fg-secondary);
	}

	/* Approach */
	.approach-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-lg);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.approach-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.approach-number {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.approach-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Recognition */
	.recognition {
		border-top: 1px solid var(--color-border-default);
	}

	.recognition-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		margin-top: var(--space-md);
		max-width: var(--content-width);
		margin-left: auto;
		margin-right: auto;
	}

	.recognition-item {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.recognition-item:not(:last-child)::after {
		content: '·';
		margin-left: var(--space-md);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.projects-grid {
			grid-template-columns: 1fr;
		}

		.project-card,
		.project-card.large {
			grid-column: span 1;
		}

		.project-card.large .project-image-wrapper {
			aspect-ratio: 4/3;
		}

		.approach-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 640px) {
		.approach-grid {
			grid-template-columns: 1fr;
		}

		.philosophy-text {
			font-size: var(--text-h3);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-img {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.hero-caption {
			animation: none;
			opacity: 0.9;
			transform: none;
		}

		.project-img {
			transition: none;
		}
	}
</style>
