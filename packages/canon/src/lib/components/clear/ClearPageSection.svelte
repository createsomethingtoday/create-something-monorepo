<script lang="ts">
	import type { Snippet } from 'svelte';

	type ClearSectionVariant = 'hero' | 'porcelain' | 'white' | 'soft';
	type ClearSectionLayout = 'stack' | 'split';
	type ClearHeadingLevel = 'h1' | 'h2' | 'h3';

	interface Props {
		id?: string;
		eyebrow?: string;
		title?: string;
		description?: string;
		titleLevel?: ClearHeadingLevel;
		variant?: ClearSectionVariant;
		layout?: ClearSectionLayout;
		ariaLabel?: string;
		class?: string;
		children?: Snippet;
		actions?: Snippet;
		aside?: Snippet;
		after?: Snippet;
	}

	let {
		id,
		eyebrow,
		title,
		description,
		titleLevel = 'h2',
		variant = 'porcelain',
		layout = 'stack',
		ariaLabel,
		class: className = '',
		children,
		actions,
		aside,
		after
	}: Props = $props();

	const sectionClass = $derived(
		`clear-page-section clear-page-section--${variant} clear-page-section--${layout} ${className}`.trim()
	);
</script>

<section {id} class={sectionClass} aria-label={ariaLabel}>
	<div class="clear-page-section__inner">
		<div class="clear-page-section__layout">
			<div class="clear-page-section__copy">
				{#if eyebrow}
					<span class="clear-kicker">{eyebrow}</span>
				{/if}

				{#if title}
					<svelte:element this={titleLevel} class="clear-page-section__title">
						{title}
					</svelte:element>
				{/if}

				{#if description}
					<p class="clear-page-section__description">{description}</p>
				{/if}

				{#if actions}
					<div class="clear-page-section__actions">
						{@render actions()}
					</div>
				{/if}

				{#if children}
					<div class="clear-page-section__content">
						{@render children()}
					</div>
				{/if}
			</div>

			{#if aside}
				<div class="clear-page-section__aside">
					{@render aside()}
				</div>
			{/if}
		</div>

		{#if after}
			<div class="clear-page-section__after">
				{@render after()}
			</div>
		{/if}
	</div>
</section>

<style>
	.clear-page-section {
		color: var(--color-clear-onyx, #0a0e19);
		background: var(--color-clear-porcelain, #f9f9f9);
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
		padding-block: 4.5rem;
		scroll-margin-top: 5.25rem;
	}

	.clear-page-section--hero {
		padding-block: 5.35rem 4rem;
		background: var(--color-clear-panel, #ffffff);
	}

	.clear-page-section--white {
		background: var(--color-clear-panel, #ffffff);
	}

	.clear-page-section--soft {
		background: var(--color-clear-porcelain, #f9f9f9);
	}

	.clear-page-section__inner {
		width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-page-section__layout {
		display: grid;
		gap: 2rem;
	}

	.clear-page-section--split .clear-page-section__layout {
		grid-template-columns: minmax(0, 1.04fr) minmax(21rem, 0.78fr);
		gap: clamp(2rem, 6vw, 5rem);
		align-items: center;
	}

	.clear-page-section__copy {
		display: grid;
		gap: 1rem;
		max-width: 48rem;
	}

	.clear-page-section--hero .clear-page-section__copy {
		max-width: none;
	}

	.clear-kicker {
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

	.clear-page-section__title {
		margin: 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 3.25rem;
		font-weight: var(--font-medium);
		line-height: 1.02;
		letter-spacing: 0;
		text-wrap: balance;
	}

	.clear-page-section--hero .clear-page-section__title {
		max-width: 12ch;
		font-size: clamp(3.75rem, 7vw, 5.75rem);
		font-weight: var(--font-medium);
		line-height: 0.98;
	}

	.clear-page-section__description {
		margin: 0;
		max-width: 42rem;
		color: var(--color-clear-grey, #636363);
		font-size: 1.08rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-page-section--hero .clear-page-section__description {
		max-width: 39rem;
		font-size: 1.14rem;
	}

	.clear-page-section__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.clear-page-section__content,
	.clear-page-section__after {
		display: grid;
		gap: 1rem;
	}

	.clear-page-section__after {
		margin-top: 3.25rem;
	}

	.clear-page-section :global(.btn) {
		border-radius: var(--radius-clear-sm, 4px);
		letter-spacing: 0;
		box-shadow: none;
	}

	.clear-page-section :global(.btn-primary) {
		background: var(--color-clear-onyx, #0a0e19);
		border-color: var(--color-clear-onyx, #0a0e19);
		color: #ffffff;
	}

	.clear-page-section :global(.btn-primary:hover) {
		background: #1a2030;
		border-color: #1a2030;
		box-shadow: none;
	}

	.clear-page-section :global(.btn-primary:active) {
		transform: scale(0.97);
	}

	.clear-page-section :global(.btn-secondary) {
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		border-color: var(--color-clear-border, #e1e1e1);
	}

	.clear-page-section :global(.btn-secondary:hover) {
		background: var(--color-clear-onyx, #0a0e19);
		border-color: var(--color-clear-onyx, #0a0e19);
		color: #ffffff;
	}

	@media (max-width: 980px) {
		.clear-page-section--split .clear-page-section__layout {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.clear-page-section--hero .clear-page-section__title {
			font-size: 4rem;
		}
	}

	@media (max-width: 640px) {
		.clear-page-section {
			padding-block: 2.75rem;
			scroll-margin-top: 4.9rem;
		}

		.clear-page-section--hero {
			padding-block: 2.5rem 2.75rem;
		}

		.clear-page-section__inner {
			width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
		}

		.clear-page-section__title {
			font-size: 2.35rem;
			line-height: 1.04;
		}

		.clear-page-section--hero .clear-page-section__title {
			max-width: 11ch;
			font-size: 2.95rem;
			line-height: 1;
		}

		.clear-page-section__description,
		.clear-page-section--hero .clear-page-section__description {
			font-size: 1rem;
			line-height: 1.56;
		}

		.clear-page-section__actions :global(.btn) {
			width: 100%;
		}
	}
</style>
