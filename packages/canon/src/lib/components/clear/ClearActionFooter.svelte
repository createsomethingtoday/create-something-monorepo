<script lang="ts">
	import type { Snippet } from 'svelte';

	export interface ClearActionFooterItem {
		label: string;
		value: string;
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items?: ClearActionFooterItem[];
		actions?: Snippet;
	}

	let { id, eyebrow, title, description, items = [], actions }: Props = $props();
</script>

<section {id} class="clear-action-footer">
	<div class="clear-action-footer__inner">
		<div class="clear-action-footer__copy">
			{#if eyebrow}
				<span>{eyebrow}</span>
			{/if}
			<h2>{title}</h2>
			{#if description}
				<p>{description}</p>
			{/if}
			{#if actions}
				<div class="clear-action-footer__actions">
					{@render actions()}
				</div>
			{/if}
		</div>

		{#if items.length}
			<div class="clear-action-footer__items" aria-label="Action details">
				{#each items as item}
					<div>
						<span>{item.label}</span>
						<strong>{item.value}</strong>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.clear-action-footer {
		padding-block: 4.5rem;
		background:
			linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px) 0 0 / 4rem 4rem,
			var(--color-performance-ink, #090909);
		color: #ffffff;
	}

	.clear-action-footer__inner {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.54fr);
		gap: clamp(2rem, 6vw, 5rem);
		align-items: end;
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-action-footer__copy {
		display: grid;
		gap: 0.9rem;
		max-width: 55rem;
	}

	.clear-action-footer__copy > span {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: var(--radius-performance-sm, 4px);
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.74);
		font-family: var(--font-performance-mono);
		font-size: 0.76rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-action-footer h2 {
		margin: 0;
		max-width: 15ch;
		color: #ffffff;
		font-size: clamp(3rem, 7vw, 5.2rem);
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 0.98;
		text-wrap: balance;
	}

	.clear-action-footer p {
		margin: 0;
		max-width: 42rem;
		color: rgba(255, 255, 255, 0.72);
		font-size: 1.08rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-action-footer__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		padding-top: 0.25rem;
	}

	.clear-action-footer__items {
		display: grid;
		gap: 0.65rem;
	}

	.clear-action-footer__items div {
		display: grid;
		gap: 0.26rem;
		padding: 0.82rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: var(--radius-performance-sm, 4px);
		background: rgba(255, 255, 255, 0.08);
	}

	.clear-action-footer__items span {
		color: rgba(255, 255, 255, 0.62);
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 1.12;
		text-transform: uppercase;
	}

	.clear-action-footer__items strong {
		color: #ffffff;
		font-size: 0.98rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.22;
	}

	.clear-action-footer :global(.btn) {
		border-radius: var(--radius-performance-sm, 4px);
		letter-spacing: 0;
		box-shadow: none;
	}

	.clear-action-footer :global(.btn-primary) {
		background: #ffffff;
		border-color: #ffffff;
		color: var(--color-performance-ink, #090909);
	}

	.clear-action-footer :global(.btn-primary:hover) {
		background: var(--color-performance-court, #e6e6e0);
		border-color: var(--color-performance-court, #e6e6e0);
		box-shadow: none;
	}

	.clear-action-footer :global(.btn-secondary) {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.22);
		color: #ffffff;
	}

	.clear-action-footer :global(.btn-secondary:hover) {
		background: var(--color-performance-panel, #ffffff);
		border-color: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
	}

	@media (max-width: 900px) {
		.clear-action-footer__inner {
			grid-template-columns: 1fr;
			align-items: start;
		}
	}

	@media (max-width: 640px) {
		.clear-action-footer {
			padding-block: 2.75rem;
		}

		.clear-action-footer__inner {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
		}

		.clear-action-footer h2 {
			font-size: 2.65rem;
		}

		.clear-action-footer__actions :global(.btn) {
			width: 100%;
		}
	}
</style>
