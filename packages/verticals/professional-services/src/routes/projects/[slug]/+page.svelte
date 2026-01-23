<script lang="ts">
	/**
	 * Project Detail Page - DWELL-Inspired Image Gallery
	 *
	 * Images flow vertically, commanding the full viewport width.
	 * Text is minimal: title, location, year, description.
	 * Navigation to adjacent projects invites continued exploration.
	 *
	 * "Let the work speak. Text supports, never competes."
	 */

	import { SEO } from '@create-something/components';
	import type { PageData } from './$types';
	import { siteConfig } from '$lib/config/context';

	let { data }: { data: PageData } = $props();

	const { project, nextProject, prevProject } = data;
</script>

<SEO
	title={project.title}
	description={project.description}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Projects', url: '/projects' },
		{ name: project.title, url: `/projects/${project.slug}` }
	]}
/>

<article class="project-detail">
	<!-- Hero image - full bleed -->
	<header class="project-hero">
		<div class="project-hero-image-container">
			<img
				src={project.heroImage}
				alt={project.title}
				class="project-hero-image"
				loading="eager"
			/>
			<div class="project-hero-overlay"></div>
		</div>
		<div class="project-hero-content">
			<h1 class="project-title">{project.title}</h1>
			<div class="project-meta">
				<span class="project-location">{project.location}</span>
				<span class="project-divider"></span>
				<span class="project-year">{project.year}</span>
			</div>
		</div>
	</header>

	<!-- Project description - brief, evocative -->
	<section class="project-intro">
		<p class="project-description">{project.description}</p>
		<span class="project-category">{project.category}</span>
	</section>

	<!-- Image gallery - vertical flow -->
	{#if project.images.length > 0}
		<section class="project-gallery">
			{#each project.images as image, index}
				<figure class="gallery-item" style="--index: {index}">
					<img
						src={image}
						alt="{project.title} - Image {index + 1}"
						class="gallery-image"
						loading="lazy"
					/>
				</figure>
			{/each}
		</section>
	{/if}

	<!-- Project navigation -->
	<nav class="project-nav">
		{#if prevProject}
			<a href="/projects/{prevProject.slug}" class="project-nav-link project-nav-prev">
				<span class="nav-label">Previous</span>
				<span class="nav-title">{prevProject.title}</span>
			</a>
		{:else}
			<div class="project-nav-placeholder"></div>
		{/if}

		<a href="/" class="project-nav-link project-nav-all">
			<span class="nav-label">All Projects</span>
		</a>

		{#if nextProject}
			<a href="/projects/{nextProject.slug}" class="project-nav-link project-nav-next">
				<span class="nav-label">Next</span>
				<span class="nav-title">{nextProject.title}</span>
			</a>
		{:else}
			<div class="project-nav-placeholder"></div>
		{/if}
	</nav>
</article>

<style>
	.project-detail {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	/* Hero section */
	.project-hero {
		position: relative;
		width: 100%;
		height: 70vh;
		overflow: hidden;
	}

	.project-hero-image-container {
		position: absolute;
		inset: 0;
	}

	.project-hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		animation: image-reveal 1s var(--ease-decelerate) 0.2s forwards;
	}

	@keyframes image-reveal {
		from {
			opacity: 0;
			transform: scale(1.02);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.project-hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.6) 0%,
			rgba(0, 0, 0, 0.2) 30%,
			transparent 60%
		);
		pointer-events: none;
	}

	.project-hero-content {
		position: absolute;
		bottom: var(--space-xl);
		left: var(--space-lg);
		right: var(--space-lg);
		z-index: 1;
	}

	.project-title {
		font-size: var(--text-h1);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
		margin-bottom: var(--space-sm);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.5s forwards;
	}

	.project-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		opacity: 0;
		animation: content-fade 0.8s var(--ease-decelerate) 0.7s forwards;
	}

	@keyframes content-fade {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.project-location,
	.project-year {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	.project-divider {
		width: var(--space-md);
		height: 1px;
		background: var(--color-fg-muted);
	}

	/* Intro section */
	.project-intro {
		max-width: var(--width-prose);
		margin: 0 auto;
		padding: var(--space-2xl) var(--space-lg);
		text-align: center;
	}

	.project-description {
		font-size: var(--text-h3);
		font-weight: var(--font-light);
		color: var(--color-fg-primary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.project-category {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wider);
		text-transform: uppercase;
	}

	/* Gallery */
	.project-gallery {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: 0 var(--space-xs);
	}

	.gallery-item {
		margin: 0;
		opacity: 0;
		animation: gallery-fade 0.8s var(--ease-decelerate) forwards;
		animation-delay: calc(var(--index) * 0.1s);
	}

	@keyframes gallery-fade {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.gallery-image {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Navigation */
	.project-nav {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: var(--space-md);
		padding: var(--space-2xl) var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		margin-top: var(--space-2xl);
	}

	.project-nav-link {
		text-decoration: none;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.project-nav-link:hover {
		opacity: 0.7;
	}

	.project-nav-prev {
		text-align: left;
	}

	.project-nav-next {
		text-align: right;
	}

	.project-nav-all {
		text-align: center;
		align-self: center;
	}

	.project-nav-placeholder {
		/* Empty space when no prev/next */
	}

	.nav-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		margin-bottom: var(--space-xs);
	}

	.nav-title {
		display: block;
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.project-hero {
			height: 50vh;
		}

		.project-hero-content {
			left: var(--space-md);
			right: var(--space-md);
			bottom: var(--space-lg);
		}

		.project-title {
			font-size: var(--text-h2);
		}

		.project-nav {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: auto auto;
		}

		.project-nav-all {
			grid-column: 1 / -1;
			order: -1;
			margin-bottom: var(--space-md);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.project-hero-image,
		.project-title,
		.project-meta,
		.gallery-item {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
