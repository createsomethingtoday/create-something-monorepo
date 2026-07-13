<script lang="ts">
	/**
	 * ProjectGridInteractive - CalArts Pattern
	 *
	 * Grid where hovering one item dims others.
	 * Creates focus through contrast, not decoration.
	 *
	 * Pattern: CalArts 2024 Awwwards winner
	 * Canon: Interaction reveals hierarchy
	 */

	interface Project {
		slug: string;
		title: string;
		heroImage: string;
		location: string;
		outcome?: string;
	}

	interface Props {
		projects: Project[];
		variant?: 'default' | 'subtle' | 'strong';
	}

	let { projects, variant = 'default' }: Props & { variant?: 'default' | 'subtle' | 'strong' } =
		$props();

	// Sibling opacity based on variant
	const siblingOpacity = {
		default: 0.5,
		subtle: 0.7,
		strong: 0.3
	};

	const opacity = $derived(siblingOpacity[variant] ?? 0.5);
</script>

<section class="project-grid-interactive">
		<div class="grid highlight-grid" style="--sibling-opacity: {opacity}">
		{#each projects as project, index}
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
					{#if project.outcome}
						<p class="project-outcome">{project.outcome}</p>
					{/if}
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	.project-grid-interactive {
		padding: var(--space-performance-2xl) 0;
		background: var(--color-performance-bg-pure);
	}

		.highlight-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
			gap: var(--space-performance-xs);
			padding: 0 var(--space-performance-md);
			max-width: 1400px;
			margin: 0 auto;
		}

	.project-card {
		position: relative;
		display: block;
		overflow: hidden;
		text-decoration: none;
		transition:
			opacity var(--duration-performance-standard) var(--ease-performance-standard),
			transform var(--duration-performance-standard) var(--ease-performance-standard);
	}

	/* CalArts pattern: grid highlights hovered item, dims siblings */
		.highlight-grid:hover .project-card:not(:hover) {
			opacity: var(--sibling-opacity);
		}

	.project-card {
		position: relative;
		transition: opacity var(--duration-performance-standard) var(--ease-performance-standard);
	}

		.project-image-container {
			position: relative;
			width: 100%;
			overflow: hidden;
			aspect-ratio: 4 / 3;
		}

		.project-image {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform var(--duration-performance-standard) var(--ease-performance-standard);
		}

		.project-card:hover .project-image {
			transform: scale(var(--scale-performance-micro));
		}

	/* Meta overlay */
	.project-meta {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: var(--space-performance-md);
		background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 100%);
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
		opacity: 0;
		transform: translateY(10px);
		transition:
			opacity var(--duration-performance-standard) var(--ease-performance-standard),
			transform var(--duration-performance-standard) var(--ease-performance-standard);
	}

		.project-card:hover .project-meta {
			opacity: 1;
			transform: translateY(0);
		}

	.project-title {
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-medium);
		color: var(--color-performance-fg-primary);
	}

	.project-location {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-secondary);
		letter-spacing: var(--tracking-performance-wide);
		text-transform: uppercase;
	}

	/* Responsive */
	@media (max-width: 768px) {
			.highlight-grid {
				grid-template-columns: 1fr;
			}

		/* Always show meta on mobile */
		.project-meta {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (min-width: 1200px) {
			.highlight-grid {
				grid-template-columns: repeat(3, 1fr);
			}
		}

		/* Reduced motion */
		@media (prefers-reduced-motion: reduce) {
			.project-card {
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
