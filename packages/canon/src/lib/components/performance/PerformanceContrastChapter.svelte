<script lang="ts">
	import type { Snippet } from 'svelte';

	export type PerformanceContrastMode = 'ink-to-paper' | 'paper-to-ink';
	export type PerformanceContrastArtifactPlacement = 'inline' | 'full-width';
	export interface PerformanceIntervention {
		label: string;
		title: string;
		detail: string;
	}

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		intervention: PerformanceIntervention;
		mode?: PerformanceContrastMode;
		artifactPlacement?: PerformanceContrastArtifactPlacement;
		artifact?: Snippet;
		ariaLabel?: string;
		density?: 'standard' | 'compact';
	}

	let {
		eyebrow = 'Performance principle',
		title,
		description,
		intervention,
		mode = 'ink-to-paper',
		artifactPlacement = 'inline',
		artifact,
		ariaLabel = eyebrow,
		density = 'standard'
	}: Props = $props();
</script>

<section
	class="performance-contrast-chapter"
	data-mode={mode}
	data-artifact-placement={artifactPlacement}
	data-density={density}
	aria-label={ariaLabel}
>
	<header class="performance-contrast-chapter__principle">
		<span>{eyebrow}</span>
		<div>
			<h2>{title}</h2>
			{#if description}<p>{description}</p>{/if}
		</div>
	</header>
	<div class="performance-contrast-chapter__intervention">
		<div class="performance-contrast-chapter__copy">
			<span>{intervention.label}</span>
			<h3>{intervention.title}</h3>
			<p>{intervention.detail}</p>
		</div>
		{#if artifact && artifactPlacement === 'inline'}
			<div class="performance-contrast-chapter__artifact">{@render artifact()}</div>
		{/if}
	</div>
	{#if artifact && artifactPlacement === 'full-width'}
		<div class="performance-contrast-chapter__artifact performance-contrast-chapter__artifact--full-width">
			{@render artifact()}
		</div>
	{/if}
</section>

<style>
	.performance-contrast-chapter {
		display: grid;
		grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
		min-height: clamp(34rem, 66vw, 50rem);
		border-block: 1px solid var(--color-performance-ink, #090909);
	}

	.performance-contrast-chapter[data-density='compact'] {
		min-height: clamp(30rem, 56vw, 44rem);
	}

	.performance-contrast-chapter__principle,
	.performance-contrast-chapter__intervention {
		padding: clamp(1.5rem, 4vw, 4rem);
	}

	.performance-contrast-chapter__principle {
		display: grid;
		align-content: space-between;
		gap: 4rem;
		background: var(--color-performance-ink, #090909);
		color: #fff;
	}

	.performance-contrast-chapter__intervention {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: clamp(2rem, 5vw, 5rem);
		background:
			linear-gradient(90deg, rgba(9, 9, 9, 0.06) 1px, transparent 1px) 0 0 / 3rem 3rem,
			linear-gradient(rgba(9, 9, 9, 0.06) 1px, transparent 1px) 0 0 / 3rem 3rem,
			var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.performance-contrast-chapter[data-mode='paper-to-ink'] .performance-contrast-chapter__principle {
		order: 2;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.performance-contrast-chapter[data-mode='paper-to-ink'] .performance-contrast-chapter__intervention {
		background: var(--color-performance-ink, #090909);
		color: #fff;
	}

	.performance-contrast-chapter span {
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-semibold, 600);
		text-transform: uppercase;
	}

	.performance-contrast-chapter h2 {
		max-width: 11ch;
		margin: 0;
		font-family: var(--font-performance-display, var(--font-performance-display, var(--font-performance-sans)));
		font-size: clamp(3rem, 6vw, 6rem);
		font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500));
		font-kerning: normal;
		font-feature-settings: "kern" 1, "liga" 1;
		letter-spacing: var(--tracking-performance-display, -0.03em);
		line-height: var(--leading-performance-display, 0.94);
		text-wrap: balance;
	}

	.performance-contrast-chapter h3 { max-width: 15ch; margin: 0; font-family: var(--font-performance-display, var(--font-performance-display, var(--font-performance-sans))); font-size: clamp(2rem, 4vw, 4rem); font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500)); font-kerning: normal; font-feature-settings: "kern" 1, "liga" 1; letter-spacing: var(--tracking-performance-display, -0.03em); line-height: var(--leading-performance-display, 0.94); text-wrap: balance; }
	.performance-contrast-chapter p { max-width: 38rem; margin: 0.85rem 0 0; color: currentColor; opacity: 0.68; line-height: 1.5; }
	.performance-contrast-chapter__copy { display: grid; align-content: start; gap: 0.5rem; }
	.performance-contrast-chapter__artifact { align-self: end; min-width: 0; border-top: 1px solid currentColor; padding-top: 1.25rem; }
	.performance-contrast-chapter__artifact--full-width {
		grid-column: 1 / -1;
		align-self: stretch;
		border-top: 1px solid var(--color-performance-ink, #090909);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		padding: clamp(1rem, 2.4vw, 2rem);
	}

	.performance-contrast-chapter[data-mode='paper-to-ink'] .performance-contrast-chapter__artifact--full-width {
		border-color: var(--color-performance-panel, #fff);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	@media (max-width: 48rem) {
		.performance-contrast-chapter { grid-template-columns: 1fr; }
		.performance-contrast-chapter__principle { min-height: 29rem; }
		.performance-contrast-chapter[data-density='compact'] .performance-contrast-chapter__principle { min-height: 20rem; }
		.performance-contrast-chapter[data-density='compact'] .performance-contrast-chapter__principle,
		.performance-contrast-chapter[data-density='compact'] .performance-contrast-chapter__intervention { padding: 1.25rem; }
		.performance-contrast-chapter[data-mode='paper-to-ink'] .performance-contrast-chapter__principle { order: initial; }
	}
</style>
