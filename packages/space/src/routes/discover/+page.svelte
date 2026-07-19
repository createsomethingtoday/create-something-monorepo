<script lang="ts">
	import { SEO } from '@create-something/canon';

	const concepts = [
		{
			slug: 'creation-moat',
			name: 'Creation Moat',
			description:
				'Learn why teams can stand out by creating Model Context Protocol (MCP) servers, while using existing servers is becoming standard.'
		},
		{
			slug: 'three-tier-framework',
			name: 'Three-Tier Framework',
			description:
				'See how the framework separates stored information, automated actions, and decisions.'
		},
		{
			slug: 'hermeneutic-circle',
			name: 'Hermeneutic Circle',
			description: 'See how each round of research, building, and feedback improves the next.'
		},
		{
			slug: 'policy-as-artifact',
			name: 'Policy as Artifact',
			description: 'Learn how to give agents written rules alongside the work they need to complete.'
		},
		{
			slug: 'composio-bridge',
			name: 'Composio Bridge',
			description: 'See how Composio connects agents to common apps such as Gmail, Notion, and Slack.'
		},
		{
			slug: 'subtractive-triad',
			name: 'Subtractive Triad',
			description: 'Use three checks to remove noise without losing meaning or connection.'
		}
	];
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

<main class="index-page">
	<section data-page-chapter="orientation" class="index-opening">
		<div class="container opening-inner">
			<p class="eyebrow">Concept map · six starting points</p>
			<h1>Choose the concept closest to your current question.</h1>
			<p class="opening-copy">
				Each guide traces one idea across CREATE SOMETHING. Use the descriptions to choose; no
				prior framework knowledge is required.
			</p>
		</div>
	</section>

	<section
		data-page-chapter="collection"
		class="index-collection"
		aria-labelledby="concept-collection-title"
	>
		<div class="container collection-inner">
			<header class="collection-heading">
				<p class="eyebrow">All six guides</p>
				<h2 id="concept-collection-title">Concept guides</h2>
				<p>Open one guide to see the idea, its practical use, and related experiments.</p>
			</header>

			<div class="grid">
				{#each concepts as concept}
					<a class="card" href={`/discover/${concept.slug}`}>
						<h3 class="card-title">{concept.name}</h3>
						<p class="card-description">{concept.description}</p>
					</a>
				{/each}
			</div>
		</div>
	</section>
</main>

<style>
	.index-page,
	.container,
	.collection-inner,
	.grid,
	.card {
		min-width: 0;
		max-width: 100%;
	}

	.container {
		width: min(100%, 64rem);
		margin-inline: auto;
	}

	.index-opening {
		padding: clamp(6rem, 12vw, 9rem) var(--space-performance-md) clamp(2.5rem, 6vw, 4.5rem);
	}

	.opening-inner,
	.collection-heading {
		display: grid;
		gap: var(--space-performance-sm);
	}

	.eyebrow,
	.index-opening h1,
	.opening-copy,
	.collection-heading h2,
	.collection-heading p,
	.card-title,
	.card-description {
		margin: 0;
	}

	.eyebrow {
		color: var(--color-performance-fg-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.index-opening h1 {
		max-width: 18ch;
		color: var(--color-performance-fg-primary);
		font-size: clamp(2.5rem, 7vw, var(--text-performance-h1));
		font-weight: var(--font-performance-bold);
		line-height: 1;
	}

	.opening-copy {
		max-width: 42rem;
		color: var(--color-performance-fg-secondary);
		font-size: var(--text-performance-body-lg);
		line-height: 1.6;
	}

	.index-collection {
		padding: clamp(2rem, 5vw, 4rem) var(--space-performance-md) clamp(4rem, 8vw, 7rem);
		border-top: 1px solid var(--color-performance-border-default);
	}

	.collection-inner {
		display: grid;
		gap: var(--space-performance-lg);
	}

	.collection-heading h2 {
		color: var(--color-performance-fg-primary);
		font-size: var(--text-performance-h2);
	}

	.collection-heading > p:last-child {
		max-width: 42rem;
		color: var(--color-performance-fg-secondary);
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
		transition:
			border-color var(--duration-performance-standard) var(--ease-performance-standard),
			background var(--duration-performance-standard) var(--ease-performance-standard),
			transform var(--duration-performance-standard) var(--ease-performance-standard);
	}

	.card:hover,
	.card:focus-visible {
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

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}

		.card:hover,
		.card:focus-visible {
			transform: none;
		}
	}
</style>
