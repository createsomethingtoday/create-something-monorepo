<script lang="ts">
	import type { Snippet } from 'svelte';

	export interface ClearProofItem {
		value: string;
		label: string;
		icon?: string;
	}

	interface Props {
		items: ClearProofItem[];
		ariaLabel?: string;
		icon?: Snippet<[ClearProofItem]>;
	}

	let { items, ariaLabel = 'Proof artifacts', icon }: Props = $props();
</script>

<div class="clear-proof-strip" aria-label={ariaLabel}>
	{#each items as item}
		<article class="clear-proof-strip__item">
			{#if icon}
				<div class="clear-proof-strip__icon" aria-hidden="true">
					{@render icon(item)}
				</div>
			{/if}
			<div>
				<span>{item.value}</span>
				<p>{item.label}</p>
			</div>
		</article>
	{/each}
</div>

<style>
	.clear-proof-strip {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.clear-proof-strip__item {
		position: relative;
		overflow: hidden;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.85rem;
		min-height: 5.7rem;
		align-items: center;
		padding: 0.9rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
	}

	.clear-proof-strip__item::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 0.22rem;
		background: var(--proof-accent, var(--color-performance-signal-soft, #dce8f5));
	}

	.clear-proof-strip__item:nth-child(2) {
		--proof-accent: var(--color-performance-growth-soft, #dcece5);
	}

	.clear-proof-strip__item:nth-child(3) {
		--proof-accent: var(--color-performance-pressure-soft, #f7e2d7);
	}

	.clear-proof-strip__item:nth-child(4) {
		--proof-accent: var(--color-performance-growth-soft, #dcece5);
	}

	.clear-proof-strip__item:not(:has(.clear-proof-strip__icon)) {
		grid-template-columns: 1fr;
	}

	.clear-proof-strip__icon {
		position: relative;
		overflow: hidden;
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background:
			radial-gradient(circle, #9c9c96 0 1.5px, transparent 1.7px) 0.32rem 0.34rem / 0.78rem 0.78rem,
			color-mix(in srgb, var(--proof-accent, var(--color-performance-signal-soft, #dce8f5)) 48%, white);
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.02);
		--workflow-signal-icon-color: var(--color-performance-ink, #090909);
		--workflow-signal-icon-size: 1.45rem;
	}

	.clear-proof-strip__icon::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.18));
	}

	.clear-proof-strip__icon :global(svg) {
		position: relative;
		z-index: 1;
	}

	.clear-proof-strip__item span {
		display: block;
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-mono);
		font-size: 0.95rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		line-height: 1.15;
	}

	.clear-proof-strip__item p {
		margin: 0.28rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.86rem;
		line-height: 1.35;
	}

	@media (max-width: 980px) {
		.clear-proof-strip {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.clear-proof-strip {
			grid-template-columns: 1fr;
		}

		.clear-proof-strip__item {
			padding: 0.85rem;
		}
	}
</style>
