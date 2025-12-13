<script lang="ts">
	/**
	 * ScrollReveal - Intersection Observer wrapper
	 *
	 * Wraps content and reveals it when scrolled into view.
	 * Philosophy: Motion serves hierarchy disclosure.
	 * Canon: Functional animation, not decorative.
	 */

	import { onMount } from 'svelte';

	interface Props {
		threshold?: number;
		rootMargin?: string;
		delay?: number;
		children: import('svelte').Snippet;
	}

	let { threshold = 0.15, rootMargin = '0px', delay = 0, children }: Props = $props();

	let isVisible = $state(false);
	let containerRef: HTMLElement | undefined = $state();

	onMount(() => {
		if (!containerRef) return;

		// Respect reduced motion preference
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) {
			isVisible = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (delay > 0) {
							setTimeout(() => {
								isVisible = true;
							}, delay);
						} else {
							isVisible = true;
						}
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold, rootMargin }
		);

		observer.observe(containerRef);

		return () => observer.disconnect();
	});
</script>

<div class="scroll-reveal" class:visible={isVisible} bind:this={containerRef}>
	{@render children()}
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: translateY(24px);
		transition: opacity var(--duration-complex) var(--ease-decelerate),
			transform var(--duration-complex) var(--ease-decelerate);
	}

	.scroll-reveal.visible {
		opacity: 1;
		transform: translateY(0);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.scroll-reveal {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
