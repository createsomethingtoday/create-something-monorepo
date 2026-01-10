<script lang="ts">
	/**
	 * HeroSection - DWELL-Inspired Full-Bleed Image
	 *
	 * The image IS the hero. Text is minimal, placed with intention.
	 * The scroll indicator invites dwelling, not action.
	 *
	 * "Architecture should recede into experience."
	 */

	import { siteConfig } from '$lib/config/context';

	interface Props {
		image?: string;
		alt?: string;
		caption?: string;
	}

	let { image, alt, caption }: Props = $props();

	// Reactive defaults from store
	const effectiveImage = $derived(image ?? $siteConfig.hero.image);
	const effectiveAlt = $derived(alt ?? $siteConfig.hero.alt);
	const effectiveCaption = $derived(caption ?? $siteConfig.hero.caption);
</script>

<section class="hero">
	<!-- Full-bleed image container -->
	<div class="hero-image-container">
		<!-- Placeholder for when image loads -->
		<div class="hero-image-placeholder"></div>
		<img
			src={effectiveImage}
			alt={effectiveAlt}
			class="hero-image"
			loading="eager"
		/>
		<!-- Subtle overlay for text legibility -->
		<div class="hero-overlay"></div>
	</div>

	<!-- Minimal caption - positioned with intention -->
	<div class="hero-caption">
		<span class="caption-text">{effectiveCaption}</span>
	</div>

	<!-- Scroll indicator - invites exploration -->
	<div class="scroll-indicator" aria-hidden="true">
		<span class="scroll-line"></span>
	</div>
</section>

<style>
	.hero {
		position: relative;
		width: 100%;
		height: 100vh;
		height: 100dvh; /* Dynamic viewport height for mobile */
		overflow: hidden;
		background: var(--color-bg-pure);
	}

	.hero-image-container {
		position: absolute;
		inset: 0;
	}

	.hero-image-placeholder {
		position: absolute;
		inset: 0;
		background: var(--color-bg-elevated);
	}

	/* Subtle vignette overlay - darkens edges for text legibility */
	.hero-overlay {
		position: absolute;
		inset: 0;
		background:
			/* Top edge gradient for nav legibility */
			linear-gradient(
				to bottom,
				rgba(0, 0, 0, 0.4) 0%,
				rgba(0, 0, 0, 0.1) 15%,
				transparent 30%
			),
			/* Bottom edge gradient for caption legibility */
			linear-gradient(
				to top,
				rgba(0, 0, 0, 0.5) 0%,
				rgba(0, 0, 0, 0.2) 15%,
				transparent 35%
			),
			/* Subtle overall vignette */
			radial-gradient(
				ellipse at center,
				transparent 40%,
				rgba(0, 0, 0, 0.15) 100%
			);
		pointer-events: none;
		z-index: 1;
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		animation: image-reveal 1.2s var(--ease-decelerate) 0.3s forwards;
	}

	@keyframes image-reveal {
		from {
			opacity: 0;
			transform: scale(1.02);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Caption - minimal, precise placement */
	.hero-caption {
		position: absolute;
		bottom: var(--space-xl);
		left: var(--space-lg);
		z-index: 1;
	}

	.caption-text {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		/* Subtle text shadow for legibility over image */
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		opacity: 0;
		animation: caption-fade 0.8s var(--ease-decelerate) 1s forwards;
	}

	@keyframes caption-fade {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 0.8;
			transform: translateY(0);
		}
	}

	/* Scroll indicator - centered at bottom */
	.scroll-indicator {
		position: absolute;
		bottom: var(--space-xl);
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		opacity: 0;
		animation: indicator-fade 0.8s var(--ease-decelerate) 1.5s forwards;
	}

	@keyframes indicator-fade {
		to {
			opacity: 0.6;
		}
	}

	.scroll-line {
		display: block;
		width: 1px;
		height: var(--space-lg);
		background: linear-gradient(
			to bottom,
			var(--color-fg-primary) 0%,
			transparent 100%
		);
		animation: scroll-pulse 2.5s var(--ease-standard) infinite;
		animation-delay: 2s;
	}

	@keyframes scroll-pulse {
		0%, 100% {
			opacity: 0.3;
			transform: scaleY(1);
		}
		50% {
			opacity: 0.8;
			transform: scaleY(1.3);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.hero-caption {
			left: var(--space-md);
			bottom: var(--space-lg);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.hero-image {
			animation: none;
			opacity: 1;
			transform: none;
		}

		.caption-text {
			animation: none;
			opacity: 0.8;
			transform: none;
		}

		.scroll-indicator {
			animation: none;
			opacity: 0.6;
		}

		.scroll-line {
			animation: none;
		}
	}
</style>
