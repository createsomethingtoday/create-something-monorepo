<script lang="ts">
	import PerformanceFieldStudy, { type PerformanceFieldStudyProps } from './PerformanceFieldStudy.svelte';

	export type PerformanceFieldSequenceLayout = 'sequential' | 'sticky';
	export type PerformanceFieldSequenceItem = Omit<PerformanceFieldStudyProps, 'figure'> & { figure?: string };

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		studies: PerformanceFieldSequenceItem[];
		layout?: PerformanceFieldSequenceLayout;
		ariaLabel?: string;
	}

	let {
		eyebrow = 'Performance field sequence',
		title,
		description,
		studies,
		layout = 'sequential',
		ariaLabel = eyebrow
	}: Props = $props();
</script>

<section class="performance-field-sequence" data-layout={layout} aria-label={ariaLabel}>
	<header class="performance-field-sequence__header">
		<div>
			<span>{eyebrow}</span>
			<small>{String(studies.length).padStart(2, '0')} studies</small>
		</div>
		<div>
			<h2>{title}</h2>
			{#if description}<p>{description}</p>{/if}
		</div>
	</header>

	<div class="performance-field-sequence__studies">
		{#each studies as study, index}
			<div class="performance-field-sequence__study">
				<PerformanceFieldStudy
					{...study}
					figure={study.figure ?? String(index + 1).padStart(2, '0')}
					mediaSide={study.mediaSide ?? (index % 2 === 0 ? 'left' : 'right')}
				/>
			</div>
		{/each}
	</div>
</section>

<style>
	.performance-field-sequence {
		padding-block: clamp(3rem, 7vw, 7rem);
		border-block: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.performance-field-sequence__header {
		display: grid;
		grid-template-columns: minmax(13rem, 0.55fr) minmax(0, 1.45fr);
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin: 0 auto clamp(2rem, 5vw, 5rem);
		border: 1px solid var(--color-performance-line-strong, #a9aaa5);
		background: var(--color-performance-panel, #fff);
	}

	.performance-field-sequence__header > div {
		display: grid;
		align-content: space-between;
		gap: 2rem;
		min-height: 11rem;
		padding: 1.25rem;
	}

	.performance-field-sequence__header > div:first-child {
		border-right: 1px solid var(--color-performance-line-strong, #a9aaa5);
		background: var(--color-performance-ink, #090909);
		color: #fff;
	}

	.performance-field-sequence__header span,
	.performance-field-sequence__header small {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-semibold, 600);
		text-transform: uppercase;
	}

	.performance-field-sequence__header small { color: rgba(255, 255, 255, 0.58); }
	.performance-field-sequence__header h2 { max-width: 17ch; margin: 0; font-family: var(--font-performance-display, var(--font-display, var(--font-sans))); font-size: clamp(2rem, 4vw, 4rem); font-weight: var(--font-performance-display-weight, var(--font-medium, 500)); font-kerning: normal; font-feature-settings: "kern" 1, "liga" 1; letter-spacing: var(--tracking-performance-display, -0.03em); line-height: var(--leading-performance-display, 0.94); text-wrap: balance; }
	.performance-field-sequence__header p { max-width: 44rem; margin: 0; color: var(--color-performance-muted, #5e6268); line-height: 1.45; }
	.performance-field-sequence__studies { display: grid; gap: clamp(1.5rem, 4vw, 4rem); }
	.performance-field-sequence__study { min-width: 0; }
	.performance-field-sequence__study :global(.performance-field-study) { margin-block: 0; }

	@media (min-width: 64rem) and (prefers-reduced-motion: no-preference) {
		.performance-field-sequence[data-layout='sticky'] .performance-field-sequence__study { position: sticky; top: 1.5rem; }
	}

	@media (max-width: 42rem) {
		.performance-field-sequence__header { grid-template-columns: 1fr; }
		.performance-field-sequence__header > div { min-height: 0; }
		.performance-field-sequence__header > div:first-child { border-right: 0; border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); }
	}
</style>
