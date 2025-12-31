<script lang="ts">
	// Local ScrollReveal component
	// Uses IntersectionObserver to reveal sections on scroll
	import { onMount } from 'svelte';

	interface Props {
		delay?: number;
		threshold?: number;
		children: any;
	}

	let { delay = 0, threshold = 0.1, children }: Props = $props();

	let element: HTMLElement;
	let visible = $state(false);

	onMount(() => {
		// Respect reduced motion
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) {
			visible = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setTimeout(() => {
							visible = true;
						}, delay);
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold }
		);

		if (element) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	});
</script>

<div bind:this={element} class="scroll-reveal" class:visible>
	{@render children()}
</div>

<style>
	.scroll-reveal {
		opacity: 0;
		transform: translateY(30px);
		transition: opacity 700ms cubic-bezier(0.0, 0.0, 0.2, 1),
					transform 700ms cubic-bezier(0.0, 0.0, 0.2, 1);
	}

	.scroll-reveal.visible {
		opacity: 1;
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.scroll-reveal {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
