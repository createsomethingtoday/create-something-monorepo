<script lang="ts">
	/**
	 * FadeIn - Simple fade entrance animation
	 *
	 * Lightweight wrapper for basic fade animations.
	 * For more complex animations, use ScrollReveal.
	 *
	 * @example
	 * <FadeIn delay={200}>
	 *   <p>Fades in on mount</p>
	 * </FadeIn>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Delay before animation starts in ms */
		delay?: number;
		/** Animation duration in ms */
		duration?: number;
		/** Whether to animate on mount (true) or on scroll (false) */
		onMount?: boolean;
		/** Visibility threshold for scroll trigger (0-1) */
		threshold?: number;
		/** Additional classes */
		class?: string;
		/** Children */
		children?: import('svelte').Snippet;
	}

	let {
		delay = 0,
		duration = 300,
		onMount: animateOnMount = true,
		threshold = 0.2,
		class: className = '',
		children
	}: Props = $props();

	let element: HTMLDivElement;
	let isVisible = $state(false);

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	onMount(() => {
		if (!browser || !element) return;

		// If reduced motion, show immediately
		if (prefersReducedMotion) {
			isVisible = true;
			return;
		}

		if (animateOnMount) {
			// Animate on mount with delay
			setTimeout(() => {
				isVisible = true;
			}, delay);
		} else {
			// Animate on scroll
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							setTimeout(() => {
								isVisible = true;
							}, delay);
							observer.unobserve(element);
						}
					});
				},
				{ threshold }
			);

			observer.observe(element);
			return () => observer.disconnect();
		}
	});
</script>

<div
	bind:this={element}
	class="fade-in {className}"
	class:visible={isVisible}
	class:reduced-motion={prefersReducedMotion}
	style="--duration: {duration}ms;"
>
	{@render children?.()}
</div>

<style>
	.fade-in {
		opacity: 0;
		transition: opacity var(--duration, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.fade-in.visible {
		opacity: 1;
	}

	/* Reduced motion - show immediately */
	.fade-in.reduced-motion {
		opacity: 1;
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.fade-in {
			opacity: 1;
			transition: none;
		}
	}
</style>
