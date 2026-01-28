<script lang="ts">
	/**
	 * Carousel Component
	 *
	 * Generic carousel/slider for any content.
	 * Supports auto-play, navigation arrows, and dot indicators.
	 *
	 * Canon principle: Carousels should aid discovery, not distract.
	 *
	 * @example
	 * <Carousel autoPlay={true} autoPlayInterval={5000}>
	 *   {#snippet slide()}
	 *     <img src="/slide1.jpg" alt="Slide 1" />
	 *   {/snippet}
	 *   {#snippet slide()}
	 *     <img src="/slide2.jpg" alt="Slide 2" />
	 *   {/snippet}
	 * </Carousel>
	 */

	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Array of slide content */
		slides?: unknown[];
		/** Current slide index (bindable) */
		currentIndex?: number;
		/** Enable auto-play */
		autoPlay?: boolean;
		/** Auto-play interval in ms */
		autoPlayInterval?: number;
		/** Pause auto-play on hover */
		pauseOnHover?: boolean;
		/** Show navigation arrows */
		showArrows?: boolean;
		/** Show dot indicators */
		showDots?: boolean;
		/** Enable infinite loop */
		loop?: boolean;
		/** Gap between slides in px */
		gap?: number;
		/** Snippet to render each slide */
		slide?: Snippet<[item: unknown, index: number]>;
	}

	let {
		slides = [],
		currentIndex = $bindable(0),
		autoPlay = false,
		autoPlayInterval = 5000,
		pauseOnHover = true,
		showArrows = true,
		showDots = true,
		loop = true,
		gap = 0,
		slide
	}: Props = $props();

	let isPaused = $state(false);
	let autoPlayTimer: ReturnType<typeof setInterval> | null = null;
	let trackRef: HTMLDivElement | undefined = $state();

	const totalSlides = $derived(slides.length);
	const canGoNext = $derived(loop || currentIndex < totalSlides - 1);
	const canGoPrev = $derived(loop || currentIndex > 0);

	function goToSlide(index: number) {
		if (loop) {
			currentIndex = ((index % totalSlides) + totalSlides) % totalSlides;
		} else {
			currentIndex = Math.max(0, Math.min(index, totalSlides - 1));
		}
	}

	function nextSlide() {
		if (canGoNext) {
			goToSlide(currentIndex + 1);
		}
	}

	function prevSlide() {
		if (canGoPrev) {
			goToSlide(currentIndex - 1);
		}
	}

	function startAutoPlay() {
		if (autoPlay && !autoPlayTimer) {
			autoPlayTimer = setInterval(() => {
				if (!isPaused) {
					nextSlide();
				}
			}, autoPlayInterval);
		}
	}

	function stopAutoPlay() {
		if (autoPlayTimer) {
			clearInterval(autoPlayTimer);
			autoPlayTimer = null;
		}
	}

	function handleMouseEnter() {
		if (pauseOnHover) {
			isPaused = true;
		}
	}

	function handleMouseLeave() {
		if (pauseOnHover) {
			isPaused = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			prevSlide();
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			nextSlide();
		}
	}

	$effect(() => {
		if (autoPlay) {
			startAutoPlay();
		} else {
			stopAutoPlay();
		}

		return () => stopAutoPlay();
	});

	onMount(() => {
		return () => stopAutoPlay();
	});
</script>

<div
	class="carousel"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onkeydown={handleKeydown}
	role="region"
	aria-roledescription="carousel"
	aria-label="Carousel"
	tabindex="0"
>
	<!-- Slides Track -->
	<div class="carousel-viewport">
		<div
			bind:this={trackRef}
			class="carousel-track"
			style:transform="translateX(-{currentIndex * 100}%)"
			style:gap="{gap}px"
		>
			{#each slides as item, index}
				<div
					class="carousel-slide"
					role="group"
					aria-roledescription="slide"
					aria-label="{index + 1} of {totalSlides}"
					aria-hidden={index !== currentIndex}
				>
					{#if slide}
						{@render slide(item, index)}
					{:else}
						<!-- Default rendering for images -->
						{#if typeof item === 'string'}
							<img src={item} alt="Slide {index + 1}" />
						{:else}
							<div class="carousel-placeholder">Slide {index + 1}</div>
						{/if}
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- Navigation Arrows -->
	{#if showArrows && totalSlides > 1}
		<button
			class="carousel-arrow carousel-arrow-prev"
			onclick={prevSlide}
			disabled={!canGoPrev}
			aria-label="Previous slide"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 18l-6-6 6-6" />
			</svg>
		</button>
		<button
			class="carousel-arrow carousel-arrow-next"
			onclick={nextSlide}
			disabled={!canGoNext}
			aria-label="Next slide"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M9 18l6-6-6-6" />
			</svg>
		</button>
	{/if}

	<!-- Dot Indicators -->
	{#if showDots && totalSlides > 1}
		<div class="carousel-dots" role="tablist" aria-label="Slide indicators">
			{#each slides as _, index}
				<button
					class="carousel-dot"
					class:active={index === currentIndex}
					onclick={() => goToSlide(index)}
					role="tab"
					aria-selected={index === currentIndex}
					aria-label="Go to slide {index + 1}"
				></button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.carousel {
		position: relative;
		width: 100%;
	}

	.carousel:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 4px;
		border-radius: var(--radius-md, 8px);
	}

	.carousel-viewport {
		overflow: hidden;
		border-radius: var(--radius-lg, 12px);
	}

	.carousel-track {
		display: flex;
		transition: transform var(--duration-standard, 300ms)
			var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.carousel-slide {
		flex: 0 0 100%;
		min-width: 0;
	}

	.carousel-slide img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.carousel-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 300px;
		background: var(--color-bg-surface, #111);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body, 1rem);
	}

	/* Navigation Arrows */
	.carousel-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 44px;
		height: 44px;
		background: var(--color-bg-elevated, #0a0a0a);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-radius: 50%;
		color: var(--color-fg-primary, #fff);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--duration-micro, 200ms)
			var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		z-index: 2;
	}

	.carousel-arrow:hover:not(:disabled) {
		background: var(--color-bg-surface, #111);
		border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
	}

	.carousel-arrow:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.carousel-arrow:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.carousel-arrow svg {
		width: 20px;
		height: 20px;
	}

	.carousel-arrow-prev {
		left: var(--space-sm, 1rem);
	}

	.carousel-arrow-next {
		right: var(--space-sm, 1rem);
	}

	/* Dot Indicators */
	.carousel-dots {
		display: flex;
		justify-content: center;
		gap: var(--space-xs, 0.5rem);
		margin-top: var(--space-md, 1.618rem);
	}

	.carousel-dot {
		width: 8px;
		height: 8px;
		background: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
		border: none;
		border-radius: 50%;
		cursor: pointer;
		padding: 0;
		transition: all var(--duration-micro, 200ms)
			var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.carousel-dot:hover {
		background: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.carousel-dot:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: 2px;
	}

	.carousel-dot.active {
		background: var(--color-fg-primary, #fff);
		width: 24px;
		border-radius: 4px;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.carousel-track,
		.carousel-arrow,
		.carousel-dot {
			transition: none;
		}
	}
</style>
