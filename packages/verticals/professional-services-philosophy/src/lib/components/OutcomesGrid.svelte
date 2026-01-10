<script lang="ts">
	/**
	 * Outcomes Grid
	 *
	 * Replaces testimonial carousel with metrics-driven results.
	 * Pattern: "[Outcome]. [Metric]. [Context]."
	 *
	 * Styling: 3-column responsive grid, metric emphasis with --color-success
	 * Philosophy: Specificity over generality. Every claim is measurable.
	 */

	export interface ClientOutcome {
		result: string;
		metric: string;
		context: string;
		year: string;
	}

	interface Props {
		outcomes?: ClientOutcome[];
		headline?: string;
		subtitle?: string;
	}

	let {
		headline = 'Client Outcomes',
		subtitle = 'Specificity over generality. Every claim is measurable.',
		outcomes = [
			{
				result: 'Production in 6 hours',
				metric: '$50K under budget',
				context: 'Authentication system for SaaS platform',
				year: '2024'
			},
			{
				result: '155 scripts → 13',
				metric: 'Same functionality, 92% reduction',
				context: 'Build automation for agency client',
				year: '2024'
			},
			{
				result: '26 hours actual vs 120 estimated',
				metric: '78% time reduction',
				context: 'Multi-tenant template platform',
				year: '2024'
			},
			{
				result: 'Production in 4 days',
				metric: '2-week estimate',
				context: 'REST → GraphQL migration',
				year: '2023'
			},
			{
				result: 'p95 latency: 45ms → 12ms',
				metric: '73% improvement',
				context: 'Serverless to Cloudflare Workers',
				year: '2023'
			}
		]
	}: Props = $props();
</script>

<section class="outcomes-grid-section">
	<div class="outcomes-container">
		<div class="section-header">
			<h2 class="section-title">{headline}</h2>
			{#if subtitle}
				<p class="section-subtitle">{subtitle}</p>
			{/if}
		</div>

		<div class="outcomes-grid">
			{#each outcomes as outcome}
				<div class="outcome-card">
					<p class="outcome-result">{outcome.result}</p>
					<p class="outcome-metric">{outcome.metric}</p>
					<p class="outcome-context">{outcome.context}</p>
					<span class="outcome-year">{outcome.year}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/*
	 * Outcomes Grid Layout
	 * Metrics-driven specificity. No vague claims.
	 */

	.outcomes-grid-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-elevated);
	}

	.outcomes-container {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		margin-bottom: var(--space-2xl);
		max-width: 60ch;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-fg-tertiary);
	}

	/*
	 * Outcomes Grid - Responsive 3-column
	 */

	.outcomes-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-lg);
	}

	@media (min-width: 640px) {
		.outcomes-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.outcomes-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/*
	 * Outcome Card
	 */

	.outcome-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.outcome-card:hover {
		border-color: var(--color-border-emphasis);
	}

	/*
	 * Outcome Content
	 */

	.outcome-result {
		font-size: var(--text-h3);
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.outcome-metric {
		font-size: var(--text-body-lg);
		font-weight: 600;
		line-height: 1.4;
		color: var(--color-success); /* Semantic: positive outcome */
		margin: 0;
	}

	.outcome-context {
		font-size: var(--text-body);
		font-weight: 400;
		line-height: 1.5;
		color: var(--color-fg-secondary);
		margin: 0;
		flex: 1; /* Push year to bottom */
	}

	.outcome-year {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: var(--space-sm);
	}

	/*
	 * Reduced Motion Support
	 */

	@media (prefers-reduced-motion: reduce) {
		.outcome-card {
			transition: none;
		}
	}
</style>
