<script lang="ts">
	import type { Snippet } from 'svelte';

	export type PerformanceCampaignOpeningMode = 'ink' | 'paper';

	export interface PerformanceCampaignMedia {
		src: string;
		mobileSrc?: string;
		alt: string;
		width?: number;
		height?: number;
		objectPosition?: string;
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
		priority?: boolean;
		actions?: Snippet;
	}

	let {
		eyebrow,
		title,
		lede,
		media,
		proof = [],
		mode = 'ink',
		priority = true,
		actions
	}: Props = $props();
</script>

<section class="performance-campaign-opening" data-mode={mode} aria-label={eyebrow}>
	<figure class="performance-campaign-opening__media">
		<picture>
			{#if media.mobileSrc}
				<source media="(max-width: 47.99rem)" srcset={media.mobileSrc} />
			{/if}
			<img
				src={media.src}
				alt={media.alt}
				width={media.width}
				height={media.height}
				loading={priority ? 'eager' : 'lazy'}
				fetchpriority={priority ? 'high' : 'auto'}
				decoding="async"
				style:object-position={media.objectPosition ?? 'center'}
			/>
		</picture>
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
</section>

<style>
	.performance-campaign-opening {
		--performance-campaign-scrim-copy: rgba(9, 9, 9, 0.94);
		--performance-campaign-scrim-mid: rgba(9, 9, 9, 0.76);
		--performance-campaign-scrim-edge: rgba(9, 9, 9, 0.18);
		--performance-campaign-scrim-bottom: rgba(9, 9, 9, 0.92);
		position: relative;
		display: grid;
		min-height: clamp(38rem, 82svh, 58rem);
		overflow: hidden;
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
		isolation: isolate;
	}

	.performance-campaign-opening[data-mode='paper'] {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.performance-campaign-opening__media,
	.performance-campaign-opening__media picture,
	.performance-campaign-opening__media img {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		margin: 0;
	}

	.performance-campaign-opening__media img {
		object-fit: cover;
		filter: grayscale(1) contrast(1.08);
	}

	.performance-campaign-opening__media::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg,
				rgba(9, 9, 9, 0.99) 0%,
				var(--performance-campaign-scrim-copy) 36%,
				var(--performance-campaign-scrim-mid) 58%,
				rgba(9, 9, 9, 0.42) 76%,
				var(--performance-campaign-scrim-edge) 100%),
			linear-gradient(0deg,
				var(--performance-campaign-scrim-bottom) 0%,
				rgba(9, 9, 9, 0.48) 48%,
				rgba(9, 9, 9, 0.12) 100%);
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media {
		opacity: 0.24;
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__media::after {
		background: linear-gradient(90deg, #f3f3f0 0%, rgba(243, 243, 240, 0.7) 48%, rgba(243, 243, 240, 0.15));
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
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin-inline: auto;
		padding-block: clamp(8rem, 17vh, 12rem) 1.25rem;
	}

	.performance-campaign-opening__content header {
		display: grid;
		align-content: center;
		justify-items: start;
		gap: 1rem;
		max-width: 52rem;
	}

	.performance-campaign-opening__eyebrow,
	.performance-campaign-opening__proof span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: var(--font-semibold, 600);
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
		font-family: var(--font-performance-display, var(--font-display, var(--font-sans)));
		font-size: clamp(3.25rem, 8vw, 7.5rem);
		font-weight: var(--font-performance-display-weight, var(--font-medium, 500));
		font-kerning: normal;
		font-feature-settings: "kern" 1, "liga" 1;
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

	.performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-primary) {
		border-color: var(--color-performance-panel, #fff);
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-primary:hover) {
		border-color: var(--color-performance-paper, #f3f3f0);
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
	}

	.performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-secondary) {
		border-color: rgba(255, 255, 255, 0.72);
		background: rgba(9, 9, 9, 0.44);
		color: var(--color-performance-panel, #fff);
		backdrop-filter: blur(8px);
	}

	.performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-secondary:hover) {
		border-color: var(--color-performance-panel, #fff);
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-performance-panel, #fff);
	}

	.performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__actions :global(.btn-primary) {
		border-color: var(--color-performance-ink, #090909);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

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
		font-weight: var(--font-medium, 500);
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
				linear-gradient(0deg,
					var(--performance-campaign-scrim-copy) 0%,
					var(--performance-campaign-scrim-mid) 62%,
					var(--performance-campaign-scrim-edge) 86%,
					rgba(9, 9, 9, 0.14) 100%),
				linear-gradient(90deg, rgba(9, 9, 9, 0.72), rgba(9, 9, 9, 0.28));
		}

		.performance-campaign-opening__content {
			width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
			padding-block: 7rem 0.75rem;
		}

		.performance-campaign-opening__proof {
			grid-template-columns: repeat(2, minmax(0, 1fr));
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
