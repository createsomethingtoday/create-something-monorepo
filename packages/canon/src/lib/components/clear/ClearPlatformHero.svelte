<script lang="ts">
 import SceneLead from "../background/SceneLead.svelte";
  import BackgroundScene from "../background/BackgroundScene.svelte";
  import type { CanonBackgroundScene } from "../background/scene.js";
	import type { Snippet } from 'svelte';

	export interface ClearPlatformHeroProof {
		value: string;
		label: string;
	}

	export interface ClearPlatformHeroMeta {
		label: string;
		value: string;
	}

	interface Props {
    /** Optional full-section scene. Essential copy stays in HTML. */
    background?: CanonBackgroundScene;
		id?: string;
		eyebrow?: string;
		title: string;
		description?: string;
		proofItems?: ClearPlatformHeroProof[];
		metaItems?: ClearPlatformHeroMeta[];
		ariaLabel?: string;
		hideAsideOnMobile?: boolean;
		actions?: Snippet;
		aside?: Snippet;
	}

	let {
    background,		id,
		eyebrow,
		title,
		description,
		proofItems = [],
		metaItems = [],
		ariaLabel,
		hideAsideOnMobile = false,
		actions,
		aside
	}: Props = $props();
</script>

<section data-background={background ? "scene" : undefined} {id} class="clear-platform-hero" aria-label={ariaLabel}>
 {#if background}
 <SceneLead scene={background}>
  {#if eyebrow}<span data-scene-eyebrow>{eyebrow}</span>{/if}<h1>{title}</h1>
  {#if description}<p>{description}</p>{/if}
  {#if actions}<div data-scene-actions>{@render actions()}</div>{/if}
 </SceneLead>
 <div class="canon-scene-details">				{#if metaItems.length}
					<div class="clear-platform-hero__meta" aria-label="Platform metadata">
						{#each metaItems as item}
							<span>
								<small>{item.label}</small>
								<strong>{item.value}</strong>
							</span>
						{/each}
					</div>
				{/if}			{#if aside}
				<div
					class="clear-platform-hero__aside"
					class:clear-platform-hero__aside--hide-mobile={hideAsideOnMobile}
				>
					{@render aside()}
				</div>
			{/if}		{#if proofItems.length}
			<div class="clear-platform-hero__proof" aria-label="Platform proof">
				{#each proofItems as item}
					<article>
						<strong>{item.value}</strong>
						<span>{item.label}</span>
					</article>
				{/each}
			</div>
		{/if}</div>
 {:else}
  {#if background}<BackgroundScene scene={background}/>{/if}
	<div class="clear-platform-hero__inner">
		<div class="clear-platform-hero__layout">
			<div class="clear-platform-hero__copy">
				{#if eyebrow}
					<span class="clear-platform-hero__kicker">{eyebrow}</span>
				{/if}

				<h1>{title}</h1>

				{#if description}
					<p>{description}</p>
				{/if}

				{#if actions}
					<div class="clear-platform-hero__actions">
						{@render actions()}
					</div>
				{/if}

				{#if metaItems.length}
					<div class="clear-platform-hero__meta" aria-label="Platform metadata">
						{#each metaItems as item}
							<span>
								<small>{item.label}</small>
								<strong>{item.value}</strong>
							</span>
						{/each}
					</div>
				{/if}
			</div>

			{#if aside}
				<div
					class="clear-platform-hero__aside"
					class:clear-platform-hero__aside--hide-mobile={hideAsideOnMobile}
				>
					{@render aside()}
				</div>
			{/if}
		</div>

		{#if proofItems.length}
			<div class="clear-platform-hero__proof" aria-label="Platform proof">
				{#each proofItems as item}
					<article>
						<strong>{item.value}</strong>
						<span>{item.label}</span>
					</article>
				{/each}
			</div>
		{/if}
	</div>
{/if}
</section>

<style>
	.clear-platform-hero {
		position: relative;
		isolation: isolate;
		overflow: clip;
		padding-block: 2.5rem 1.25rem;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
		background:var(--color-performance-paper);
		color: var(--color-performance-ink, #090909);
	}

	.clear-platform-hero__inner {
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
	}

	.clear-platform-hero__layout {
		display: grid;
		grid-template-columns: minmax(0, 1.02fr) minmax(22rem, 0.78fr);
		gap: clamp(2rem, 6vw, 5.2rem);
		align-items: center;
	}

	.clear-platform-hero__copy {
		display: grid;
		gap: 1rem;
	}

	.clear-platform-hero__kicker {
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
		font-size: 0.875rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: none;
	}

	.clear-platform-hero h1 {
		margin: 0;
		max-width: 13ch;
		color: var(--color-performance-ink, #090909);
		font-size: 5.45rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 0.98;
		text-wrap: balance;
	}

	.clear-platform-hero p {
		margin: 0;
		max-width: 40rem;
		color: var(--color-performance-muted, #5e6268);
		font-size: 1.14rem;
		line-height: 1.55;
		text-wrap: pretty;
	}

	.clear-platform-hero__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		padding-top: 0.15rem;
	}

	.clear-platform-hero__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		max-width: 41rem;
		padding-top: 0.15rem;
	}

	.clear-platform-hero__meta span {
		display: grid;
		gap: 0.18rem;
		min-width: min(100%, 9.5rem);
		padding: 0.62rem 0.72rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: rgba(255, 255, 255, 0.72);
	}

	.clear-platform-hero__meta small {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.875rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 1.12;
		text-transform: none;
	}

	.clear-platform-hero__meta strong {
		color: var(--color-performance-ink, #090909);
		font-size: 0.92rem;
		font-weight: var(--font-performance-medium);
		line-height: 1.2;
	}

	.clear-platform-hero__aside {
		min-width: 0;
	}

	.clear-platform-hero__proof {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.clear-platform-hero__proof article {
		position: relative;
		overflow: hidden;
		display: grid;
		gap: 0.34rem;
		min-height: 5.2rem;
		align-content: center;
		padding: 0.9rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: var(--radius-performance-sm, 4px);
		background: var(--color-performance-panel, #ffffff);
	}

	.clear-platform-hero__proof article::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 0.22rem;
		background: var(--hero-proof-accent, var(--color-performance-signal-soft, #dce8f5));
	}

	.clear-platform-hero__proof article:nth-child(2) {
		--hero-proof-accent: var(--color-performance-growth-soft, #dcece5);
	}

	.clear-platform-hero__proof article:nth-child(3) {
		--hero-proof-accent: var(--color-performance-pressure-soft, #f7e2d7);
	}

	.clear-platform-hero__proof article:nth-child(4) {
		--hero-proof-accent: var(--color-performance-growth-soft, #dcece5);
	}

	.clear-platform-hero__proof strong {
		color: var(--color-performance-ink, #090909);
		font-family: var(--font-performance-mono);
		font-size: 0.95rem;
		font-weight: var(--font-performance-medium);
		letter-spacing: 0;
		line-height: 1.15;
	}

	.clear-platform-hero__proof span {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.875rem;
		line-height: 1.35;
	}

	.clear-platform-hero :global(.btn) {
		border-radius: var(--radius-performance-sm, 4px);
		letter-spacing: 0;
		box-shadow: none;
	}

	.clear-platform-hero :global(.btn-primary) {
		background: var(--color-performance-ink, #090909);
		border-color: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel);
	}

	.clear-platform-hero :global(.btn-primary:hover) {
		background: var(--color-performance-ink);
    filter: brightness(.94);
		border-color: var(--color-performance-ink);
		box-shadow: none;
	}

	.clear-platform-hero :global(.btn-secondary) {
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		border-color: var(--color-performance-line, #d7d7d2);
	}

	.clear-platform-hero :global(.btn-secondary:hover) {
		background: var(--color-performance-ink, #090909);
		border-color: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel);
	}

	@media (max-width: 980px) {
		.clear-platform-hero__layout {
			grid-template-columns: 1fr;
			gap: 2rem;
		}

		.clear-platform-hero h1 {
			font-size: 4rem;
		}

		.clear-platform-hero__proof {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.clear-platform-hero {
			padding-block: 2.5rem 2.75rem;
		}

		.clear-platform-hero__inner {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
		}

		.clear-platform-hero h1 {
			max-width: 12ch;
			font-size: 2.9rem;
			line-height: 1;
		}

		.clear-platform-hero p {
			font-size: 1rem;
			line-height: 1.56;
		}

		.clear-platform-hero__actions :global(.btn) {
			width: 100%;
		}

		.clear-platform-hero__aside--hide-mobile {
			display: none;
		}

		.clear-platform-hero__proof {
			grid-template-columns: 1fr;
			margin-top: 2rem;
		}
	}

  .clear-platform-hero {position:relative;isolation:isolate;}
  .clear-platform-hero > :global(.canon-background-scene) {z-index:-1;}
  .clear-platform-hero[data-background="scene"]{background:var(--color-performance-paper);min-height:36rem;padding-block:4rem;}
  .clear-platform-hero__meta span{background:var(--color-performance-panel);}
  @media(max-width:47.99rem){.clear-platform-hero[data-background="scene"]{padding-top:15rem;}.clear-platform-hero h1{overflow-wrap:anywhere;}}

 /* Authored scene lead and dense records are separate layout regions. */
 .clear-platform-hero[data-background="scene"]{display:block;grid-template-columns:none;grid-template-rows:none;min-height:0;width:100%;padding:0;background:var(--color-performance-paper);}
 .canon-scene-details{position:relative;display:grid;gap:1.5rem;padding:clamp(1.25rem,4vw,3rem);background:var(--color-performance-paper);color:var(--color-performance-ink);border-top:1px solid var(--color-performance-line);}
 .canon-scene-details .clear-platform-hero__proof{margin:0;}
</style>
