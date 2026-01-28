<script lang="ts">
	/**
	 * ScrollRevealStagger - Cascading Entrance
	 *
	 * Elements reveal sequentially on scroll.
	 * Creates rhythm through timing, not decoration.
	 *
	 * Pattern: Typography Principles (Obys) 7.73 SOTD
	 * Canon: Motion reveals structure
	 */

	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	interface Props {
		children: import('svelte').Snippet;
		delay?: number; // Delay between items (ms)
		threshold?: number; // Intersection threshold (0-1)
	}

	let { children, delay = 100, threshold = 0.2 }: Props = $props();

	let container: HTMLElement | undefined = $state();
	let visible = $state(false);

	onMount(() => {
		if (!browser || !container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						visible = true;
						observer.disconnect();
					}
				});
			},
			{ threshold }
		);

		observer.observe(container);

		return () => observer.disconnect();
	});
</script>

<div bind:this={container} class="scroll-reveal-stagger" class:visible>
	{@render children()}
</div>

<style>
	.scroll-reveal-stagger {
		/* Container doesn't need styles - children handle their own reveal */
	}

	/* Direct children cascade in */
	.scroll-reveal-stagger.visible :global(> *) {
		opacity: 0;
		transform: translateY(20px);
		animation: cascade-in var(--duration-standard) var(--ease-standard) forwards;
	}

	/* Stagger each child using nth-child */
	.scroll-reveal-stagger.visible :global(> *:nth-child(1)) {
		animation-delay: calc(var(--cascade-step) * 0);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(2)) {
		animation-delay: calc(var(--cascade-step) * 1);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(3)) {
		animation-delay: calc(var(--cascade-step) * 2);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(4)) {
		animation-delay: calc(var(--cascade-step) * 3);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(5)) {
		animation-delay: calc(var(--cascade-step) * 4);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(6)) {
		animation-delay: calc(var(--cascade-step) * 5);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(7)) {
		animation-delay: calc(var(--cascade-step) * 6);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(8)) {
		animation-delay: calc(var(--cascade-step) * 7);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(9)) {
		animation-delay: calc(var(--cascade-step) * 8);
	}
	.scroll-reveal-stagger.visible :global(> *:nth-child(10)) {
		animation-delay: calc(var(--cascade-step) * 9);
	}

	@keyframes cascade-in {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduced motion: show immediately */
	@media (prefers-reduced-motion: reduce) {
		.scroll-reveal-stagger :global(> *) {
			opacity: 1 !important;
			transform: none !important;
			animation: none !important;
		}
	}
</style>
