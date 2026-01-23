<script lang="ts">
	import { SEO } from '@create-something/components';
	import { config } from '$lib/config/runtime';
	import StructuredData from '$lib/components/StructuredData.svelte';
</script>

<SEO
	title="Projects"
	description="Selected architecture projects"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Projects', url: '/projects' }
	]}
/>
<StructuredData page="projects" />

<section class="projects-page">
	<header class="page-header">
		<h1 class="page-title">Projects</h1>
		<p class="page-subtitle">Selected work, 2022–present</p>
	</header>

	<div class="projects-grid">
		{#each $config.projects as project, i}
			<a
				href="/projects/{project.slug}"
				class="project-card"
				class:featured={i === 0}
				style="--delay: {i * 50}ms"
			>
				<div class="project-image-wrapper">
					<img src={project.heroImage} alt={project.title} class="project-img" loading="lazy" />
				</div>
				<div class="project-info">
					<div class="project-header">
						<h2 class="project-title">{project.title}</h2>
						<span class="project-year">{project.year}</span>
					</div>
					<p class="project-location">{project.location}</p>
					<p class="project-description">{project.description}</p>
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	.projects-page {
		padding: calc(var(--space-3xl) + 80px) var(--gutter) var(--space-2xl);
	}

	.page-header {
		max-width: var(--content-width);
		margin: 0 auto var(--space-2xl);
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: 300;
		margin-bottom: var(--space-sm);
	}

	.page-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.project-card {
		display: block;
		animation: fadeIn 0.5s ease-out var(--delay) both;
	}

	.project-card.featured {
		grid-column: span 2;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.project-image-wrapper {
		aspect-ratio: 4/3;
		overflow: hidden;
		margin-bottom: var(--space-md);
	}

	.project-card.featured .project-image-wrapper {
		aspect-ratio: 21/9;
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

	.project-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.project-title {
		font-size: var(--text-h3);
		font-weight: 400;
	}

	.project-year {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.project-location {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.project-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		line-height: var(--leading-relaxed);
	}

	@media (max-width: 768px) {
		.projects-grid {
			grid-template-columns: 1fr;
		}

		.project-card.featured {
			grid-column: span 1;
		}

		.project-card.featured .project-image-wrapper {
			aspect-ratio: 4/3;
		}
	}
</style>
