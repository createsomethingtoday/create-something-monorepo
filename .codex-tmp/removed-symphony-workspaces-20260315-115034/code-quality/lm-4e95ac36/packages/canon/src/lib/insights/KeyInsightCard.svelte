<script lang="ts">
	/**
	 * KeyInsightCard - Compact Inline Insight for Papers
	 *
	 * A smaller version of KeyInsight for embedding in papers and articles.
	 * Links to full-screen view for detailed interaction.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 */

	import type { InsightConfig } from './types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props {
		/** Insight configuration */
		insight: InsightConfig;
		/** Link to full-screen insight page (optional) */
		href?: string;
		/** Additional CSS classes */
		class?: string;
	}

	let { insight, href, class: className = '' }: Props = $props();
</script>

{#if href}
	<a {href} class="insight-card-link {className}">
		<article class="insight-card">
			<header class="card-header">
				<span class="card-label">KEY INSIGHT</span>
				{#if insight.category}
					<span class="card-category">{insight.category}</span>
				{/if}
			</header>

			<!-- Comparison (if present) -->
			{#if insight.comparison}
				<div class="card-comparison">
					{#each insight.comparison as row}
						<div class="card-row card-row-{row.type}">
							<span class="row-label">{row.label}</span>
							<code class="row-code">{row.code}</code>
							<span class="row-result">{row.result}</span>
						</div>
					{/each}
				</div>
			{/if}

			<p class="card-principle">{insight.principle}</p>

			<footer class="card-footer">
				<span class="view-full">View full insight →</span>
			</footer>
		</article>
	</a>
{:else}
	<article class="insight-card {className}">
		<header class="card-header">
			<span class="card-label">KEY INSIGHT</span>
			{#if insight.category}
				<span class="card-category">{insight.category}</span>
			{/if}
		</header>

		<!-- Comparison (if present) -->
		{#if insight.comparison}
			<div class="card-comparison">
				{#each insight.comparison as row}
					<div class="card-row card-row-{row.type}">
						<span class="row-label">{row.label}</span>
						<code class="row-code">{row.code}</code>
						<span class="row-result">{row.result}</span>
					</div>
				{/each}
			</div>
		{/if}

		<p class="card-principle">{insight.principle}</p>

		{#if insight.source}
			<footer class="card-footer">
				<a href={insight.source.url} class="source-link">{insight.source.title}</a>
			</footer>
		{/if}
	</article>
{/if}

<style>
	.insight-card-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}

	.insight-card {
		background: var(--color-bg-surface, #111);
		border: 2px solid var(--color-border-emphasis, rgba(255,255,255,0.2));
		border-radius: var(--radius-xl, 16px);
		padding: var(--space-lg, 2.5rem);
		transition: all var(--duration-micro, 200ms) var(--ease-standard);
	}

	.insight-card-link:hover .insight-card {
		border-color: var(--color-border-strong, rgba(255,255,255,0.3));
		transform: translateY(-2px);
	}

	.insight-card-link:focus-visible .insight-card {
		outline: 2px solid var(--color-focus, rgba(255,255,255,0.5));
		outline-offset: 2px;
	}

	/* Header */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md, 1.5rem);
	}

	.card-label {
		font-size: var(--text-caption, 0.75rem);
		font-weight: 700;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted, rgba(255,255,255,0.46));
		text-transform: uppercase;
	}

	.card-category {
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		text-transform: capitalize;
	}

	/* Comparison */
	.card-comparison {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 1rem);
		margin-bottom: var(--space-md, 1.5rem);
	}

	.card-row {
		display: grid;
		grid-template-columns: 50px 1fr auto;
		gap: var(--space-sm, 1rem);
		align-items: center;
		padding: var(--space-sm, 1rem);
		border-radius: var(--radius-md, 8px);
		font-size: var(--text-body-sm, 0.875rem);
	}

	.card-row-negative {
		background: var(--color-error-muted, rgba(212, 77, 77, 0.2));
		border: 1px solid var(--color-error-border, rgba(212, 77, 77, 0.3));
	}

	.card-row-positive {
		background: var(--color-success-muted, rgba(68, 170, 68, 0.2));
		border: 1px solid var(--color-success-border, rgba(68, 170, 68, 0.3));
	}

	.card-row-neutral {
		background: var(--color-bg-subtle, #1a1a1a);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.row-label {
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-row-negative .row-label {
		color: var(--color-error, #d44d4d);
	}

	.card-row-positive .row-label {
		color: var(--color-success, #44aa44);
	}

	.row-code {
		font-family: var(--font-mono, ui-monospace, monospace);
		color: var(--color-fg-primary);
		background: var(--color-bg-pure, #000);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm, 6px);
	}

	.row-result {
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		text-align: right;
	}

	/* Principle */
	.card-principle {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		line-height: 1.5;
		color: var(--color-fg-primary);
		text-align: center;
	}

	/* Footer */
	.card-footer {
		margin-top: var(--space-md, 1.5rem);
		padding-top: var(--space-sm, 1rem);
		border-top: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		text-align: center;
	}

	.view-full {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
	}

	.source-link {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		text-decoration: none;
	}

	.source-link:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 480px) {
		.insight-card {
			padding: var(--space-md, 1.5rem);
		}

		.card-row {
			grid-template-columns: 45px 1fr;
		}

		.row-result {
			grid-column: 1 / -1;
			text-align: left;
			padding-left: 45px;
			font-size: var(--text-caption, 0.75rem);
		}
	}
</style>
