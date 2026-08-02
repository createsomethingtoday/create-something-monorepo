<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { discoverConcepts as concepts } from '$lib/config/discoverConcepts';
</script>

<SEO
	title="Discover"
	description="Explore shared concepts across CREATE SOMETHING properties."
	keywords="discover, concepts, hermeneutic circle, creation moat, three-tier framework"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Discover', url: 'https://createsomething.space/discover' }
	]}
/>

<section class="page">
	<div class="container">
		<header class="header">
			<p class="eyebrow">CONCEPT MAP</p>
			<h1 class="title">Discover</h1>
			<p class="subtitle">
				Pick a concept to trace how it appears across the CREATE SOMETHING ecosystem.
			</p>
		</header>

		<div class="grid">
			{#each concepts as concept}
				<a class="card" href={`/discover/${concept.slug}`}>
					<h2 class="card-title">{concept.name}</h2>
					<p class="card-description">{concept.description}</p>
				</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.page {
		padding: 6rem 1.5rem 4rem;
	}

	.container {
		max-width: 64rem;
		margin: 0 auto;
	}

	.header {
		margin-bottom: var(--space-performance-lg);
	}

	.eyebrow {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: var(--space-performance-xs);
	}

	.title {
		font-size: var(--text-performance-display);
		font-weight: var(--font-performance-bold);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.subtitle {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-tertiary);
		max-width: 44rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: var(--space-performance-md);
	}

	@media (min-width: 768px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.card {
		display: block;
		padding: var(--space-performance-lg);
		border: 1px solid var(--glass-performance-border-light);
		background: var(--glass-performance-bg-light);
		backdrop-filter: blur(var(--glass-performance-blur-md)) var(--glass-performance-saturate-md);
		border-radius: var(--radius-performance-scale-lg);
		text-decoration: none;
		transition: all var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.card:hover {
		border-color: var(--glass-performance-border-medium);
		background: var(--glass-performance-bg-medium);
		transform: translateY(-2px);
	}

	.card-title {
		font-size: var(--text-performance-h3);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-xs);
	}

	.card-description {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		line-height: var(--leading-performance-relaxed);
	}
</style>
