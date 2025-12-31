<script lang="ts">
	/**
	 * SmoothScroll - Lenis-style Inertial Scrolling
	 *
	 * Provides smooth, inertial scrolling with lerp-based interpolation.
	 * Exposes scroll state via Svelte context for parallax effects.
	 *
	 * Canon principle: Motion should feel natural, not mechanical.
	 * Lerp creates organic deceleration that matches physical expectation.
	 *
	 * @example
	 * <SmoothScroll lerp={0.1}>
	 *   <main>
	 *     <!-- Your page content -->
	 *   </main>
	 * </SmoothScroll>
	 *
	 * @example
	 * // Access scroll state in child components
	 * <script>
	 *   import { getContext } from 'svelte';
	 *   import { SMOOTH_SCROLL_KEY, type ScrollState } from '@create-something/components/motion';
	 *
	 *   const scrollState = getContext<Writable<ScrollState>>(SMOOTH_SCROLL_KEY);
	 *   // Use $scrollState.progress, $scrollState.velocity, etc.
	 * </script>
	 */
	import { onMount, setContext } from 'svelte';
	import { browser } from '$app/environment';
	import { SMOOTH_SCROLL_KEY, createScrollState, type ScrollState } from './smooth-scroll';

	interface Props {
		/** Lerp factor (0-1). Lower = smoother/slower. Default 0.1 */
		lerp?: number;
		/** Scroll multiplier for wheel events. Default 1 */
		wheelMultiplier?: number;
		/** Scroll multiplier for touch events. Default 2 */
		touchMultiplier?: number;
		/** Enable smooth scrolling. Default true */
		enabled?: boolean;
		/** Use native scroll-behavior instead of JS lerp. Default false */
		native?: boolean;
		/** Lock scroll (prevents all scrolling). Default false */
		locked?: boolean;
		/** Orientation. Default 'vertical' */
		orientation?: 'vertical' | 'horizontal';
		/** Additional wrapper classes */
		class?: string;
		/** Content */
		children?: import('svelte').Snippet;
		/** Called on each scroll update */
		onscroll?: (state: ScrollState) => void;
	}

	let {
		lerp: lerpFactor = 0.1,
		wheelMultiplier = 1,
		touchMultiplier = 2,
		enabled = true,
		native = false,
		locked = false,
		orientation = 'vertical',
		class: className = '',
		children,
		onscroll
	}: Props = $props();

	// Create and expose scroll state via context
	const scrollState = createScrollState();
	setContext(SMOOTH_SCROLL_KEY, scrollState);

	let wrapperElement: HTMLDivElement;
	let contentElement: HTMLDivElement;

	// Internal scroll state
	let targetScroll = 0;
	let currentScroll = 0;
	let lastScroll = 0;
	let isScrolling = false;
	let scrollTimeout: ReturnType<typeof setTimeout>;
	let rafId: number;
	let touchStart = 0;

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	// Use native scrolling if reduced motion is preferred
	const useNative = native || prefersReducedMotion;

	function getScrollLimit(): number {
		if (!browser || !contentElement || !wrapperElement) return 0;

		if (orientation === 'horizontal') {
			return Math.max(0, contentElement.scrollWidth - wrapperElement.clientWidth);
		}
		return Math.max(0, contentElement.scrollHeight - wrapperElement.clientHeight);
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function lerp(start: number, end: number, factor: number): number {
		return start + (end - start) * factor;
	}

	function updateScrollState(): void {
		const limit = getScrollLimit();
		const progress = limit > 0 ? currentScroll / limit : 0;
		const direction = currentScroll > lastScroll ? 1 : currentScroll < lastScroll ? -1 : 0;
		const velocity = currentScroll - lastScroll;

		scrollState.set({
			progress,
			scrollY: currentScroll,
			direction,
			velocity,
			isScrolling
		});

		onscroll?.({
			progress,
			scrollY: currentScroll,
			direction,
			velocity,
			isScrolling
		});

		lastScroll = currentScroll;
	}

	function animate(): void {
		if (!enabled || locked || useNative) return;

		// Lerp towards target
		currentScroll = lerp(currentScroll, targetScroll, lerpFactor);

		// Stop when close enough
		if (Math.abs(targetScroll - currentScroll) < 0.5) {
			currentScroll = targetScroll;
		}

		// Apply transform
		if (contentElement) {
			if (orientation === 'horizontal') {
				contentElement.style.transform = `translate3d(${-currentScroll}px, 0, 0)`;
			} else {
				contentElement.style.transform = `translate3d(0, ${-currentScroll}px, 0)`;
			}
		}

		updateScrollState();

		rafId = requestAnimationFrame(animate);
	}

	function handleWheel(event: WheelEvent): void {
		if (!enabled || locked || useNative) return;

		event.preventDefault();

		const delta = orientation === 'horizontal' ? event.deltaX : event.deltaY;
		targetScroll = clamp(targetScroll + delta * wheelMultiplier, 0, getScrollLimit());

		// Mark as scrolling
		isScrolling = true;
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			isScrolling = false;
			updateScrollState();
		}, 150);
	}

	function handleTouchStart(event: TouchEvent): void {
		if (!enabled || locked || useNative) return;

		const touch = event.touches[0];
		touchStart = orientation === 'horizontal' ? touch.clientX : touch.clientY;
	}

	function handleTouchMove(event: TouchEvent): void {
		if (!enabled || locked || useNative) return;

		event.preventDefault();

		const touch = event.touches[0];
		const current = orientation === 'horizontal' ? touch.clientX : touch.clientY;
		const delta = (touchStart - current) * touchMultiplier;

		targetScroll = clamp(targetScroll + delta, 0, getScrollLimit());
		touchStart = current;

		isScrolling = true;
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			isScrolling = false;
			updateScrollState();
		}, 150);
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (!enabled || locked || useNative) return;

		const limit = getScrollLimit();
		const step = 100;

		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowRight':
				event.preventDefault();
				targetScroll = clamp(targetScroll + step, 0, limit);
				break;
			case 'ArrowUp':
			case 'ArrowLeft':
				event.preventDefault();
				targetScroll = clamp(targetScroll - step, 0, limit);
				break;
			case 'PageDown':
				event.preventDefault();
				targetScroll = clamp(targetScroll + wrapperElement.clientHeight, 0, limit);
				break;
			case 'PageUp':
				event.preventDefault();
				targetScroll = clamp(targetScroll - wrapperElement.clientHeight, 0, limit);
				break;
			case 'Home':
				event.preventDefault();
				targetScroll = 0;
				break;
			case 'End':
				event.preventDefault();
				targetScroll = limit;
				break;
			case ' ':
				event.preventDefault();
				if (event.shiftKey) {
					targetScroll = clamp(targetScroll - wrapperElement.clientHeight, 0, limit);
				} else {
					targetScroll = clamp(targetScroll + wrapperElement.clientHeight, 0, limit);
				}
				break;
		}
	}

	// Native scroll handler
	function handleNativeScroll(): void {
		if (!wrapperElement) return;

		currentScroll = orientation === 'horizontal'
			? wrapperElement.scrollLeft
			: wrapperElement.scrollTop;

		isScrolling = true;
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			isScrolling = false;
			updateScrollState();
		}, 150);

		updateScrollState();
	}

	/** Programmatic scroll to position */
	export function scrollTo(target: number | HTMLElement, options?: { immediate?: boolean }): void {
		let position: number;

		if (typeof target === 'number') {
			position = target;
		} else {
			// Scroll to element
			const rect = target.getBoundingClientRect();
			position = orientation === 'horizontal'
				? currentScroll + rect.left
				: currentScroll + rect.top;
		}

		position = clamp(position, 0, getScrollLimit());

		if (useNative) {
			wrapperElement?.scrollTo({
				[orientation === 'horizontal' ? 'left' : 'top']: position,
				behavior: options?.immediate ? 'instant' : 'smooth'
			});
		} else {
			if (options?.immediate) {
				currentScroll = position;
				targetScroll = position;
				if (contentElement) {
					if (orientation === 'horizontal') {
						contentElement.style.transform = `translate3d(${-currentScroll}px, 0, 0)`;
					} else {
						contentElement.style.transform = `translate3d(0, ${-currentScroll}px, 0)`;
					}
				}
			} else {
				targetScroll = position;
			}
		}
	}

	onMount(() => {
		if (!browser) return;

		if (!useNative) {
			// Start animation loop
			rafId = requestAnimationFrame(animate);

			// Add wheel listener with passive: false to allow preventDefault
			wrapperElement?.addEventListener('wheel', handleWheel, { passive: false });
			wrapperElement?.addEventListener('touchmove', handleTouchMove, { passive: false });
		}

		return () => {
			cancelAnimationFrame(rafId);
			clearTimeout(scrollTimeout);
			wrapperElement?.removeEventListener('wheel', handleWheel);
			wrapperElement?.removeEventListener('touchmove', handleTouchMove);
		};
	});
</script>

<div
	bind:this={wrapperElement}
	class="smooth-scroll-wrapper {className}"
	class:native={useNative}
	class:horizontal={orientation === 'horizontal'}
	class:locked
	class:reduced-motion={prefersReducedMotion}
	role="region"
	tabindex="0"
	ontouchstart={handleTouchStart}
	onkeydown={handleKeyDown}
	onscroll={useNative ? handleNativeScroll : undefined}
>
	<div
		bind:this={contentElement}
		class="smooth-scroll-content"
	>
		{@render children?.()}
	</div>
</div>

<style>
	.smooth-scroll-wrapper {
		position: fixed;
		inset: 0;
		overflow: hidden;
		outline: none;
	}

	.smooth-scroll-wrapper:focus-visible {
		outline: 2px solid var(--color-focus, rgba(255, 255, 255, 0.5));
		outline-offset: -2px;
	}

	.smooth-scroll-content {
		will-change: transform;
	}

	/* Native scrolling mode */
	.smooth-scroll-wrapper.native {
		position: relative;
		overflow: auto;
		scroll-behavior: smooth;
	}

	.smooth-scroll-wrapper.native .smooth-scroll-content {
		will-change: auto;
		transform: none !important;
	}

	/* Horizontal orientation */
	.smooth-scroll-wrapper.horizontal {
		overflow-x: hidden;
	}

	.smooth-scroll-wrapper.horizontal.native {
		overflow-x: auto;
		overflow-y: hidden;
	}

	.smooth-scroll-wrapper.horizontal .smooth-scroll-content {
		display: flex;
		width: max-content;
	}

	/* Locked state */
	.smooth-scroll-wrapper.locked {
		overflow: hidden !important;
		touch-action: none;
	}

	/* Reduced motion - use native smooth scrolling */
	.smooth-scroll-wrapper.reduced-motion {
		position: relative;
		overflow: auto;
		scroll-behavior: smooth;
	}

	.smooth-scroll-wrapper.reduced-motion .smooth-scroll-content {
		will-change: auto;
		transform: none !important;
	}

	@media (prefers-reduced-motion: reduce) {
		.smooth-scroll-wrapper {
			position: relative;
			overflow: auto;
			scroll-behavior: smooth;
		}

		.smooth-scroll-content {
			will-change: auto;
			transform: none !important;
		}
	}

	/* Scrollbar styling */
	.smooth-scroll-wrapper.native::-webkit-scrollbar,
	.smooth-scroll-wrapper.reduced-motion::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.smooth-scroll-wrapper.native::-webkit-scrollbar-track,
	.smooth-scroll-wrapper.reduced-motion::-webkit-scrollbar-track {
		background: var(--color-bg-subtle, #1a1a1a);
	}

	.smooth-scroll-wrapper.native::-webkit-scrollbar-thumb,
	.smooth-scroll-wrapper.reduced-motion::-webkit-scrollbar-thumb {
		background: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
		border-radius: var(--radius-full, 9999px);
	}

	.smooth-scroll-wrapper.native::-webkit-scrollbar-thumb:hover,
	.smooth-scroll-wrapper.reduced-motion::-webkit-scrollbar-thumb:hover {
		background: var(--color-border-strong, rgba(255, 255, 255, 0.3));
	}
</style>
