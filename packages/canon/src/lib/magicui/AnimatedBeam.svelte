<script lang="ts">
	/**
	 * AnimatedBeam - Animated connection line between elements
	 * 
	 * Creates an animated beam/line effect between two points.
	 * Port of MagicUI AnimatedBeam for Svelte.
	 * 
	 * @see https://magicui.design/docs/components/animated-beam
	 * 
	 * @example
	 * <AnimatedBeam 
	 *   fromX={100} fromY={50}
	 *   toX={300} toY={50}
	 *   gradientStartColor="#9333ea"
	 *   gradientStopColor="#3b82f6"
	 * />
	 */
	import { browser } from '$app/environment';

	interface Props {
		/** Starting X position */
		fromX?: number;
		/** Starting Y position */
		fromY?: number;
		/** Ending X position */
		toX?: number;
		/** Ending Y position */
		toY?: number;
		/** Curvature of the beam (0 = straight) */
		curvature?: number;
		/** Animation duration in seconds */
		duration?: number;
		/** Beam width */
		pathWidth?: number;
		/** Gradient start color */
		gradientStartColor?: string;
		/** Gradient stop color */
		gradientStopColor?: string;
		/** Reverse animation direction */
		reverse?: boolean;
		/** Animation delay in seconds */
		delay?: number;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		fromX = 0,
		fromY = 50,
		toX = 200,
		toY = 50,
		curvature = 0,
		duration = 2,
		pathWidth = 2,
		gradientStartColor = '#9333ea',
		gradientStopColor = '#3b82f6',
		reverse = false,
		delay = 0,
		class: className = ''
	}: Props = $props();

	// Generate unique ID
	const id = browser ? crypto.randomUUID().replace(/-/g, '').slice(0, 8) : 'ssr';

	// Calculate control points for curve
	const midX = $derived((fromX + toX) / 2);
	const midY = $derived((fromY + toY) / 2 + curvature);

	// SVG path for quadratic bezier curve
	const pathD = $derived(
		curvature !== 0
			? `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`
			: `M ${fromX} ${fromY} L ${toX} ${toY}`
	);
</script>

<svg
	class="animated-beam {className}"
	style="
		--duration: {duration}s;
		--delay: {delay}s;
	"
	aria-hidden="true"
>
	<defs>
		<!-- Gradient for the beam -->
		<linearGradient
			id="beam-gradient-{id}"
			x1={reverse ? '100%' : '0%'}
			y1="0%"
			x2={reverse ? '0%' : '100%'}
			y2="0%"
		>
			<stop offset="0%" stop-color={gradientStartColor} stop-opacity="0" />
			<stop offset="50%" stop-color={gradientStartColor} stop-opacity="1" />
			<stop offset="100%" stop-color={gradientStopColor} stop-opacity="0" />
		</linearGradient>

		<!-- Mask for the animated beam -->
		<mask id="beam-mask-{id}">
			<rect class="beam-mask-rect" x="0" y="0" width="100%" height="100%" fill="white" />
		</mask>
	</defs>

	<!-- Background path (static, subtle) -->
	<path
		d={pathD}
		fill="none"
		stroke="rgba(255, 255, 255, 0.1)"
		stroke-width={pathWidth}
		stroke-linecap="round"
	/>

	<!-- Animated beam path -->
	<path
		d={pathD}
		fill="none"
		stroke="url(#beam-gradient-{id})"
		stroke-width={pathWidth}
		stroke-linecap="round"
		class="beam-path"
	/>
</svg>

<style>
	.animated-beam {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: visible;
	}

	.beam-path {
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		animation: beam-flow var(--duration) ease-in-out infinite;
		animation-delay: var(--delay);
	}

	@keyframes beam-flow {
		0% {
			stroke-dashoffset: 100;
			opacity: 0;
		}
		20% {
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			stroke-dashoffset: -100;
			opacity: 0;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.beam-path {
			animation: none;
			stroke-dashoffset: 0;
			opacity: 0.5;
		}
	}
</style>
