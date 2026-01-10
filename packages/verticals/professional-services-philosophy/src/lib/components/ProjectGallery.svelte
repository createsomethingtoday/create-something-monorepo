<script lang="ts">
	/**
	 * ProjectGallery - DWELL-Inspired Project Grid
	 *
	 * Images command. Text defers.
	 *
	 * The grid uses asymmetric sizing to create visual hierarchy
	 * and rhythm. Each project is an invitation to dwell, not
	 * a card to be scanned.
	 *
	 * "Space between elements is content."
	 */

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

<section class="project-gallery">
	<div class="gallery-grid">
		{#each displayProjects as project, index}
			<a
				href="/projects/{project.slug}"
				class="project-item"
				class:project-item--large={index === 0}
				style="--delay: {index * 0.1}s"
			>
				<div class="project-image-container">
					<div class="project-image-placeholder"></div>
					<img
						src={project.heroImage}
						alt={project.title}
						class="project-image"
						loading={index < 2 ? 'eager' : 'lazy'}
					/>
				</div>
				<div class="project-meta">
					<span class="project-title">{project.title}</span>
					<span class="project-location">{project.location}</span>
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	.project-gallery {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-pure);
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xs);
		padding: 0 var(--space-xs);
	}

	/* First project spans full width for emphasis */
	.project-item--large {
		grid-column: 1 / -1;
	}

	.project-item {
		position: relative;
		display: block;
		overflow: hidden;
		text-decoration: none;
		opacity: 0;
		animation: project-fade 0.8s var(--ease-decelerate) forwards;
		animation-delay: var(--delay);
	}

	@keyframes project-fade {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.project-image-container {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	/* Aspect ratios: large hero vs grid items */
	.project-item--large .project-image-container {
		aspect-ratio: 16 / 9;
	}

	.project-item:not(.project-item--large) .project-image-container {
		aspect-ratio: 4 / 3;
	}

	.project-image-placeholder {
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
		transition: transform var(--duration-complex) var(--ease-standard);
	}

	.project-item:hover .project-image {
		transform: scale(1.02);
	}

	/* Meta: minimal, precise */
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

	.project-item:hover .project-meta {
		opacity: 1;
		transform: translateY(0);
	}

	.project-title {
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-normal);
	}

	.project-location {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
	}

	/* Responsive: single column on mobile */
	@media (max-width: 768px) {
		.gallery-grid {
			grid-template-columns: 1fr;
			gap: var(--space-xs);
		}

		.project-item--large .project-image-container,
		.project-item:not(.project-item--large) .project-image-container {
			aspect-ratio: 4 / 3;
		}

		/* Always show meta on mobile (no hover) */
		.project-meta {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Larger screens: 3 columns for variety */
	@media (min-width: 1200px) {
		.gallery-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		/* First still spans 2 columns */
		.project-item--large {
			grid-column: 1 / 3;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.project-item {
			animation: none;
			opacity: 1;
			transform: none;
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
