<script lang="ts">
	import type { Snippet } from 'svelte';

	type ClearSectionVariant = 'hero' | 'porcelain' | 'white' | 'soft';
	type ClearSectionLayout = 'stack' | 'split';
	type ClearHeadingLevel = 'h1' | 'h2' | 'h3';
	type ClearSectionDensity = 'standard' | 'compact';

	interface Props {
		id?: string;
		eyebrow?: string;
		title?: string;
		description?: string;
		titleLevel?: ClearHeadingLevel;
		variant?: ClearSectionVariant;
		layout?: ClearSectionLayout;
		density?: ClearSectionDensity;
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
		density = 'standard',
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

<section {id} class={sectionClass} data-density={density} aria-label={ariaLabel}>
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
		position: relative;
		isolation: isolate;
		overflow: clip;
		color: var(--color-performance-ink, #090909);
		background: var(--color-performance-paper, #f3f3f0);
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
		padding-block: 4.5rem;
		scroll-margin-top: 5.25rem;
	}

	.clear-page-section[data-density='compact'] {
		padding-block: 3rem;
	}

	.clear-page-section[data-density='compact'] .clear-page-section__after {
		margin-top: 2rem;
	}

	.clear-page-section--hero {
		padding-block: 5.35rem 4rem;
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 4.25rem 4.25rem,
			linear-gradient(180deg, var(--color-performance-panel, #ffffff) 0%, #fbfbfb 100%);
	}

	.clear-page-section--white {
		background: var(--color-performance-panel, #ffffff);
	}

	.clear-page-section--soft {
		background: var(--color-performance-paper, #f3f3f0);
	}

	.clear-page-section__inner {
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
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
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.76rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.clear-page-section__title {
		margin: 0;
		color: var(--color-performance-ink, #090909);
		font-family: var(
			--font-performance-display,
			var(--font-performance-display, var(--font-performance-sans))
		);
		font-size: 3.1rem;
		font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500));
		font-kerning: normal;
		font-feature-settings:
			'kern' 1,
			'liga' 1;
		line-height: 1;
		letter-spacing: var(--tracking-performance-display, -0.03em);
		text-wrap: balance;
	}

	.clear-page-section--hero .clear-page-section__title {
		max-width: 13ch;
		font-size: 5.45rem;
		font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500));
		line-height: var(--leading-performance-display, 0.94);
	}

	.clear-page-section__description {
		margin: 0;
		max-width: 42rem;
		color: var(--color-performance-muted, #5e6268);
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
		border-radius: var(--radius-performance-sm, 4px);
		letter-spacing: 0;
		box-shadow: none;
	}

	.clear-page-section :global(.btn-primary) {
		background: var(--color-performance-ink, #090909);
		border-color: var(--color-performance-ink, #090909);
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
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		border-color: var(--color-performance-line, #d7d7d2);
	}

	.clear-page-section :global(.btn-secondary:hover) {
		background: var(--color-performance-ink, #090909);
		border-color: var(--color-performance-ink, #090909);
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

		.clear-page-section__title {
			font-size: 2.75rem;
		}
	}

	@media (max-width: 640px) {
		.clear-page-section {
			padding-block: 2.75rem;
			scroll-margin-top: 4.9rem;
		}

		.clear-page-section[data-density='compact'] {
			padding-block: 2.25rem;
		}

		.clear-page-section[data-density='compact'] .clear-page-section__after {
			margin-top: 1.5rem;
		}

		.clear-page-section--hero {
			padding-block: 2.5rem 2.75rem;
		}

		.clear-page-section__inner {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
		}

		.clear-page-section__title {
			font-size: 2.35rem;
			line-height: 1.04;
		}

		.clear-page-section--hero .clear-page-section__title {
			max-width: 12ch;
			font-size: 2.9rem;
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
