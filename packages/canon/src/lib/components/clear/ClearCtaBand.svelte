<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		actions?: Snippet;
	}

	let { id, eyebrow, title, description, actions }: Props = $props();
</script>

<section {id} class="clear-cta-band">
	<div class="clear-cta-band__inner">
		{#if eyebrow}
			<span class="clear-cta-band__kicker">{eyebrow}</span>
		{/if}
		<h2>{title}</h2>
		{#if description}
			<p>{description}</p>
		{/if}
		{#if actions}
			<div class="clear-cta-band__actions">
				{@render actions()}
			</div>
		{/if}
	</div>
</section>

<style>
	.clear-cta-band {
		padding-block: 4rem;
		background: var(--color-clear-panel, #ffffff);
	}

	.clear-cta-band__inner {
		display: grid;
		justify-items: center;
		gap: 0.9rem;
		width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
		padding: 2.5rem;
		border: 1px solid var(--color-clear-border-strong, #cecece);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-onyx, #0a0e19);
		text-align: center;
	}

	.clear-cta-band__kicker {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: var(--radius-clear-sm, 4px);
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-grey, #636363);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-cta-band h2 {
		margin: 0;
		max-width: 12ch;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 3.25rem;
		font-weight: var(--font-medium);
		line-height: 1.02;
		letter-spacing: 0;
		text-wrap: balance;
	}

	.clear-cta-band p {
		margin: 0;
		max-width: 38rem;
		color: var(--color-clear-grey, #636363);
		font-size: 1.08rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-cta-band__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		align-items: center;
	}

	.clear-cta-band :global(.btn) {
		border-radius: var(--radius-clear-sm, 4px);
		letter-spacing: 0;
		box-shadow: none;
	}

	.clear-cta-band :global(.btn-primary) {
		background: var(--color-clear-onyx, #0a0e19);
		border-color: var(--color-clear-onyx, #0a0e19);
		color: #ffffff;
	}

	.clear-cta-band :global(.btn-primary:hover) {
		background: #1a2030;
		border-color: #1a2030;
		box-shadow: none;
	}

	@media (max-width: 640px) {
		.clear-cta-band {
			padding-block: 2.75rem;
		}

		.clear-cta-band__inner {
			width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
			padding: 1.25rem;
		}

		.clear-cta-band h2 {
			font-size: 2.35rem;
		}

		.clear-cta-band p {
			font-size: 1rem;
			line-height: 1.56;
		}

		.clear-cta-band__actions,
		.clear-cta-band__actions :global(.btn) {
			width: 100%;
		}
	}
</style>
