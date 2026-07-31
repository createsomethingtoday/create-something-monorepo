<script lang="ts">
	export type PerformanceConditionTone = 'neutral' | 'signal' | 'pressure' | 'growth' | 'risk';
	export type PerformanceThesisMode = 'paper' | 'ink';

	export interface PerformanceCondition {
		label: string;
		title: string;
		detail: string;
		tone?: PerformanceConditionTone;
	}

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		conditions: PerformanceCondition[];
		mode?: PerformanceThesisMode;
		headingLevel?: 'h1' | 'h2';
		ariaLabel?: string;
	}

	let {
		eyebrow = 'Performance thesis',
		title,
		description,
		conditions,
		mode = 'paper',
		headingLevel = 'h2',
		ariaLabel = eyebrow
	}: Props = $props();
</script>

<section class="performance-thesis-conditions" data-mode={mode} aria-label={ariaLabel}>
	<header class="performance-thesis-conditions__thesis">
		<span>{eyebrow}</span>
		<svelte:element this={headingLevel} class="performance-thesis-conditions__title">{title}</svelte:element>
		{#if description}<p>{description}</p>{/if}
	</header>
	<div class="performance-thesis-conditions__conditions" aria-label="Operating conditions">
		{#each conditions as condition, index}
			<article class="performance-thesis-conditions__condition" data-tone={condition.tone ?? 'neutral'}>
				<span>{String(index + 1).padStart(2, '0')} / {condition.label}</span>
				<strong>{condition.title}</strong>
				<p>{condition.detail}</p>
			</article>
		{/each}
	</div>
</section>

<style>
	.performance-thesis-conditions {
		--condition-accent: var(--color-performance-ink, #090909);
		container-type: inline-size;
		display: grid;
		grid-template-columns: minmax(19rem, 0.9fr) minmax(0, 1.4fr);
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin: clamp(1.25rem, 4vw, 4rem) auto;
		border: 1px solid var(--color-performance-line-strong, #a9aaa5);
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.performance-thesis-conditions[data-mode='ink'] {
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	.performance-thesis-conditions__thesis {
		display: grid;
		align-content: space-between;
		gap: clamp(2rem, 7vw, 6rem);
		min-height: 26rem;
		padding: clamp(1.25rem, 3vw, 2.5rem);
		border-right: 1px solid currentColor;
		background:
			linear-gradient(90deg, color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px) 0 0 / 3rem 3rem,
			linear-gradient(color-mix(in srgb, currentColor 7%, transparent) 1px, transparent 1px) 0 0 / 3rem 3rem;
	}

	.performance-thesis-conditions__thesis > span,
	.performance-thesis-conditions__condition > span {
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-semibold, 600);
		line-height: 1.25;
		text-transform: uppercase;
	}

	.performance-thesis-conditions__title {
		max-width: 13ch;
		margin: 0;
		font-family: var(--font-performance-display, var(--font-performance-display, var(--font-performance-sans)));
		font-size: clamp(2.5rem, 5.4vw, 5.25rem);
		font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500));
		font-kerning: normal;
		font-feature-settings: "kern" 1, "liga" 1;
		letter-spacing: var(--tracking-performance-display, -0.03em);
		line-height: var(--leading-performance-display, 0.94);
		text-wrap: balance;
	}

	.performance-thesis-conditions p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		line-height: 1.45;
	}

	.performance-thesis-conditions[data-mode='ink'] p { color: rgba(255, 255, 255, 0.67); }

	.performance-thesis-conditions__conditions {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.performance-thesis-conditions__condition {
		position: relative;
		display: grid;
		align-content: space-between;
		gap: 1.5rem;
		min-height: 13rem;
		padding: 1.25rem;
		border-bottom: 1px solid currentColor;
		border-right: 1px solid currentColor;
	}

	.performance-thesis-conditions__condition::before {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: 4px;
		background: var(--condition-accent);
	}

	.performance-thesis-conditions__condition[data-tone='signal'] { --condition-accent: var(--color-performance-signal, #0057b8); }
	.performance-thesis-conditions__condition[data-tone='pressure'] { --condition-accent: var(--color-performance-pressure, #e54800); }
	.performance-thesis-conditions__condition[data-tone='growth'] { --condition-accent: var(--color-performance-growth, #007a4d); }
	.performance-thesis-conditions__condition[data-tone='risk'] { --condition-accent: var(--color-performance-risk, #c62026); }

	.performance-thesis-conditions__condition strong {
		max-width: 18ch;
		font-size: clamp(1.25rem, 2.2vw, 2rem);
		font-weight: var(--font-performance-medium, 500);
		line-height: 1.05;
	}

	.performance-thesis-conditions__condition p { max-width: 28ch; font-size: 0.88rem; }

	@container (max-width: 64rem) {
		.performance-thesis-conditions__thesis {
			gap: clamp(1.5rem, 3.5cqi, 2.5rem);
		}

		.performance-thesis-conditions__title {
			font-size: clamp(2.5rem, 5cqi, 3.5rem);
		}
	}

	@media (max-width: 50rem) {
		.performance-thesis-conditions { grid-template-columns: 1fr; }
		.performance-thesis-conditions__thesis { min-height: 22rem; border-right: 0; border-bottom: 1px solid currentColor; }
	}

	@media (max-width: 35rem) {
		.performance-thesis-conditions { width: 100%; border-inline: 0; }
		.performance-thesis-conditions__conditions { grid-template-columns: 1fr; }
	}
</style>
