<script lang="ts">
	/**
	 * ParallaxSection Component
	 *
	 * Creates a multi-layer parallax depth effect on scroll.
	 * Uses CSS transforms for GPU-accelerated performance.
	 *
	 * Canon principle: Motion should create depth, not distraction.
	 *
	 * @example
	 * <ParallaxSection
	 *   backgroundImage="/images/hero.jpg"
	 *   speed={0.5}
	 *   height="80vh"
	 * >
	 *   <h1>Content moves at normal speed</h1>
	 * </ParallaxSection>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Background image URL */
		backgroundImage?: string;
		/** Background color (used if no image) */
		backgroundColor?: string;
		/** Parallax speed factor (0 = fixed, 1 = normal scroll, 0.5 = half speed) */
		speed?: number;
		/** Section height */
		height?: string;
		/** Minimum height */
		minHeight?: string;
		/** Enable overlay for better text readability */
		overlay?: boolean;
		/** Overlay opacity (0-1) */
		overlayOpacity?: number;
		/** Content vertical alignment */
		align?: 'start' | 'center' | 'end';
		/** Disable parallax (useful for mobile) */
		disabled?: boolean;
		/** Additional classes */
		class?: string;
		/** Children content */
		children?: import('svelte').Snippet;
		/** Optional background slot for custom backgrounds */
		background?: import('svelte').Snippet;
	}

	let {
		backgroundImage,
		backgroundColor,
		speed = 0.5,
		height = '100vh',
		minHeight = '400px',
		overlay = false,
		overlayOpacity = 0.4,
		align = 'center',
		disabled = false,
		class: className = '',
		children,
		background
	}: Props = $props();

	let container: HTMLElement;
	let backgroundLayer: HTMLElement;
	let scrollY = $state(0);
	let containerTop = $state(0);
	let containerHeight = $state(0);
	let windowHeight = $state(0);
	let isInView = $state(false);
	let rafId: number;

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	// Calculate parallax offset
	const parallaxOffset = $derived(() => {
		if (!isInView || disabled || prefersReducedMotion) return 0;

		// Calculate how far through the viewport the element has scrolled
		// When element top is at viewport bottom: progress = 0
		// When element bottom is at viewport top: progress = 1
		const scrollProgress = (scrollY + windowHeight - containerTop) / (containerHeight + windowHeight);

		// Clamp between 0 and 1
		const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

		// Calculate offset based on speed
		// Speed of 0.5 means background moves at half the rate of scroll
		// This creates the illusion of depth
		const maxOffset = containerHeight * (1 - speed);
		return (clampedProgress - 0.5) * maxOffset;
	});

	function updateDimensions() {
		if (!container || !browser) return;

		const rect = container.getBoundingClientRect();
		containerTop = rect.top + window.scrollY;
		containerHeight = rect.height;
		windowHeight = window.innerHeight;
	}

	function handleScroll() {
		if (!browser || disabled || prefersReducedMotion) return;

		// Use RAF for smooth updates
		if (rafId) cancelAnimationFrame(rafId);

		rafId = requestAnimationFrame(() => {
			scrollY = window.scrollY;

			// Check if in view (with buffer)
			const buffer = 100;
			const elementTop = containerTop - scrollY;
			const elementBottom = elementTop + containerHeight;

			isInView = elementBottom > -buffer && elementTop < windowHeight + buffer;
		});
	}

	onMount(() => {
		if (!browser || !container) return;

		// Initial measurements
		updateDimensions();
		handleScroll();

		// Set up listeners
		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', updateDimensions, { passive: true });

		// Use ResizeObserver for container size changes
		const resizeObserver = new ResizeObserver(updateDimensions);
		resizeObserver.observe(container);

		return () => {
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', updateDimensions);
			resizeObserver.disconnect();
			if (rafId) cancelAnimationFrame(rafId);
		};
	});

	const alignmentClass = {
		start: 'align-start',
		center: 'align-center',
		end: 'align-end'
	}[align];
</script>

<section
	bind:this={container}
	class="parallax-section {alignmentClass} {className}"
	class:has-overlay={overlay}
	class:reduced-motion={prefersReducedMotion}
	style="
		--height: {height};
		--min-height: {minHeight};
		--overlay-opacity: {overlayOpacity};
		--bg-color: {backgroundColor || 'transparent'};
	"
>
	<!-- Background Layer -->
	<div
		bind:this={backgroundLayer}
		class="parallax-background"
		style="
			transform: translate3d(0, {parallaxOffset()}px, 0);
			{backgroundImage ? `background-image: url(${backgroundImage});` : ''}
		"
	>
		{#if background}
			{@render background()}
		{/if}
	</div>

	<!-- Overlay -->
	{#if overlay}
		<div class="parallax-overlay"></div>
	{/if}

	<!-- Foreground Content -->
	<div class="parallax-content">
		{@render children?.()}
	</div>
</section>

<style>
	.parallax-section {
		position: relative;
		height: var(--height);
		min-height: var(--min-height);
		overflow: hidden;
		background-color: var(--bg-color);
	}

	.parallax-background {
		position: absolute;
		top: -20%;
		left: 0;
		right: 0;
		bottom: -20%;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		will-change: transform;
		z-index: 0;
	}

	.parallax-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, calc(var(--overlay-opacity) * 0.5)),
			rgba(0, 0, 0, var(--overlay-opacity)),
			rgba(0, 0, 0, calc(var(--overlay-opacity) * 0.5))
		);
		z-index: 1;
	}

	.parallax-content {
		position: relative;
		z-index: 2;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: var(--space-xl, 4.236rem) var(--space-lg, 2.618rem);
	}

	/* Alignment variants */
	.align-start .parallax-content {
		justify-content: flex-start;
	}

	.align-center .parallax-content {
		justify-content: center;
	}

	.align-end .parallax-content {
		justify-content: flex-end;
	}

	/* Reduced motion - disable parallax */
	.reduced-motion .parallax-background {
		transform: none !important;
		top: 0;
		bottom: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.parallax-background {
			transform: none !important;
			top: 0;
			bottom: 0;
		}
	}

	/* Mobile optimization - can disable parallax for performance */
	@media (max-width: 768px) {
		.parallax-content {
			padding: var(--space-lg, 2.618rem) var(--space-md, 1.618rem);
		}
	}
</style>
