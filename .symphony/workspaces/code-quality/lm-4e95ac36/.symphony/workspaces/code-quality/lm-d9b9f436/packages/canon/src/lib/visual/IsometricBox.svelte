<script lang="ts">
	/**
	 * IsometricBox - A single isometric box primitive
	 *
	 * The fundamental building block of the visual canon.
	 * Three visible faces represent the three levels of the Subtractive Triad:
	 * - Top face: System view (Heidegger)
	 * - Left face: Artifact view (Rams)
	 * - Right face: Implementation view (DRY)
	 */

	import { isometricBoxPath } from './isometric.js';

	interface Props {
		cx?: number;
		cy?: number;
		width?: number;
		height?: number;
		depth?: number;
		strokeWidth?: number;
		animate?: boolean;
		delay?: number;
		class?: string;
	}

	let {
		cx = 0,
		cy = 0,
		width = 40,
		height = 40,
		depth = 40,
		strokeWidth = 1,
		animate = false,
		delay = 0,
		class: className = ''
	}: Props = $props();

	const paths = $derived(isometricBoxPath(cx, cy, width, height, depth));
</script>

<g class="isometric-box {className}" style:--delay="{delay}ms">
	<!-- Top face - lightest (receives most light) -->
	<path d={paths.top} class="face face-top" stroke-width={strokeWidth}>
		{#if animate}
			<animate
				attributeName="opacity"
				from="0"
				to="1"
				dur="400ms"
				begin="{delay}ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
	</path>

	<!-- Left face - medium -->
	<path d={paths.left} class="face face-left" stroke-width={strokeWidth}>
		{#if animate}
			<animate
				attributeName="opacity"
				from="0"
				to="1"
				dur="400ms"
				begin="{delay + 50}ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
	</path>

	<!-- Right face - darkest (shadow side) -->
	<path d={paths.right} class="face face-right" stroke-width={strokeWidth}>
		{#if animate}
			<animate
				attributeName="opacity"
				from="0"
				to="1"
				dur="400ms"
				begin="{delay + 100}ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
	</path>
</g>

<style>
	.isometric-box {
		--face-stroke: var(--color-fg-muted, rgba(255, 255, 255, 0.4));
	}

	.face {
		stroke: var(--face-stroke);
		transition: fill var(--duration-micro, 200ms) var(--ease-standard, ease);
	}

	.face-top {
		fill: var(--color-fg-subtle, rgba(255, 255, 255, 0.2));
	}

	.face-left {
		fill: var(--color-bg-subtle, rgba(255, 255, 255, 0.1));
	}

	.face-right {
		fill: var(--color-bg-elevated, rgba(255, 255, 255, 0.05));
	}
</style>
