<script lang="ts">
	/**
	 * RecoveryResultsSection - Showcase Recovery Amounts
	 *
	 * Golden ratio layout with featured recovery + grid.
	 * Recovery amounts prominently displayed.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { Scale, ArrowRight } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		title?: string;
		description?: string;
		maxItems?: number;
	}

	let {
		title = 'Recent Case Results',
		description = 'Real results for real clients. Every case is unique, but these outcomes demonstrate our commitment to maximum compensation.',
		maxItems = 6
	}: Props = $props();

	const recoveries = siteConfig.recoveries.slice(0, maxItems);
	const featuredRecovery = recoveries[0];
	const otherRecoveries = recoveries.slice(1);

	function formatAmount(amount: number): string {
		if (amount >= 1000000) {
			return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
		} else if (amount >= 1000) {
			return `$${(amount / 1000).toFixed(0)}K`;
		}
		return `$${amount.toLocaleString()}`;
	}
</script>

<section class="recovery-results">
	<div class="section-header">
		<h2 class="section-title">{title}</h2>
		<p class="section-description">{description}</p>
	</div>

	<div class="results-grid">
		<!-- Featured Result -->
		{#if featuredRecovery}
			<div class="result-card featured">
				<div class="result-badge">
					{featuredRecovery.resolution === 'verdict' ? 'Verdict' : 'Settlement'}
				</div>
				<div class="result-amount">{featuredRecovery.recoveryDisplay}</div>
				<h3 class="result-title">{featuredRecovery.title}</h3>
				<p class="result-description">{featuredRecovery.description}</p>
				<div class="result-meta">
					<span class="result-type">{featuredRecovery.accidentType}</span>
					<span class="result-year">{featuredRecovery.year}</span>
				</div>
			</div>
		{/if}

		<!-- Other Results Grid -->
		<div class="results-subgrid">
			{#each otherRecoveries as recovery}
				<div class="result-card">
					<div class="result-badge small">
						{recovery.resolution === 'verdict' ? 'Verdict' : 'Settlement'}
					</div>
					<div class="result-amount">{recovery.recoveryDisplay}</div>
					<h3 class="result-title">{recovery.title}</h3>
					<div class="result-meta">
						<span class="result-type">{recovery.accidentType}</span>
						<span class="result-year">{recovery.year}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="section-footer">
		<a href="/results" class="view-all">
			<span>View All Results</span>
			<ArrowRight size={16} />
		</a>
	</div>

	<p class="disclaimer">
		Past results do not guarantee future outcomes. Every case is different and must be evaluated on its own merits.
	</p>
</section>

<style>
	.recovery-results {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-pure);
	}

	.section-header {
		text-align: center;
		max-width: 700px;
		margin: 0 auto var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	/* Golden Ratio Grid */
	.results-grid {
		display: grid;
		grid-template-columns: 1.618fr 1fr;
		gap: var(--space-lg);
		max-width: var(--container-xl);
		margin: 0 auto;
	}

	.result-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.result-card.featured {
		padding: var(--space-xl);
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.result-badge {
		display: inline-block;
		width: max-content;
		padding: 4px var(--space-sm);
		background: rgba(68, 170, 68, 0.15);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-full);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-success);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		margin-bottom: var(--space-md);
	}

	.result-badge.small {
		font-size: 10px;
		padding: 2px var(--space-xs);
	}

	.result-amount {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.result-card.featured .result-amount {
		font-size: var(--text-display);
	}

	.result-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
	}

	.result-card.featured .result-title {
		font-size: var(--text-h3);
	}

	.result-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md);
		line-height: 1.6;
	}

	.result-meta {
		display: flex;
		gap: var(--space-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.result-type {
		padding: 2px var(--space-xs);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-sm);
	}

	/* Sub-grid for smaller results */
	.results-subgrid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-md);
	}

	.results-subgrid .result-card {
		padding: var(--space-md);
	}

	.results-subgrid .result-amount {
		font-size: var(--text-h3);
	}

	.results-subgrid .result-title {
		font-size: var(--text-body);
		margin-bottom: var(--space-xs);
	}

	.section-footer {
		display: flex;
		justify-content: center;
		margin-top: var(--space-xl);
	}

	.view-all {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-bg-pure);
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		background: var(--color-fg-secondary);
		transform: translateY(-2px);
	}

	.disclaimer {
		text-align: center;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: var(--space-lg);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.results-grid {
			grid-template-columns: 1fr;
		}

		.results-subgrid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 640px) {
		.recovery-results {
			padding: var(--space-xl) var(--space-md);
		}

		.results-subgrid {
			grid-template-columns: 1fr;
		}

		.result-card.featured .result-amount {
			font-size: var(--text-h1);
		}
	}
</style>
