<script lang="ts">
	/**
	 * StaggerContainer - Staggered entrance animations for children
	 *
	 * Wraps children and animates them in sequence when visible.
	 * Uses CSS custom properties for stagger timing.
	 *
	 * @example
	 * <StaggerContainer>
	 *   <StaggerItem><Card>First</Card></StaggerItem>
	 *   <StaggerItem><Card>Second</Card></StaggerItem>
	 *   <StaggerItem><Card>Third</Card></StaggerItem>
	 * </StaggerContainer>
	 */
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		/** Delay between each child animation in ms */
		staggerDelay?: number;
		/** Initial delay before first child animates */
		initialDelay?: number;
		/** When to trigger (0-1) */
		threshold?: number;
		/** Only animate once */
		once?: boolean;
		/** Additional classes */
		class?: string;
		/** Children */
		children?: import('svelte').Snippet;
	}

	let {
		staggerDelay = 100,
		initialDelay = 0,
		threshold = 0.2,
		once = true,
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

		// If user prefers reduced motion, show immediately
		if (prefersReducedMotion) {
			isVisible = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (initialDelay > 0) {
							setTimeout(() => {
								isVisible = true;
							}, initialDelay);
						} else {
							isVisible = true;
						}

						if (once) {
							observer.unobserve(element);
						}
					} else if (!once) {
						isVisible = false;
					}
				});
			},
			{ threshold }
		);

		observer.observe(element);

		return () => observer.disconnect();
	});
</script>

<div
	bind:this={element}
	class="stagger-container {className}"
	class:visible={isVisible}
	class:reduced-motion={prefersReducedMotion}
	style="--stagger-delay: {staggerDelay}ms;"
>
	{@render children?.()}
</div>

<style>
	.stagger-container {
		/* Container doesn't animate, children do */
	}

	/* Children get stagger delays via CSS counter */
	.stagger-container :global(.stagger-item) {
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)),
			transform var(--duration-standard, 300ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.stagger-container.visible :global(.stagger-item) {
		opacity: 1;
		transform: translateY(0);
	}

	/* Apply stagger delay to each child */
	.stagger-container.visible :global(.stagger-item:nth-child(1)) {
		transition-delay: calc(var(--stagger-delay) * 0);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(2)) {
		transition-delay: calc(var(--stagger-delay) * 1);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(3)) {
		transition-delay: calc(var(--stagger-delay) * 2);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(4)) {
		transition-delay: calc(var(--stagger-delay) * 3);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(5)) {
		transition-delay: calc(var(--stagger-delay) * 4);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(6)) {
		transition-delay: calc(var(--stagger-delay) * 5);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(7)) {
		transition-delay: calc(var(--stagger-delay) * 6);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(8)) {
		transition-delay: calc(var(--stagger-delay) * 7);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(9)) {
		transition-delay: calc(var(--stagger-delay) * 8);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(10)) {
		transition-delay: calc(var(--stagger-delay) * 9);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(11)) {
		transition-delay: calc(var(--stagger-delay) * 10);
	}
	.stagger-container.visible :global(.stagger-item:nth-child(12)) {
		transition-delay: calc(var(--stagger-delay) * 11);
	}

	/* Reduced motion - show immediately */
	.stagger-container.reduced-motion :global(.stagger-item) {
		opacity: 1;
		transform: none;
		transition: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.stagger-container :global(.stagger-item) {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
