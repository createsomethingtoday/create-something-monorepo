<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { config } from '$lib/config/runtime';
	import type { Project } from '$lib/config/site';

	interface Props {
		data: {
			project: Project;
		};
	}

	let { data }: Props = $props();
	const { project } = data;

	// Navigation
	const currentIndex = $config.projects.findIndex((p) => p.slug === project.slug);
	const prevProject = $config.projects[currentIndex - 1];
	const nextProject = $config.projects[currentIndex + 1];
</script>

<SEO
	title={project.title}
	description={project.description}
	ogImage={project.heroImage}
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Projects', url: '/projects' },
		{ name: project.title, url: `/projects/${project.slug}` }
	]}
/>

<article class="project-detail">
	<!-- Hero Image -->
	<header class="project-hero">
		<img src={project.heroImage} alt={project.title} class="hero-img" />
	</header>

	<!-- Project Info -->
	<div class="project-content">
		<div class="project-header">
			<h1 class="project-title">{project.title}</h1>
			<p class="project-meta">
				{project.location} · {project.year}
			</p>
		</div>

		<div class="project-body">
			<p class="project-description">{project.longDescription}</p>

			{#if project.specs}
				<div class="specs-grid">
					{#if project.specs.area}
						<div class="spec-item">
							<span class="spec-label">Area</span>
							<span class="spec-value">{project.specs.area}</span>
						</div>
					{/if}
					{#if project.specs.bedrooms}
						<div class="spec-item">
							<span class="spec-label">Bedrooms</span>
							<span class="spec-value">{project.specs.bedrooms}</span>
						</div>
					{/if}
					{#if project.specs.completion}
						<div class="spec-item">
							<span class="spec-label">Completion</span>
							<span class="spec-value">{project.specs.completion}</span>
						</div>
					{/if}
					{#if project.specs.contractor}
						<div class="spec-item">
							<span class="spec-label">Contractor</span>
							<span class="spec-value">{project.specs.contractor}</span>
						</div>
					{/if}
					{#if project.specs.photographer}
						<div class="spec-item">
							<span class="spec-label">Photography</span>
							<span class="spec-value">{project.specs.photographer}</span>
						</div>
					{/if}
				</div>
			{/if}

			{#if project.awards && project.awards.length > 0}
				<div class="awards">
					<span class="awards-label">Recognition</span>
					<div class="awards-list">
						{#each project.awards as award}
							<span class="award">{award}</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Project Gallery -->
	{#if project.images && project.images.length > 0}
		<div class="project-gallery">
			{#each project.images as image, i}
				<div class="gallery-item" class:full={i % 3 === 0}>
					<img src={image} alt="{project.title} - Image {i + 1}" loading="lazy" />
				</div>
			{/each}
		</div>
	{/if}

	<!-- Navigation -->
	<nav class="project-nav">
		{#if prevProject}
			<a href="/projects/{prevProject.slug}" class="nav-link prev">
				<span class="nav-label">Previous</span>
				<span class="nav-title">{prevProject.title}</span>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if nextProject}
			<a href="/projects/{nextProject.slug}" class="nav-link next">
				<span class="nav-label">Next</span>
				<span class="nav-title">{nextProject.title}</span>
			</a>
		{/if}
	</nav>
</article>

<style>
	.project-detail {
		padding-top: 80px;
	}

	.project-hero {
		width: 100%;
		height: 70vh;
		overflow: hidden;
	}

	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.project-content {
		max-width: var(--content-narrow);
		margin: 0 auto;
		padding: var(--space-2xl) var(--gutter);
	}

	.project-header {
		margin-bottom: var(--space-xl);
	}

	.project-title {
		font-size: var(--text-display);
		font-weight: 300;
		margin-bottom: var(--space-sm);
	}

	.project-meta {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
	}

	.project-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.project-description {
		font-size: var(--text-body-lg);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
	}

	.specs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.spec-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.spec-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.spec-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.awards {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.awards-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.awards-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.award {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	.project-gallery {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
		padding: 0 var(--gutter);
		max-width: var(--content-width);
		margin: 0 auto var(--space-2xl);
	}

	.gallery-item {
		aspect-ratio: 4/3;
		overflow: hidden;
	}

	.gallery-item.full {
		grid-column: span 2;
		aspect-ratio: 21/9;
	}

	.gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.project-nav {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xl) var(--gutter);
		border-top: 1px solid var(--color-border-default);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.nav-link {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.nav-link.next {
		text-align: right;
	}

	.nav-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.nav-title {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.nav-link:hover .nav-title {
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.project-gallery {
			grid-template-columns: 1fr;
		}

		.gallery-item.full {
			grid-column: span 1;
			aspect-ratio: 4/3;
		}
	}
</style>
