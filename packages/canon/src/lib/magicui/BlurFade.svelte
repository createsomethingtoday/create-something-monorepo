<script lang="ts">
	/**
	 * BlurFade - Elegant blur + fade entrance animation
	 * 
	 * Content fades in and blurs into focus as it enters the viewport.
	 * Port of MagicUI BlurFade for Svelte using IntersectionObserver.
	 * 
	 * @example
	 * <BlurFade delay={0.2}>
	 *   <h1>Hello World</h1>
	 * </BlurFade>
	 */
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	
	interface Props {
		class?: string;
		duration?: number;
		delay?: number;
		yOffset?: number;
		blur?: string;
		inView?: boolean;
		inViewMargin?: string;
		children?: Snippet;
	}
	
	let {
		class: className = '',
		duration = 0.4,
		delay = 0,
		yOffset = 6,
		blur = '6px',
		inView = true,
		inViewMargin = '-50px',
		children
	}: Props = $props();
	
	let element: HTMLElement;
	let isVisible = $state(true);
	let shouldAnimate = $state(false);

	function isInViewport(node: HTMLElement) {
		const rect = node.getBoundingClientRect();
		return rect.bottom > 0 && rect.top < window.innerHeight;
	}
	
	onMount(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!inView || reducedMotion) {
			isVisible = true;
			return;
		}

		shouldAnimate = true;

		if (isInViewport(element)) {
			isVisible = true;
			return;
		}

		isVisible = false;

		if (!('IntersectionObserver' in window)) {
			isVisible = true;
			return;
		}
		
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isVisible = true;
						observer.unobserve(entry.target);
					}
				});
			},
			{ 
				rootMargin: inViewMargin,
				threshold: 0.1
			}
		);
		
		observer.observe(element);
		
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={element}
	class="blur-fade {className}"
	class:blur-fade--animate={shouldAnimate}
	class:visible={isVisible}
	style="
		--duration: {duration}s;
		--delay: {0.04 + delay}s;
		--y-offset: {yOffset}px;
		--blur: {blur};
	"
>
	{@render children?.()}
</div>

<style>
	.blur-fade {
		opacity: 1;
		filter: none;
		transform: translateY(0);
	}

	.blur-fade.blur-fade--animate {
		opacity: 0;
		filter: blur(var(--blur));
		transform: translateY(var(--y-offset));
		transition: 
			opacity var(--duration) ease-out var(--delay),
			filter var(--duration) ease-out var(--delay),
			transform var(--duration) ease-out var(--delay);
	}
	
	.blur-fade.blur-fade--animate.visible {
		opacity: 1;
		filter: blur(0px);
		transform: translateY(0);
	}
	
	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.blur-fade {
			opacity: 1;
			filter: none;
			transform: none;
			transition: none;
		}
	}
</style>
