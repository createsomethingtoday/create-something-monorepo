<script lang="ts">
	/**
	 * HeroParallax - Depth Through Motion
	 *
	 * Parallax creates semantic depth without color.
	 * Foreground (text) moves faster than background (image).
	 *
	 * Pattern: Baseborn Studio award-winner
	 * Canon: Motion serves meaning (depth = hierarchy)
	 */

	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Props {
		image: string;
		alt: string;
		caption?: string;
		children?: import('svelte').Snippet;
	}

	let { image, alt, caption, children }: Props = $props();

	let scrollY = $state(0);
	let mounted = $state(false);

	// Parallax depth factors
	const imageDepth = 0.3; // Background moves slower
	const contentDepth = 0.1; // Foreground moves slightly

	onMount(() => {
		mounted = true;

		if (!browser) return;

		const handleScroll = () => {
			scrollY = window.scrollY;
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<section class="hero-parallax">
	<!-- Background layer: moves slower -->
	<div
		class="parallax-bg"
		style="transform: translateY({mounted ? scrollY * imageDepth : 0}px)"
	>
		<div class="image-placeholder"></div>
		<img src={image} {alt} class="hero-image" loading="eager" />
		<div class="hero-overlay"></div>
	</div>

	<!-- Content layer: moves slightly -->
	<div
		class="parallax-content"
		style="transform: translateY({mounted ? scrollY * contentDepth : 0}px)"
	>
		{#if children}
			{@render children()}
		{/if}

		{#if caption}
			<div class="hero-caption">
				<span class="caption-text">{caption}</span>
			</div>
		{/if}

		<!-- Scroll indicator -->
		<div class="scroll-indicator" aria-hidden="true">
			<span class="scroll-line"></span>
		</div>
	</div>
</section>

<style>
	.hero-parallax {
		position: relative;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		background: var(--color-bg-pure);
	}

	/* Background layer */
	.parallax-bg {
		position: absolute;
		inset: -10% -5%; /* Extend beyond viewport for parallax movement */
		will-change: transform;
	}

	.image-placeholder {
		position: absolute;
		inset: 0;
		background: var(--color-bg-elevated);
	}

	.hero-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		animation: image-reveal 1.2s var(--ease-standard) 0.3s forwards;
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

	/* Vignette overlay for text legibility */
	.hero-overlay {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 30%),
			linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, transparent 35%),
			radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.15) 100%);
		pointer-events: none;
		z-index: 1;
	}

	/* Content layer */
	.parallax-content {
		position: relative;
		height: 100%;
		z-index: 2;
		will-change: transform;
	}

	/* Caption */
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
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
		opacity: 0;
		animation: caption-fade 0.8s var(--ease-standard) 1s forwards;
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

	/* Scroll indicator */
	.scroll-indicator {
		position: absolute;
		bottom: var(--space-xl);
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		opacity: 0;
		animation: indicator-fade 0.8s var(--ease-standard) 1.5s forwards;
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
		0%,
		100% {
			opacity: 0.3;
			transform: scaleY(1);
		}
		50% {
			opacity: 0.8;
			transform: scaleY(1.3);
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-caption {
			left: var(--space-md);
			bottom: var(--space-lg);
		}
	}

	/* Reduced motion: disable parallax and animations */
	@media (prefers-reduced-motion: reduce) {
		.parallax-bg,
		.parallax-content {
			transform: none !important;
		}

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
