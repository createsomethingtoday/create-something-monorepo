<script lang="ts">
	/**
	 * ProjectGalleryEnhanced - Interactive Grid with Scroll Reveals
	 *
	 * Combines:
	 * - CalArts interactive grid (hover dimming)
	 * - Staggered scroll reveal (Typography Principles)
	 *
	 * Canon: Interaction and timing create hierarchy
	 */

	import { ScrollRevealStagger } from '@create-something/canon/motion';
	import { siteConfig, type SiteConfig } from '$lib/config/context';

	interface Props {
		projects?: SiteConfig['projects'];
		limit?: number;
	}

	let { projects, limit }: Props = $props();

	// Reactive defaults from store
	const effectiveProjects = $derived(projects ?? $siteConfig.projects);
	const displayProjects = $derived(limit ? effectiveProjects.slice(0, limit) : effectiveProjects);
</script>

<section class="project-gallery-enhanced">
	<ScrollRevealStagger threshold={0.1}>
		<div class="gallery-grid highlight-grid">
			{#each displayProjects as project, index}
				<a
					href="/projects/{project.slug}"
					class="project-card highlight-item"
					style="--index: {index}"
				>
					<div class="project-image-container">
						<div class="image-placeholder"></div>
						<img
							src={project.heroImage}
							alt={project.title}
							class="project-image"
							loading={index < 3 ? 'eager' : 'lazy'}
						/>
					</div>
					<div class="project-meta">
						<h3 class="project-title">{project.title}</h3>
						<p class="project-location">{project.location}</p>
					</div>
				</a>
			{/each}
		</div>
	</ScrollRevealStagger>
</section>

<style>
	.project-gallery-enhanced {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-pure);
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xs);
		padding: 0 var(--space-xs);
		max-width: 1400px;
		margin: 0 auto;
	}

	/* First project spans full width */
	.project-card:first-child {
		grid-column: 1 / -1;
	}

	.project-card {
		position: relative;
		display: block;
		overflow: hidden;
		text-decoration: none;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	/* CalArts pattern: hover one, dim others */
	.gallery-grid:hover .project-card:not(:hover) {
		opacity: 0.5;
	}

	.project-image-container {
		position: relative;
		width: 100%;
		overflow: hidden;
		background: var(--color-bg-elevated);
	}

	/* Aspect ratios */
	.project-card:first-child .project-image-container {
		aspect-ratio: 16 / 9;
	}

	.project-card:not(:first-child) .project-image-container {
		aspect-ratio: 4 / 3;
	}

	.image-placeholder {
		position: absolute;
		inset: 0;
		background: var(--color-bg-elevated);
		z-index: 0;
	}

	.project-image {
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.project-card:hover .project-image {
		transform: scale(var(--scale-micro));
	}

	/* Meta overlay */
	.project-meta {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-md);
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.6) 0%,
			rgba(0, 0, 0, 0.3) 50%,
			transparent 100%
		);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		opacity: 0;
		transform: translateY(10px);
		transition:
			opacity var(--duration-standard) var(--ease-standard),
			transform var(--duration-standard) var(--ease-standard);
	}

	.project-card:hover .project-meta {
		opacity: 1;
		transform: translateY(0);
	}

	.project-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.project-location {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.gallery-grid {
			grid-template-columns: 1fr;
		}

		.project-card:first-child .project-image-container,
		.project-card:not(:first-child) .project-image-container {
			aspect-ratio: 4 / 3;
		}

		/* Always show meta on mobile */
		.project-meta {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (min-width: 1200px) {
		.gallery-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		.project-card:first-child {
			grid-column: 1 / 3;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.project-card {
			opacity: 1 !important;
		}

		.project-image {
			transition: none;
		}

		.project-meta {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
