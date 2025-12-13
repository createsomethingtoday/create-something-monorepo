<script lang="ts">
	import { config } from '$lib/config/runtime';
	import type { Project } from '$lib/config/site';
	import SEOHead from '$lib/components/SEOHead.svelte';

	interface Props {
		data: {
			project: Project;
		};
	}

	let { data }: Props = $props();
	const { project } = data;

	let showInfo = $state(false);

	// Next project (reactive to config changes)
	const currentIndex = $derived($config.work.findIndex((p) => p.slug === project.slug));
	const nextProject = $derived($config.work[(currentIndex + 1) % $config.work.length]);
</script>

<SEOHead
	title={project.title}
	description={project.description}
	canonical="/work/{project.slug}"
	ogImage={project.coverImage}
/>

<article class="project-page">
	<!-- Gallery -->
	<div class="gallery">
		{#each project.images as image, i}
			<div class="gallery-image">
				<img src={image} alt="{project.title} - {i + 1}" loading={i > 1 ? 'lazy' : 'eager'} />
			</div>
		{/each}
	</div>

	<!-- Info Toggle -->
	<button class="info-toggle" onclick={() => (showInfo = !showInfo)}>
		{showInfo ? 'Close' : 'Info'}
	</button>

	<!-- Info Panel -->
	{#if showInfo}
		<div class="info-panel" onclick={() => (showInfo = false)}>
			<div class="info-content" onclick={(e) => e.stopPropagation()}>
				<h1 class="project-title">{project.title}</h1>
				<p class="project-year">{project.year}</p>
				<p class="project-description">{project.description}</p>
			</div>
		</div>
	{/if}

	<!-- Next Project -->
	<a href="/work/{nextProject.slug}" class="next-project">
		<span class="next-label">Next</span>
		<span class="next-title">{nextProject.title}</span>
	</a>
</article>

<style>
	.project-page {
		padding: 0;
	}

	.gallery {
		display: flex;
		flex-direction: column;
	}

	.gallery-image {
		width: 100%;
	}

	.gallery-image img {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Info */
	.info-toggle {
		position: fixed;
		bottom: var(--space-md);
		right: var(--space-md);
		z-index: 100;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		cursor: pointer;
		background: none;
		border: none;
		font-family: inherit;
		padding: var(--space-xs);
	}

	.info-toggle:hover {
		color: var(--color-fg-primary);
	}

	.info-panel {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(250, 250, 250, 0.98);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.info-content {
		max-width: 500px;
		text-align: center;
	}

	.project-title {
		font-size: var(--text-display);
		font-weight: 400;
		margin-bottom: var(--space-xs);
	}

	.project-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	.project-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* Next Project */
	.next-project {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-2xl) var(--space-md);
		text-align: center;
		border-top: 1px solid var(--color-border-default);
	}

	.next-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.next-title {
		font-size: var(--text-h1);
		font-weight: 400;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.next-project:hover .next-title {
		color: var(--color-fg-secondary);
	}
</style>
