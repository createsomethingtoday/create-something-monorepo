<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import PerformancePaperStudioCanvas from './PerformancePaperStudioCanvas.svelte';
	import type { PerformanceMediaVideo } from './media/types';
	import type { PerformancePaperProperty } from './media/paper-studio';

	export type PerformanceCampaignOpeningMode = 'ink' | 'paper';
	export type PerformanceCampaignOpeningDensity = 'standard' | 'compact';
	export type PerformanceCampaignOpeningArtifactLayer = 'above-content' | 'behind-content';

	export type PerformanceCampaignVideo = PerformanceMediaVideo;

	export interface PerformanceCampaignMedia {
		src: string;
		mobileSrc?: string;
		alt: string;
		material?: 'paper' | 'water';
		width?: number;
		height?: number;
		objectPosition?: string;
		colorMode?: 'monochrome' | 'natural';
		video?: PerformanceCampaignVideo;
		studioShot?: PerformancePaperProperty;
		paperObjectVisible?: boolean;
	}

	export interface PerformanceCampaignProof {
		label: string;
		value: string;
	}

	interface Props {
		eyebrow: string;
		title: string;
		lede?: string;
		media: PerformanceCampaignMedia;
		proof?: PerformanceCampaignProof[];
		mode?: PerformanceCampaignOpeningMode;
		density?: PerformanceCampaignOpeningDensity;
		priority?: boolean;
		/** Marks this opening as the point before which mobile search stays out of the way. */
		mobileSearchBoundary?: boolean;
		actions?: Snippet;
		artifact?: Snippet;
		artifactLayer?: PerformanceCampaignOpeningArtifactLayer;
		/** A small, non-interactive annotation that should not change campaign layout. */
		ornament?: Snippet;
		artifactOwnsMedia?: boolean;
	}

	let {
		eyebrow,
		title,
		lede,
		media,
		proof = [],
		mode = 'ink',
		density = 'standard',
		priority = true,
		mobileSearchBoundary = false,
		actions,
		artifactLayer = 'above-content',
		artifact,
		ornament,
		artifactOwnsMedia = false
	}: Props = $props();

	let motionAllowed = $state(false);
	let studioReady = $state(false);

	onMount(() => {
		const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
		if (!reducedMotion) {
			motionAllowed = true;
			return;
		}

		const syncMotionPreference = () => {
			motionAllowed = !reducedMotion.matches;
		};

		syncMotionPreference();
		reducedMotion.addEventListener('change', syncMotionPreference);

		return () => reducedMotion.removeEventListener('change', syncMotionPreference);
	});
</script>

<section
	class="performance-campaign-opening"
	class:performance-campaign-opening--paper-studio={mode === 'paper' && Boolean(media.studioShot)}
	data-mode={mode}
	data-density={density}
	data-has-artifact={artifact ? 'true' : 'false'}
	data-artifact-layer={artifact ? artifactLayer : undefined}
	data-mobile-search-boundary={mobileSearchBoundary ? 'true' : undefined}
	aria-label={eyebrow}
>
	<figure
		class="performance-campaign-opening__media"
		class:performance-campaign-opening__media--studio-ready={studioReady}
		class:performance-campaign-opening__media--paper-object-visible={studioReady ||
			artifactOwnsMedia ||
			media.paperObjectVisible}
		data-color-mode={media.colorMode ?? 'monochrome'}
		data-material={media.material ?? 'unspecified'}
	>
		<picture class:performance-campaign-opening__fallback-suppressed={artifactOwnsMedia}>
			{#if media.mobileSrc}
				<source media="(max-width: 47.99rem)" srcset={media.mobileSrc} />
			{/if}
			<img
				src={media.src}
				alt={artifactOwnsMedia ? '' : media.alt}
				width={media.width}
				height={media.height}
				loading={priority ? 'eager' : 'lazy'}
				fetchpriority={priority ? 'high' : 'auto'}
				decoding="async"
				style:object-position={media.objectPosition ?? 'center'}
			/>
		</picture>
		{#if media.studioShot && !artifact}
			<PerformancePaperStudioCanvas
				shot={media.studioShot}
				onStateChange={(state) => (studioReady = state === 'ready')}
			/>
		{/if}
		{#if media.video && motionAllowed}
			<video
				autoplay
				muted
				loop
				playsinline
				preload="metadata"
				poster={media.video.poster ?? media.src}
				aria-hidden="true"
				style:object-position={media.objectPosition ?? 'center'}
			>
				{#if media.video.webm}
					<source src={media.video.webm} type="video/webm" />
				{/if}
				<source src={media.video.mp4} type="video/mp4" />
			</video>
		{/if}
		<div class="performance-campaign-opening__grid" aria-hidden="true"></div>
	</figure>

	<div class="performance-campaign-opening__content">
		<header>
			<span class="performance-campaign-opening__eyebrow">{eyebrow}</span>
			<h1>{title}</h1>
			{#if lede}
				<p class="performance-campaign-opening__lede">{lede}</p>
			{/if}
			{#if actions}
				<div class="performance-campaign-opening__actions">
					{@render actions()}
				</div>
			{/if}
		</header>

		{#if proof.length > 0}
			<ul class="performance-campaign-opening__proof" aria-label="Campaign proof">
				{#each proof as item}
					<li>
						<span>{item.label}</span>
						<strong>{item.value}</strong>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if artifact}
		<div
			class="performance-campaign-opening__artifact"
			class:performance-campaign-opening__artifact--behind-content={artifactLayer === 'behind-content'}
		>
			{@render artifact()}
		</div>
	{/if}

	{#if ornament}
		<div class="performance-campaign-opening__ornament">
			{@render ornament()}
		</div>
	{/if}
</section>

<style>
	.performance-campaign-opening {
		--performance-campaign-scrim-copy: rgba(9, 9, 9, 0.94);
		--performance-campaign-scrim-mid: rgba(9, 9, 9, 0.24);
		--performance-campaign-scrim-edge: rgba(9, 9, 9, 0);
		--performance-campaign-scrim-bottom: rgba(9, 9, 9, 0.48);
		position: relative;
		display: grid;
		min-height: clamp(38rem, 82svh, 58rem);
		padding: 0;
		overflow: hidden;
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
		isolation: isolate;
	}

	.performance-campaign-opening[data-mode='paper'] {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.performance-campaign-opening[data-density='compact'] {
		min-height: clamp(34rem, 72svh, 48rem);
	}

	.performance-campaign-opening__media,
	.performance-campaign-opening__media picture,
	.performance-campaign-opening__media img,
	.performance-campaign-opening__media video {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		margin: 0;
	}

	.performance-campaign-opening__media img,
	.performance-campaign-opening__media video {
		object-fit: cover;
	}

	.performance-campaign-opening__media picture {
		z-index: 0;
		opacity: 1;
		transition: opacity var(--duration-performance-standard, 400ms)
			var(--ease-performance-standard, ease);
	}

	.performance-campaign-opening__media--studio-ready picture {
		opacity: 0;
	}

	.performance-campaign-opening__media .performance-campaign-opening__fallback-suppressed {
		opacity: 0;
	}

	.performance-campaign-opening__media[data-color-mode='monochrome'] img,
	.performance-campaign-opening__media[data-color-mode='monochrome'] video {
		filter: grayscale(1) contrast(1.08);
	}

	.performance-campaign-opening__media[data-color-mode='natural'] img,
	.performance-campaign-opening__media[data-color-mode='natural'] video {
		filter: contrast(1.08);
	}

	.performance-campaign-opening__media::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				90deg,
				rgba(9, 9, 9, 0.99) 0%,
				var(--performance-campaign-scrim-copy) 36%,
				var(--performance-campaign-scrim-mid) 58%,
				rgba(9, 9, 9, 0.04) 76%,
				var(--performance-campaign-scrim-edge) 100%
			),
			linear-gradient(
				0deg,
				var(--performance-campaign-scrim-bottom) 0%,
				rgba(9, 9, 9, 0.08) 48%,
				rgba(9, 9, 9, 0) 100%
			);
		z-index: 1;
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media {
		opacity: 1;
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media::after {
		background:
			linear-gradient(
				90deg,
				var(--color-performance-paper, #f3f3f0) 0%,
				rgba(243, 243, 240, 0.98) 38%,
				rgba(243, 243, 240, 0.72) 53%,
				rgba(243, 243, 240, 0.14) 72%,
				rgba(243, 243, 240, 0) 100%
			),
			linear-gradient(0deg, rgba(243, 243, 240, 0.82) 0%, rgba(243, 243, 240, 0) 32%);
	}

	.performance-campaign-opening[data-mode='paper']
		.performance-campaign-opening__media--paper-object-visible::after {
		background:
			linear-gradient(
				90deg,
				var(--color-performance-paper, #f3f3f0) 0%,
				rgba(243, 243, 240, 0.98) 34%,
				rgba(243, 243, 240, 0.38) 46%,
				rgba(243, 243, 240, 0.04) 58%,
				rgba(243, 243, 240, 0) 68%
			),
			linear-gradient(0deg, rgba(243, 243, 240, 0.34) 0%, rgba(243, 243, 240, 0) 30%);
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__grid {
		background:
			linear-gradient(
					90deg,
					var(--color-performance-grid, rgba(9, 9, 9, 0.045)) 1px,
					transparent 1px
				)
				0 0 / 25% 100%,
			linear-gradient(var(--color-performance-grid, rgba(9, 9, 9, 0.045)) 1px, transparent 1px) 0
				0 / 100% 25%;
	}

	.performance-campaign-opening__grid {
		position: absolute;
		inset: 0;
		z-index: 1;
		background:
			linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px) 0 0 / 25% 100%,
			linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px) 0 0 / 100% 25%;
		pointer-events: none;
	}

	.performance-campaign-opening__content {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-rows: 1fr auto;
		gap: clamp(3rem, 8vw, 8rem);
		width: min(
			var(--content-width-performance, 85rem),
			calc(
				100% - var(--space-performance-page-gutter, 1.25rem) -
					var(--space-performance-page-gutter, 1.25rem)
			)
		);
		margin-inline: auto;
		padding-block: clamp(8rem, 17vh, 12rem) 1.25rem;
	}

	.performance-campaign-opening[data-artifact-layer='behind-content']
		.performance-campaign-opening__content {
		z-index: 3;
	}

	.performance-campaign-opening__artifact,
	.performance-campaign-opening__ornament {
		position: absolute;
		inset: 0;
		z-index: 3;
		pointer-events: none;
	}

	.performance-campaign-opening__artifact--behind-content {
		z-index: 2;
	}

	.performance-campaign-opening[data-density='compact'] .performance-campaign-opening__content {
		gap: clamp(2rem, 5vw, 4rem);
		padding-block: clamp(2.5rem, 6vh, 4rem) 1rem;
	}

	.performance-campaign-opening[data-density='compact'] h1 {
		max-width: 15ch;
		font-size: clamp(3rem, 5.4vw, 5.5rem);
	}

	.performance-campaign-opening__content header {
		display: grid;
		align-content: center;
		justify-items: start;
		gap: 1rem;
		max-width: 52rem;
	}

	@media (min-width: 48rem) {
		.performance-campaign-opening[data-has-artifact='true']
			.performance-campaign-opening__content
			header {
			width: min(44%, 37rem);
		}
	}

	.performance-campaign-opening__eyebrow,
	.performance-campaign-opening__proof span {
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: var(--font-performance-semibold, 600);
		line-height: 1.25;
		text-transform: uppercase;
	}

	.performance-campaign-opening__eyebrow {
		padding: 0.42rem 0.62rem;
		border: 1px solid currentColor;
	}

	.performance-campaign-opening h1 {
		max-width: 13ch;
		margin: 0;
		font-family: var(
			--font-performance-display,
			var(--font-performance-display, var(--font-performance-sans))
		);
		font-size: clamp(3.25rem, 8vw, 7.5rem);
		font-weight: var(--font-performance-display-weight, var(--font-performance-medium, 500));
		font-kerning: normal;
		font-feature-settings:
			'kern' 1,
			'liga' 1;
		letter-spacing: var(--tracking-performance-display, -0.03em);
		line-height: var(--leading-performance-display, 0.94);
		text-wrap: balance;
	}

	.performance-campaign-opening__lede {
		max-width: 40rem;
		margin: 0;
		color: rgba(255, 255, 255, 0.88);
		font-size: clamp(1rem, 1.7vw, 1.3rem);
		line-height: 1.45;
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__lede {
		color: var(--color-performance-muted, #5e6268);
	}

	.performance-campaign-opening__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	/* prettier-ignore */
	.performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-primary) {
		border-color: var(--color-performance-panel, #fff);
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.performance-campaign-opening:not([data-mode='paper'])
		.performance-campaign-opening__actions
		:global(.btn-primary:hover) {
		border-color: var(--color-performance-paper, #f3f3f0);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	/* prettier-ignore */
	.performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-secondary) {
		border-color: rgba(255, 255, 255, 0.72);
		background: rgba(9, 9, 9, 0.44);
		color: var(--color-performance-panel, #fff);
		backdrop-filter: blur(8px);
	}

	.performance-campaign-opening:not([data-mode='paper'])
		.performance-campaign-opening__actions
		:global(.btn-secondary:hover) {
		border-color: var(--color-performance-panel, #fff);
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-performance-panel, #fff);
	}

	/* prettier-ignore */
	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__actions :global(.btn-primary) {
		border-color: var(--color-performance-ink, #090909);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	/* prettier-ignore */
	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__actions :global(.btn-secondary) {
		border-color: var(--color-performance-line, #c6c8cc);
		background: rgba(255, 255, 255, 0.62);
		color: var(--color-performance-ink, #090909);
	}

	.performance-campaign-opening__actions :global(.btn:focus-visible) {
		outline: 3px solid var(--color-performance-signal-soft, #a7b8ff);
		outline-offset: 3px;
	}

	.performance-campaign-opening__proof {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		margin: 0;
		padding: 0;
		border-top: 1px solid currentColor;
		list-style: none;
	}

	.performance-campaign-opening__proof li {
		display: grid;
		gap: 0.35rem;
		padding: 1rem;
		border-right: 1px solid currentColor;
	}

	.performance-campaign-opening__proof span {
		opacity: 0.74;
	}

	.performance-campaign-opening__proof strong {
		font-size: 0.95rem;
		font-weight: var(--font-performance-medium, 500);
	}

	@media (max-width: 47.99rem) {
		.performance-campaign-opening {
			--performance-campaign-scrim-copy: rgba(9, 9, 9, 0.97);
			--performance-campaign-scrim-mid: rgba(9, 9, 9, 0.88);
			--performance-campaign-scrim-edge: rgba(9, 9, 9, 0.32);
			min-height: 44rem;
		}

		.performance-campaign-opening__media::after {
			background:
				linear-gradient(
					0deg,
					var(--performance-campaign-scrim-copy) 0%,
					var(--performance-campaign-scrim-mid) 62%,
					var(--performance-campaign-scrim-edge) 86%,
					rgba(9, 9, 9, 0.14) 100%
				),
				linear-gradient(90deg, rgba(9, 9, 9, 0.72), rgba(9, 9, 9, 0.28));
		}

		.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media::after {
			background:
				linear-gradient(
					180deg,
					var(--color-performance-paper, #f3f3f0) 0%,
					rgba(243, 243, 240, 0.98) 48%,
					rgba(243, 243, 240, 0.56) 68%,
					rgba(243, 243, 240, 0.76) 100%
				),
				linear-gradient(90deg, rgba(243, 243, 240, 0.9), rgba(243, 243, 240, 0.28));
		}

		.performance-campaign-opening[data-mode='paper']
			.performance-campaign-opening__media--paper-object-visible::after {
			background:
				linear-gradient(
					180deg,
					var(--color-performance-paper, #f3f3f0) 0%,
					rgba(243, 243, 240, 0.98) 46%,
					rgba(243, 243, 240, 0.72) 53%,
					rgba(243, 243, 240, 0.14) 62%,
					rgba(243, 243, 240, 0) 72%
				),
				linear-gradient(90deg, rgba(243, 243, 240, 0.36), rgba(243, 243, 240, 0));
		}

		.performance-campaign-opening__content {
			width: min(
				calc(
					100% - var(--space-performance-page-gutter, 0.75rem) -
						var(--space-performance-page-gutter, 0.75rem)
				),
				var(--content-width-performance, 85rem)
			);
			padding-block: 7rem 0.75rem;
		}

		.performance-campaign-opening[data-density='compact'] {
			min-height: 42rem;
		}

		.performance-campaign-opening[data-has-artifact='true'][data-density='compact'] {
			min-height: 64rem;
		}

		.performance-campaign-opening--paper-studio:not([data-has-artifact='true']) {
			min-height: 60rem;
		}

		.performance-campaign-opening[data-density='compact'] .performance-campaign-opening__content {
			padding-block: 5.5rem 0.75rem;
		}

		.performance-campaign-opening[data-has-artifact='true'] .performance-campaign-opening__content {
			grid-template-rows: auto auto;
			align-content: space-between;
		}

		.performance-campaign-opening--paper-studio .performance-campaign-opening__content header {
			align-content: start;
			align-self: start;
			padding-top: 1.5rem;
		}

		.performance-campaign-opening__proof {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.performance-campaign-opening__media picture {
			transition: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.performance-campaign-opening *,
		.performance-campaign-opening *::before,
		.performance-campaign-opening *::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			scroll-behavior: auto !important;
		}
	}
</style>
