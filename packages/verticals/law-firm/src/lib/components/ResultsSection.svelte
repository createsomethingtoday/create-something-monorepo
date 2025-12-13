<script lang="ts">
	/**
	 * Results Section
	 * Displays anonymized case outcomes as trust signals
	 * Ethics: No client names, disclaimer about prior results
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';

	const siteConfig = getSiteConfigFromContext();
	const { results, practiceAreas } = siteConfig;

	// Get practice area name from slug
	function getPracticeAreaName(slug: string): string {
		const area = practiceAreas.find((a) => a.slug === slug);
		return area?.name || slug;
	}
</script>

<section class="results-section" id="results">
	<div class="container">
		<header class="section-header">
			<h2 class="section-title">Representative Results</h2>
			<p class="section-subtitle">
				A selection of outcomes we've achieved for our clients.
			</p>
		</header>

		<div class="results-grid">
			{#each results as result}
				<article class="result-card">
					<div class="result-meta">
						<span class="result-area">{getPracticeAreaName(result.practiceArea)}</span>
						<span class="result-year">{result.year}</span>
					</div>
					<h3 class="result-title">{result.title}</h3>
					<p class="result-outcome">{result.outcome}</p>
					<p class="result-description">{result.description}</p>
				</article>
			{/each}
		</div>

		<p class="results-disclaimer">
			Prior results do not guarantee a similar outcome. Every case is different.
		</p>
	</div>
</section>

<style>
	.results-section {
		padding: var(--space-3xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Golden Ratio Grid Layout
	 * φ = 1.618
	 * Large card: ~61.8% (1fr × φ)
	 * Small cards: ~38.2% (1fr)
	 * Creates visual hierarchy through proportion
	 */
	.results-grid {
		display: grid;
		grid-template-columns: 1.618fr 1fr;
		grid-template-rows: auto auto;
		gap: var(--space-md);
	}

	/* Featured card spans full height of left column */
	.result-card:first-child {
		grid-row: 1 / 3;
		display: flex;
		flex-direction: column;
	}

	.result-card:first-child .result-description {
		flex-grow: 1;
	}

	/* Remaining cards stack in right column */
	.result-card:nth-child(2),
	.result-card:nth-child(3) {
		/* Natural flow */
	}

	/* Additional cards flow below in full-width row */
	.result-card:nth-child(n+4) {
		/* Will create new row */
	}

	.result-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.result-card:hover {
		border-color: var(--color-border-emphasis);
	}

	/* Featured card styling */
	.result-card:first-child {
		padding: var(--space-xl);
	}

	.result-card:first-child .result-title {
		font-size: var(--text-h2);
	}

	.result-card:first-child .result-outcome {
		font-size: var(--text-h3);
	}

	.result-card:first-child .result-description {
		font-size: var(--text-body);
	}

	.result-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	.result-area {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.result-year {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	.result-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.result-outcome {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		margin: 0 0 var(--space-sm);
	}

	.result-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: var(--leading-relaxed);
	}

	.results-disclaimer {
		text-align: center;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-xl);
		font-style: italic;
	}

	/* Tablet: 2-column equal grid */
	@media (max-width: 1024px) {
		.results-grid {
			grid-template-columns: 1fr 1fr;
		}

		.result-card:first-child {
			grid-row: auto;
			padding: var(--space-lg);
		}

		.result-card:first-child .result-title {
			font-size: var(--text-h3);
		}

		.result-card:first-child .result-outcome {
			font-size: var(--text-body-lg);
		}
	}

	/* Mobile: single column */
	@media (max-width: 768px) {
		.results-section {
			padding: var(--space-2xl) var(--space-md);
		}

		.results-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
