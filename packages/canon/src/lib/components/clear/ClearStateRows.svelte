<script lang="ts">
	type ClearStateTone = 'run' | 'wait' | 'stop' | 'neutral';

	export interface ClearWorkflowState {
		tone?: ClearStateTone;
		state: string;
		label: string;
		detail: string;
	}

	interface Props {
		eyebrow: string;
		title: string;
		states: ClearWorkflowState[];
		receiptLabel?: string;
		receipts?: string[];
		ariaLabel?: string;
	}

	let {
		eyebrow,
		title,
		states,
		receiptLabel = 'Receipt',
		receipts = [],
		ariaLabel = 'Governed workflow states'
	}: Props = $props();
</script>

<aside class="clear-state-rows" aria-label={ariaLabel}>
	<div class="clear-state-rows__header">
		<div>
			<span>{eyebrow}</span>
			<strong>{title}</strong>
		</div>
		<div class="clear-state-rows__signals" aria-hidden="true">
			<i></i>
			<i></i>
			<i></i>
		</div>
	</div>
	<div class="clear-state-rows__body">
		{#each states as state}
			<div class={`clear-state-row clear-state-row--${state.tone ?? 'neutral'}`}>
				<div class="clear-state-row__marker">{state.state}</div>
				<div>
					<strong>{state.label}</strong>
					<p>{state.detail}</p>
				</div>
			</div>
		{/each}
	</div>
	{#if receipts.length > 0}
		<div class="clear-state-rows__footer">
			<span>{receiptLabel}</span>
			<div class="clear-state-rows__receipts">
				{#each receipts as receipt}
					<strong>{receipt}</strong>
				{/each}
			</div>
		</div>
	{/if}
</aside>

<style>
	.clear-state-rows {
		position: relative;
		display: grid;
		gap: 0;
		border: 1px solid var(--color-performance-line-strong, #9c9c96);
		border-radius: var(--radius-performance-md, 4px);
		background: var(--color-performance-panel, #ffffff);
		box-shadow: 0 18px 60px rgba(10, 14, 25, 0.08);
		overflow: hidden;
	}

	.clear-state-rows::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: 0.24rem;
		background: linear-gradient(
			90deg,
			var(--color-performance-growth-soft, #dcece5),
			var(--color-performance-signal-soft, #dce8f5),
			var(--color-performance-pressure-soft, #f7e2d7)
		);
	}

	.clear-state-rows__header,
	.clear-state-rows__footer {
		display: grid;
		gap: 0.65rem;
		padding: 1rem 1.05rem;
		background: var(--color-performance-court, #e6e6e0);
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.clear-state-rows__header {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: start;
	}

	.clear-state-rows__header span,
	.clear-state-rows__footer span {
		display: block;
		margin-bottom: 0.35rem;
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.clear-state-rows__header strong {
		display: block;
		color: var(--color-performance-ink, #090909);
		font-size: 1.75rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.08;
	}

	.clear-state-rows__signals {
		display: inline-flex;
		gap: 0.34rem;
		padding-top: 0.18rem;
	}

	.clear-state-rows__signals i {
		width: 0.48rem;
		height: 0.48rem;
		border-radius: 999px;
		background: var(--color-performance-line-strong, #9c9c96);
	}

	.clear-state-rows__signals i:first-child {
		background: var(--color-performance-growth, #007a4d);
	}

	.clear-state-rows__signals i:last-child {
		background: var(--color-performance-risk, #c62026);
	}

	.clear-state-rows__body {
		display: grid;
		gap: 0.58rem;
		padding: 0.72rem;
		background: var(--color-performance-panel, #ffffff);
	}

	.clear-state-row {
		display: grid;
		grid-template-columns: 4.35rem minmax(0, 1fr);
		gap: 0.85rem;
		align-items: start;
		padding: 0.82rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.88);
	}

	.clear-state-row--run {
		background: color-mix(in srgb, var(--color-performance-growth-soft, #dcece5) 28%, white);
	}

	.clear-state-row--wait {
		background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 22%, white);
	}

	.clear-state-row--stop {
		background: color-mix(in srgb, var(--color-performance-pressure-soft, #f7e2d7) 20%, white);
	}

	.clear-state-row__marker {
		display: grid;
		place-items: center;
		min-height: 2rem;
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-muted, #5e6268);
		color: #ffffff;
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-bold);
		letter-spacing: 0;
		text-transform: uppercase;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
	}

	.clear-state-row--run .clear-state-row__marker {
		background: var(--color-performance-growth, #007a4d);
	}

	.clear-state-row--wait .clear-state-row__marker {
		background: var(--color-performance-ink, #090909);
	}

	.clear-state-row--stop .clear-state-row__marker {
		background: var(--color-performance-risk, #c62026);
	}

	.clear-state-row strong {
		display: block;
		margin-bottom: 0.22rem;
		color: var(--color-performance-ink, #090909);
		font-size: 1rem;
		line-height: 1.2;
	}

	.clear-state-row p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.9rem;
		line-height: 1.42;
	}

	.clear-state-rows__footer {
		grid-template-columns: 1fr;
		gap: 0.55rem;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		border-bottom: 0;
	}

	.clear-state-rows__footer span {
		margin-bottom: 0;
	}

	.clear-state-rows__receipts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.42rem;
	}

	.clear-state-rows__footer strong {
		display: inline-flex;
		align-items: center;
		gap: 0.36rem;
		width: fit-content;
		max-width: 100%;
		padding: 0.28rem 0.45rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-performance-mono);
		font-size: 0.78rem;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.clear-state-rows__footer strong::before {
		content: '';
		width: 0.62rem;
		height: 0.76rem;
		border: 1px solid var(--color-performance-muted, #5e6268);
		border-radius: 2px;
		background: linear-gradient(135deg, transparent 0 66%, rgba(10, 14, 25, 0.08) 66% 100%);
	}

	@media (max-width: 640px) {
		.clear-state-rows__header,
		.clear-state-rows__footer,
		.clear-state-row {
			padding: 0.85rem;
		}

		.clear-state-rows__header strong {
			font-size: 1.45rem;
		}

		.clear-state-row {
			grid-template-columns: 3.6rem minmax(0, 1fr);
			gap: 0.7rem;
		}

		.clear-state-row__marker {
			min-height: 1.9rem;
			font-size: 0.66rem;
		}
	}
</style>
