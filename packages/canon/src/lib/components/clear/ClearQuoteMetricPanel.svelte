<script lang="ts">
	export interface ClearQuoteMetric {
		value: string;
		label: string;
		detail?: string;
	}

	interface Props {
		eyebrow?: string;
		quote: string;
		source?: string;
		metrics: ClearQuoteMetric[];
		ariaLabel?: string;
	}

	let { eyebrow, quote, source, metrics, ariaLabel = 'Proof metrics' }: Props = $props();
</script>

<section class="clear-quote-metric-panel" aria-label={ariaLabel}>
	<div class="clear-quote-metric-panel__inner">
		<figure class="clear-quote-metric-panel__quote">
			{#if eyebrow}
				<span>{eyebrow}</span>
			{/if}
			<blockquote>{quote}</blockquote>
			{#if source}
				<figcaption>{source}</figcaption>
			{/if}
		</figure>

		<div class="clear-quote-metric-panel__metrics" aria-label="Metrics">
			{#each metrics as metric}
				<article>
					<strong>{metric.value}</strong>
					<span>{metric.label}</span>
					{#if metric.detail}
						<p>{metric.detail}</p>
					{/if}
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.clear-quote-metric-panel {
		padding-block: 4.5rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-quote-metric-panel__inner {
		display: grid;
		grid-template-columns: minmax(0, 0.92fr) minmax(18rem, 1.08fr);
		gap: 0;
		width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		overflow: hidden;
	}

	.clear-quote-metric-panel__quote {
		display: grid;
		gap: 1rem;
		align-content: center;
		min-height: 22rem;
		margin: 0;
		padding: clamp(1.25rem, 4vw, 2.25rem);
		border-right: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.clear-quote-metric-panel__quote span {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-quote-metric-panel blockquote {
		margin: 0;
		max-width: 15ch;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 3.05rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.03;
		text-wrap: balance;
	}

	.clear-quote-metric-panel figcaption {
		color: var(--color-clear-grey, #636363);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	.clear-quote-metric-panel__metrics {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.clear-quote-metric-panel__metrics article {
		display: grid;
		gap: 0.45rem;
		align-content: end;
		min-height: 11rem;
		padding: 1rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		border-right: 1px solid var(--color-clear-border, #e1e1e1);
		background: var(--color-clear-panel, #ffffff);
	}

	.clear-quote-metric-panel__metrics article:nth-child(2n) {
		border-right: 0;
	}

	.clear-quote-metric-panel__metrics article:nth-last-child(-n + 2) {
		border-bottom: 0;
	}

	.clear-quote-metric-panel__metrics strong {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: clamp(2.6rem, 6vw, 5rem);
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 0.92;
	}

	.clear-quote-metric-panel__metrics span {
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 1.02rem;
		font-weight: var(--font-medium);
		line-height: 1.18;
	}

	.clear-quote-metric-panel__metrics p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		font-size: 0.9rem;
		line-height: 1.42;
	}

	@media (max-width: 900px) {
		.clear-quote-metric-panel__inner {
			grid-template-columns: 1fr;
		}

		.clear-quote-metric-panel__quote {
			min-height: auto;
			border-right: 0;
			border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		}
	}

	@media (max-width: 640px) {
		.clear-quote-metric-panel {
			padding-block: 2.75rem;
		}

		.clear-quote-metric-panel__inner {
			width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
		}

		.clear-quote-metric-panel blockquote {
			font-size: 2.25rem;
		}

		.clear-quote-metric-panel__metrics {
			grid-template-columns: 1fr;
		}

		.clear-quote-metric-panel__metrics article,
		.clear-quote-metric-panel__metrics article:nth-child(2n),
		.clear-quote-metric-panel__metrics article:nth-last-child(-n + 2) {
			border-right: 0;
			border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		}

		.clear-quote-metric-panel__metrics article:last-child {
			border-bottom: 0;
		}
	}
</style>
