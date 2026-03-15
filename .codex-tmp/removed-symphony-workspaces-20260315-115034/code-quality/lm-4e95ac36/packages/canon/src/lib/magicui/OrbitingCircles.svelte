<script lang="ts">
	/**
	 * OrbitingCircles - Animated orbiting elements
	 * 
	 * Creates elements that orbit around a central point.
	 * Port of MagicUI OrbitingCircles for Svelte.
	 * 
	 * @see https://magicui.design/docs/components/orbiting-circles
	 * @see https://animation-svelte.vercel.app/magic/orbiting-circles
	 * 
	 * @example
	 * <OrbitingCircles radius={80} duration={20}>
	 *   <IconSlot />
	 * </OrbitingCircles>
	 */
	import type { Snippet } from 'svelte';

	interface Props {
		/** Orbit radius in pixels */
		radius?: number;
		/** Animation duration in seconds */
		duration?: number;
		/** Animation delay in seconds */
		delay?: number;
		/** Reverse the orbit direction */
		reverse?: boolean;
		/** Starting angle offset in degrees */
		startAngle?: number;
		/** Additional CSS classes */
		class?: string;
		/** Children content (icon/element to orbit) */
		children?: Snippet;
	}

	let {
		radius = 80,
		duration = 20,
		delay = 0,
		reverse = false,
		startAngle = 0,
		class: className = '',
		children
	}: Props = $props();

	const direction = $derived(reverse ? 'reverse' : 'normal');
</script>

<div
	class="orbiting-circle {className}"
	style="
		--radius: {radius}px;
		--duration: {duration}s;
		--delay: {delay}s;
		--direction: {direction};
		--start-angle: {startAngle}deg;
	"
>
	{@render children?.()}
</div>

<style>
	.orbiting-circle {
		position: absolute;
		top: 50%;
		left: 50%;
		width: fit-content;
		height: fit-content;
		transform-origin: center;
		animation: orbit var(--duration) linear infinite var(--direction);
		animation-delay: var(--delay);
		/* Start from the correct position */
		--initial-x: calc(cos(var(--start-angle)) * var(--radius));
		--initial-y: calc(sin(var(--start-angle)) * var(--radius));
	}

	@keyframes orbit {
		0% {
			transform: 
				rotate(var(--start-angle)) 
				translateX(var(--radius)) 
				rotate(calc(-1 * var(--start-angle)));
		}
		100% {
			transform: 
				rotate(calc(var(--start-angle) + 360deg)) 
				translateX(var(--radius)) 
				rotate(calc(-1 * (var(--start-angle) + 360deg)));
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.orbiting-circle {
			animation: none;
			transform: 
				rotate(var(--start-angle)) 
				translateX(var(--radius)) 
				rotate(calc(-1 * var(--start-angle)));
		}
	}
</style>
