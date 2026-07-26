<script lang="ts">
	import type { Snippet } from 'svelte';

	export type PerformanceHandoffState = 'draft' | 'review' | 'ready' | 'stop';
	export type PerformanceHandoffArtifactPlacement = 'sidecar' | 'full-width';
	export interface PerformanceHandoff {
		owner: string;
		authority: string;
		proof: string;
		state: PerformanceHandoffState;
	}
	export interface PerformanceHandoffStep {
		label: string;
		title: string;
		detail: string;
	}

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		handoff: PerformanceHandoff;
		steps?: PerformanceHandoffStep[];
		artifactPlacement?: PerformanceHandoffArtifactPlacement;
		headingLevel?: 'h1' | 'h2';
		actions?: Snippet;
		aside?: Snippet;
		ariaLabel?: string;
		density?: 'standard' | 'compact';
	}

	let {
		eyebrow = 'Conversion handoff',
		title,
		description,
		handoff,
		steps = [],
		artifactPlacement = 'sidecar',
		headingLevel = 'h2',
		actions,
		aside,
		ariaLabel = eyebrow,
		density = 'standard'
	}: Props = $props();
</script>

<section
	class="performance-conversion-handoff"
	data-state={handoff.state}
	data-artifact-placement={artifactPlacement}
	data-density={density}
	aria-label={ariaLabel}
>
	<div class="performance-conversion-handoff__copy">
		<span class="performance-conversion-handoff__eyebrow">{eyebrow}</span>
		<svelte:element this={headingLevel}>{title}</svelte:element>
		{#if description}<p>{description}</p>{/if}
		{#if actions}<div class="performance-conversion-handoff__actions">{@render actions()}</div>{/if}
	</div>

	<div class="performance-conversion-handoff__boundary">
		<dl>
			<div><dt>Owner</dt><dd>{handoff.owner}</dd></div>
			<div><dt>Authority</dt><dd>{handoff.authority}</dd></div>
			<div><dt>Proof</dt><dd>{handoff.proof}</dd></div>
			<div><dt>State</dt><dd>{handoff.state}</dd></div>
		</dl>
		{#if steps.length > 0}
			<ol class="performance-conversion-handoff__steps" aria-label="Handoff steps">
				{#each steps as step, index}
					<li class="performance-conversion-handoff__step">
						<span>{String(index + 1).padStart(2, '0')} / {step.label}</span>
						<strong>{step.title}</strong>
						<p>{step.detail}</p>
					</li>
				{/each}
			</ol>
		{/if}
		{#if aside && artifactPlacement === 'sidecar'}
			<div class="performance-conversion-handoff__aside">{@render aside()}</div>
		{/if}
	</div>

	{#if aside && artifactPlacement === 'full-width'}
		<div class="performance-conversion-handoff__artifact">{@render aside()}</div>
	{/if}
</section>

<style>
	.performance-conversion-handoff {
		--handoff-accent: var(--color-performance-muted, #6b7280);
		display: grid;
		grid-template-columns: minmax(0, 1.18fr) minmax(20rem, 0.82fr);
		border-block: 1px solid var(--color-performance-ink, #090909);
		background: var(--color-performance-ink, #090909);
		color: #fff;
	}

	.performance-conversion-handoff[data-state='ready'] { --handoff-accent: var(--color-performance-growth, #007a4d); }
	.performance-conversion-handoff[data-state='review'] { --handoff-accent: var(--color-performance-pressure, #e54800); }
	.performance-conversion-handoff[data-state='stop'] { --handoff-accent: var(--color-performance-risk, #c62026); }
	.performance-conversion-handoff[data-density='compact'] .performance-conversion-handoff__copy,
	.performance-conversion-handoff[data-density='compact'] .performance-conversion-handoff__boundary { padding: clamp(1.75rem, 4vw, 3.75rem); }
	.performance-conversion-handoff[data-density='compact'] .performance-conversion-handoff__copy { min-height: clamp(20rem, 34vw, 30rem); }
	.performance-conversion-handoff[data-density='compact'] :is(h1, h2) { font-size: clamp(2.75rem, 4.6vw, 4.6rem); }

	.performance-conversion-handoff__copy,
	.performance-conversion-handoff__boundary { padding: clamp(2rem, 6vw, 6rem); }
	.performance-conversion-handoff__copy { display: grid; align-content: center; justify-items: start; gap: 1rem; min-height: clamp(28rem, 50vw, 43rem); background: linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 4rem 4rem, linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 4rem 4rem; }
	.performance-conversion-handoff__eyebrow,
	.performance-conversion-handoff dt { font-family: var(--font-performance-mono); font-size: 0.72rem; font-weight: var(--font-performance-semibold, 600); text-transform: uppercase; }
	.performance-conversion-handoff__eyebrow { padding: 0.42rem 0.62rem; border: 1px solid rgba(255,255,255,.44); }
	.performance-conversion-handoff :is(h1, h2) { max-width: 13ch; margin: 0; font-family: var(--font-performance-display, var(--font-performance-sans)); font-size: clamp(3rem, 6vw, 6rem); font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500)); font-kerning: normal; font-feature-settings: "kern" 1, "liga" 1; letter-spacing: var(--tracking-performance-display, -0.03em); line-height: var(--leading-performance-display, 0.94); text-wrap: balance; }
	.performance-conversion-handoff__copy p { max-width: 40rem; margin: 0; color: rgba(255,255,255,.7); font-size: 1.08rem; line-height: 1.5; }
	.performance-conversion-handoff__actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.75rem; }
	.performance-conversion-handoff__boundary { display: grid; align-content: space-between; gap: 3rem; border-left: 1px solid rgba(255,255,255,.32); background: color-mix(in srgb, var(--handoff-accent) 18%, #090909); }
	.performance-conversion-handoff dl { margin: 0; border-top: 4px solid var(--handoff-accent); }
	.performance-conversion-handoff dl > div { display: grid; grid-template-columns: minmax(6rem, .65fr) minmax(0, 1.35fr); gap: 1rem; padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,.3); }
	.performance-conversion-handoff dt { color: rgba(255,255,255,.58); }
	.performance-conversion-handoff dd { margin: 0; font-size: 0.92rem; }
	.performance-conversion-handoff__steps { display: grid; gap: .65rem; margin: 0; padding: 0; list-style: none; }
	.performance-conversion-handoff__step { display: grid; gap: .35rem; padding: .85rem 0; border-bottom: 1px solid rgba(255,255,255,.3); }
	.performance-conversion-handoff__step > span { color: rgba(255,255,255,.58); font-family: var(--font-performance-mono); font-size: .72rem; text-transform: uppercase; }
	.performance-conversion-handoff__step strong { font-size: 1rem; font-weight: var(--font-performance-medium, 500); }
	.performance-conversion-handoff__step p { margin: 0; color: rgba(255,255,255,.7); font-size: .86rem; line-height: 1.4; }
	.performance-conversion-handoff__aside { min-width: 0; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,.3); }
	.performance-conversion-handoff__artifact { min-width: 0; padding: clamp(1.25rem, 3vw, 3rem) clamp(2rem, 6vw, 6rem) clamp(2rem, 5vw, 5rem); border-top: 1px solid rgba(255,255,255,.32); background: color-mix(in srgb, var(--handoff-accent) 18%, #090909); }

	.performance-conversion-handoff[data-artifact-placement='full-width'] {
		grid-template-areas:
			'copy boundary'
			'artifact artifact';
		grid-template-columns: minmax(0, 1.35fr) minmax(20rem, .65fr);
	}
	.performance-conversion-handoff[data-artifact-placement='full-width'] .performance-conversion-handoff__copy { grid-area: copy; min-height: auto; padding-block: clamp(3.5rem, 7vw, 6rem); }
	.performance-conversion-handoff[data-artifact-placement='full-width'] .performance-conversion-handoff__boundary { grid-area: boundary; align-content: center; }
	.performance-conversion-handoff[data-artifact-placement='full-width'] .performance-conversion-handoff__artifact { grid-area: artifact; }
	.performance-conversion-handoff[data-artifact-placement='full-width'] :is(h1, h2) { max-width: 12ch; font-size: clamp(3rem, 5.4vw, 5.5rem); }
	.performance-conversion-handoff[data-artifact-placement='full-width'][data-density='compact'] .performance-conversion-handoff__copy { padding-block: clamp(2.5rem, 5vw, 4rem); }
	.performance-conversion-handoff[data-artifact-placement='full-width'][data-density='compact'] :is(h1, h2) { font-size: clamp(2.75rem, 4.6vw, 4.6rem); }

	@media (max-width: 50rem) {
		.performance-conversion-handoff { grid-template-columns: 1fr; }
		.performance-conversion-handoff__boundary { border-top: 1px solid rgba(255,255,255,.32); border-left: 0; }
		.performance-conversion-handoff[data-artifact-placement='full-width'] {
			grid-template-areas: 'copy' 'boundary' 'artifact';
			grid-template-columns: 1fr;
		}
		.performance-conversion-handoff[data-artifact-placement='full-width'] .performance-conversion-handoff__copy { padding-block: clamp(3rem, 12vw, 5rem); }
		.performance-conversion-handoff[data-artifact-placement='full-width'][data-density='compact'] .performance-conversion-handoff__copy { padding-block: 2.25rem; }
		.performance-conversion-handoff[data-artifact-placement='full-width'][data-density='compact'] .performance-conversion-handoff__artifact { padding: 0.75rem 0.75rem 1.5rem; }
	}
</style>
