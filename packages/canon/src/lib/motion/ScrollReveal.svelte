<script lang="ts">
	/**
	 * ScrollReveal - Scroll-triggered entrance animations
	 *
	 * Port of Maverick X pattern to Svelte with Canon tokens.
	 * Uses IntersectionObserver instead of GSAP for lighter bundle.
	 *
	 * @example
	 * <ScrollReveal animation="fadeUp">
	 *   <h1>Revealed on scroll</h1>
	 * </ScrollReveal>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Animation type */
		animation?: 'fadeUp' | 'fadeDown' | 'slideLeft' | 'slideRight' | 'scale' | 'fade';
		/** When to trigger (0-1, percentage of element visible) */
		threshold?: number;
		/** Animation delay in milliseconds */
		delay?: number;
		/** Distance for slide animations in pixels */
		distance?: number;
		/** Only animate once */
		once?: boolean;
		/** Additional classes */
		class?: string;
		/** Children */
		children?: import('svelte').Snippet;
	}

	let {
		animation = 'fadeUp',
		threshold = 0.2,
		delay = 0,
		distance = 40,
		once = true,
		class: className = '',
		children
	}: Props = $props();

	let element: HTMLDivElement;
	let isVisible = $state(false);
	let hasAnimated = $state(false);

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	onMount(() => {
		if (!browser || !element) return;

		// If user prefers reduced motion, show immediately
		if (prefersReducedMotion) {
			isVisible = true;
			hasAnimated = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						// Apply delay before revealing
						if (delay > 0) {
							setTimeout(() => {
								isVisible = true;
								hasAnimated = true;
							}, delay);
						} else {
							isVisible = true;
							hasAnimated = true;
						}

						// Unobserve if only animating once
						if (once) {
							observer.unobserve(element);
						}
					} else if (!once && hasAnimated) {
						// Re-hide when scrolling back up (if not once-only)
						isVisible = false;
					}
				});
			},
			{ threshold }
		);

		observer.observe(element);

		return () => observer.disconnect();
	});

	// Generate initial transform based on animation type
	const getInitialTransform = () => {
		switch (animation) {
			case 'fadeUp':
				return `translateY(${distance}px)`;
			case 'fadeDown':
				return `translateY(-${distance}px)`;
			case 'slideLeft':
				return `translateX(${distance}px)`;
			case 'slideRight':
				return `translateX(-${distance}px)`;
			case 'scale':
				return 'scale(0.9)';
			case 'fade':
			default:
				return 'none';
		}
	};
</script>

<div
	bind:this={element}
	class="scroll-reveal {className}"
	class:visible={isVisible}
	class:reduced-motion={prefersReducedMotion}
	style="--initial-transform: {getInitialTransform()}; --delay: {delay}ms;"
	data-animation={animation}
>
	{@render children?.()}
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: var(--initial-transform);
		transition:
			opacity var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			transform var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
		will-change: opacity, transform;
	}

	.scroll-reveal.visible {
		opacity: 1;
		transform: translateY(0) translateX(0) scale(1);
	}

	/* Reduced motion - show immediately without animation */
	.scroll-reveal.reduced-motion {
		opacity: 1;
		transform: none;
		transition: none;
	}

	/* Ensure content is accessible even before animation */
	@media (prefers-reduced-motion: reduce) {
		.scroll-reveal {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
