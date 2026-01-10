<script lang="ts">
	/**
	 * RudolfProjectGrid - Replicates Rudolf template project gallery
	 *
	 * Layout: Grid with hover effects
	 * Interaction: Image zoom on hover, overlay with project info
	 */

	import { siteConfig } from '$lib/config/context';

	interface Props {
		limit?: number;
	}

	let { limit }: Props = $props();

	const projects = $derived(
		limit ? $siteConfig.projects.slice(0, limit) : $siteConfig.projects
	);
</script>

<section id="projects" class="section-projects">
	<div class="container">
		<div class="section-header">
			<h2 class="section-heading">Selected Works</h2>
			<p class="section-subheading">
				Measurable outcomes. Partnership at every decision point.
			</p>
		</div>
		<div class="projects-grid">
			{#each projects as project}
				<a href={`/projects/${project.slug}`} class="project-card">
					<div class="project-image-wrapper">
						<img
							src={project.heroImage}
							alt={project.title}
							class="project-image"
						/>
						<div class="project-overlay"></div>
					</div>
					<div class="project-content">
						<div class="project-meta">
							<span class="project-category">{project.category}</span>
							<span class="project-year">{project.year}</span>
						</div>
						<h3 class="project-title">{project.title}</h3>
						<div class="project-outcomes">
							<p class="project-outcome">{project.outcome}</p>
							<p class="project-metric">{project.metric}</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.section-projects {
		padding: var(--section-padding) 0;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 var(--space-lg);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-4xl);
	}

	.section-heading {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		letter-spacing: -0.02em;
	}

	.section-subheading {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: var(--space-2xl);
	}

	.project-card {
		position: relative;
		display: block;
		text-decoration: none;
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.project-card:hover {
		transform: translateY(-8px);
	}

	.project-image-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 4/3;
		overflow: hidden;
		background: var(--color-bg-subtle);
	}

	.project-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-standard);
	}

	.project-card:hover .project-image {
		transform: scale(1.05);
	}

	.project-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 0.5) 100%
		);
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.project-card:hover .project-overlay {
		opacity: 1;
	}

	.project-content {
		padding: var(--space-xl);
	}

	.project-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.project-category {
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
	}

	.project-title {
		font-size: var(--text-h3);
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
	}

	.project-outcomes {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.project-outcome {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.project-metric {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	@media (max-width: 768px) {
		.projects-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
