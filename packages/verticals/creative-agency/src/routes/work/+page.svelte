<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { config } from '$lib/config/runtime';
</script>

<SEO
	title="Work"
	description="Case studies and selected work"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Work', url: '/work' }
	]}
/>

<div class="work-page">
	<header class="page-header">
		<h1 class="page-title">Work</h1>
		<p class="page-subtitle">Case studies from brands we've helped grow</p>
	</header>

	<div class="work-grid">
		{#each $config.work as project, i}
			<a href="/work/{project.slug}" class="case-card" class:featured={i === 0}>
				<div class="case-image">
					<img src={project.heroImage} alt={project.title} loading="lazy" />
				</div>
				<div class="case-content">
					<div class="case-meta">
						<span class="case-category">{project.category}</span>
						<span class="case-year">{project.year}</span>
					</div>
					<h2 class="case-title">{project.title}</h2>
					<p class="case-client">{project.client}</p>
					<p class="case-description">{project.description}</p>
					{#if project.results && project.results.length > 0}
						<div class="case-results">
							{#each project.results.slice(0, 2) as result}
								<div class="result">
									<span class="result-metric">{result.metric}</span>
									<span class="result-label">{result.label}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</a>
		{/each}
	</div>
</div>

<style>
	.work-page {
		padding: calc(var(--space-3xl) + 80px) var(--gutter) var(--space-2xl);
	}

	.page-header {
		max-width: var(--content-width);
		margin: 0 auto var(--space-2xl);
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}

	.page-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.work-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.case-card {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.case-card.featured {
		grid-column: span 2;
	}

	.case-card:hover {
		transform: translateY(-4px);
	}

	.case-image {
		aspect-ratio: 4/3;
		overflow: hidden;
		border-radius: var(--radius-md);
	}

	.case-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.case-content {
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.case-meta {
		display: flex;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	.case-category,
	.case-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.case-title {
		font-size: var(--text-h2);
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.case-client {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.case-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-md);
	}

	.case-results {
		display: flex;
		gap: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.result {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.result-metric {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-accent);
	}

	.result-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	@media (max-width: 1024px) {
		.work-grid {
			grid-template-columns: 1fr;
		}

		.case-card.featured {
			grid-column: span 1;
		}

		.case-card {
			grid-template-columns: 1fr;
		}
	}
</style>
