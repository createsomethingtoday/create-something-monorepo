<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../../icons/Icon.svelte';
	import type { IconName } from '../../icons/types.js';

	export interface ClearCtaItem {
		label: string;
		icon?: IconName;
		title: string;
		detail: string;
	}

	interface Props {
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		items?: ClearCtaItem[];
		actions?: Snippet;
	}

	let { id, eyebrow, title, description, items = [], actions }: Props = $props();
</script>

<section {id} class="clear-cta-band">
	<div class:clear-cta-band__inner--with-items={items.length > 0} class="clear-cta-band__inner">
		<div class="clear-cta-band__copy">
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

		{#if items.length}
			<div class="clear-cta-band__items" aria-label="CTA outcomes">
				{#each items as item}
					<article>
						{#if item.icon}
							<span class="clear-cta-band__item-icon" aria-hidden="true">
								<Icon name={item.icon} size="sm" strokeWidth={1.75} />
							</span>
						{/if}
						<div class="clear-cta-band__item-copy">
							<span class="clear-cta-band__item-label">{item.label}</span>
							<strong>{item.title}</strong>
							<p>{item.detail}</p>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	.clear-cta-band {
		padding-block: 4.5rem;
		background:
			linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px) 0 0 / 4rem 4rem,
			var(--color-clear-onyx, #0a0e19);
		border-bottom: 1px solid var(--color-clear-onyx, #0a0e19);
	}

	.clear-cta-band__inner {
		display: grid;
		gap: 2rem;
		width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
		color: #ffffff;
	}

	.clear-cta-band__inner--with-items {
		grid-template-columns: minmax(0, 0.92fr) minmax(18rem, 1.08fr);
		align-items: stretch;
	}

	.clear-cta-band__copy {
		display: grid;
		align-content: center;
		justify-items: start;
		gap: 0.9rem;
		max-width: 42rem;
	}

	.clear-cta-band__kicker {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.9rem;
		align-items: center;
		padding: 0.36rem 0.62rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: var(--radius-clear-sm, 4px);
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.74);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-cta-band h2 {
		margin: 0;
		max-width: 14ch;
		color: #ffffff;
		font-size: 3.25rem;
		font-weight: var(--font-medium);
		line-height: 1.02;
		letter-spacing: 0;
		text-wrap: balance;
	}

	.clear-cta-band p {
		margin: 0;
		max-width: 38rem;
		color: rgba(255, 255, 255, 0.72);
		font-size: 1.08rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-cta-band__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.clear-cta-band__items {
		display: grid;
		gap: 0.75rem;
	}

	.clear-cta-band__items article {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: flex-start;
		gap: 0.34rem;
		padding: 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: var(--radius-clear-sm, 4px);
		background: rgba(255, 255, 255, 0.08);
	}

	.clear-cta-band__items article::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 0.2rem;
		background: var(--cta-accent, var(--color-clear-pastel-blue, #afc1fd));
	}

	.clear-cta-band__items article:nth-child(2) {
		--cta-accent: var(--color-clear-frosted-mint, #d9fff7);
	}

	.clear-cta-band__items article:nth-child(3) {
		--cta-accent: var(--color-clear-candy-purple, #efd4ff);
	}

	.clear-cta-band__item-icon {
		display: inline-grid;
		width: 2.1rem;
		height: 2.1rem;
		flex: 0 0 auto;
		place-items: center;
		margin-right: 0.48rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: var(--radius-clear-sm, 4px);
		background: color-mix(in srgb, var(--cta-accent, var(--color-clear-pastel-blue, #afc1fd)) 70%, white);
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-cta-band__item-copy {
		display: grid;
		min-width: 0;
		gap: 0.34rem;
	}

	.clear-cta-band__item-label {
		color: rgba(255, 255, 255, 0.64);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-medium);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.clear-cta-band__items strong {
		color: #ffffff;
		font-size: 1.02rem;
		font-weight: var(--font-medium);
		line-height: 1.2;
	}

	.clear-cta-band__items p {
		max-width: none;
		font-size: 0.92rem;
		line-height: 1.45;
	}

	.clear-cta-band :global(.btn) {
		border-radius: var(--radius-clear-sm, 4px);
		letter-spacing: 0;
		box-shadow: none;
	}

	.clear-cta-band :global(.btn-primary) {
		background: #ffffff;
		border-color: #ffffff;
		color: var(--color-clear-onyx, #0a0e19);
	}

	.clear-cta-band :global(.btn-primary:hover) {
		background: var(--color-clear-pastel-blue, #afc1fd);
		border-color: var(--color-clear-pastel-blue, #afc1fd);
		box-shadow: none;
	}

	.clear-cta-band :global(.btn-secondary) {
		background: transparent;
		border-color: rgba(255, 255, 255, 0.22);
		color: #ffffff;
	}

	.clear-cta-band :global(.btn-secondary:hover) {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.38);
	}

	@media (max-width: 640px) {
		.clear-cta-band {
			padding-block: 2.75rem;
		}

		.clear-cta-band__inner {
			width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
		}

		.clear-cta-band__inner--with-items {
			grid-template-columns: 1fr;
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
