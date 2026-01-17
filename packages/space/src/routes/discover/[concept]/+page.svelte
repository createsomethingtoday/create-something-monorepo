<script lang="ts">
	/**
	 * Concept Discovery Page
	 *
	 * Visualizes a concept's journey across all CREATE SOMETHING properties.
	 * Route: /discover/:concept
	 *
	 * Canon: Understanding emerges through the hermeneutic spiral.
	 */

	import type { PageData } from './$types';
	import { ConceptJourney } from '@create-something/components';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Discover: {data.concept} | CREATE SOMETHING</title>
	<meta name="description" content="Explore {data.concept} across all CREATE SOMETHING properties - from canon definition to practical application." />
</svelte:head>

<main class="discover-page">
	<ConceptJourney
		concept={data.concept}
		searchApiUrl={data.searchApiUrl}
		maxItemsPerStage={5}
		showEmptyStages={false}
	/>

	<!-- Back Navigation -->
	<nav class="discover-nav">
		<a href="/" class="nav-link">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7"/>
			</svg>
			Back to experiments
		</a>
	</nav>
</main>

<style>
	.discover-page {
		min-height: 100vh;
		background: var(--color-bg-primary, #000);
	}

	.discover-nav {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-lg, 2.618rem) var(--space-md, 1.618rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		text-decoration: none;
		font-size: var(--text-body-sm, 0.875rem);
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary, #fff);
	}
</style>
