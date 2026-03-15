<script lang="ts">
	/**
	 * CubeMark - The CREATE SOMETHING Isometric Cube Logo Mark
	 *
	 * The core brand mark: an isometric cube with Canon face opacities.
	 * Supports multiple animation variants: reveal, pulse, and assemble.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 *
	 * @example
	 * <CubeMark />
	 * <CubeMark size="lg" animate animationType="reveal" />
	 * <CubeMark variant="mono" size={48} />
	 */

	import type { BrandMarkProps, BrandSize } from '../types.js';
	import { BRAND_SIZE_MAP, CUBE_FACE_OPACITY } from '../types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props extends BrandMarkProps {
		/** Visual variant: standard (Canon opacities) or mono (single color) */
		variant?: 'standard' | 'mono';
	}

	let {
		size = 'md',
		animate = false,
		animationType = 'none',
		variant = 'standard',
		class: className = ''
	}: Props = $props();

	// Resolve size to pixels
	const sizeInPx = $derived(
		typeof size === 'number' ? size : BRAND_SIZE_MAP[size as BrandSize]
	);

	// Animation class based on type
	const animationClass = $derived(
		animate && animationType !== 'none' ? `cube-${animationType}` : ''
	);

	// =============================================================================
	// CUBE GEOMETRY
	// =============================================================================

	/**
	 * Standard isometric cube paths for a 32x32 viewBox.
	 * Centered at (16, 16) with the cube filling the space appropriately.
	 *
	 * The cube is drawn with the top face representing "creation" (brightest),
	 * left face representing "understanding" (medium), and right face
	 * representing "foundation" (subtle).
	 */
	const CUBE_PATHS = {
		top: 'M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z',
		left: 'M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z',
		right: 'M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z'
	} as const;

	// Face opacities from Canon
	const topOpacity = $derived(variant === 'mono' ? 1 : CUBE_FACE_OPACITY.top);
	const leftOpacity = $derived(variant === 'mono' ? 0.8 : CUBE_FACE_OPACITY.left);
	const rightOpacity = $derived(variant === 'mono' ? 0.6 : CUBE_FACE_OPACITY.right);
</script>

<svg
	viewBox="0 0 32 32"
	class="cube-mark {animationClass} {className}"
	style="--cube-size: {sizeInPx}px"
	aria-label="CREATE SOMETHING"
	role="img"
>
	<!-- Top face - Creation (brightest) -->
	<path
		d={CUBE_PATHS.top}
		class="face-top"
		style="--face-opacity: {topOpacity}"
	>
		{#if animate && animationType === 'reveal'}
			<animate
				attributeName="opacity"
				from="0"
				to={topOpacity}
				dur="500ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
	</path>

	<!-- Left face - Understanding (medium) -->
	<path
		d={CUBE_PATHS.left}
		class="face-left"
		style="--face-opacity: {leftOpacity}"
	>
		{#if animate && animationType === 'reveal'}
			<animate
				attributeName="opacity"
				from="0"
				to={leftOpacity}
				dur="500ms"
				begin="100ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
		{#if animate && animationType === 'assemble'}
			<animate
				attributeName="opacity"
				values="0;{leftOpacity};{leftOpacity}"
				keyTimes="0;0.5;1"
				dur="500ms"
				begin="150ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
			/>
			<animateTransform
				attributeName="transform"
				type="translate"
				from="-10 5"
				to="0 0"
				dur="500ms"
				begin="150ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
	</path>

	<!-- Right face - Foundation (subtle) -->
	<path
		d={CUBE_PATHS.right}
		class="face-right"
		style="--face-opacity: {rightOpacity}"
	>
		{#if animate && animationType === 'reveal'}
			<animate
				attributeName="opacity"
				from="0"
				to={rightOpacity}
				dur="500ms"
				begin="200ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
		{#if animate && animationType === 'assemble'}
			<animate
				attributeName="opacity"
				values="0;{rightOpacity};{rightOpacity}"
				keyTimes="0;0.5;1"
				dur="500ms"
				begin="300ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
			/>
			<animateTransform
				attributeName="transform"
				type="translate"
				from="10 5"
				to="0 0"
				dur="500ms"
				begin="300ms"
				fill="freeze"
				calcMode="spline"
				keySplines="0.4 0 0.2 1"
			/>
		{/if}
	</path>

	<!-- Top face assemble animation (separate to ensure proper stacking) -->
	{#if animate && animationType === 'assemble'}
		<g class="face-top-assemble">
			<path d={CUBE_PATHS.top} style="--face-opacity: {topOpacity}">
				<animate
					attributeName="opacity"
					values="0;{topOpacity};{topOpacity}"
					keyTimes="0;0.5;1"
					dur="500ms"
					fill="freeze"
					calcMode="spline"
					keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
				/>
				<animateTransform
					attributeName="transform"
					type="translate"
					from="0 -10"
					to="0 0"
					dur="500ms"
					fill="freeze"
					calcMode="spline"
					keySplines="0.4 0 0.2 1"
				/>
			</path>
		</g>
	{/if}
</svg>

<style>
	.cube-mark {
		width: var(--cube-size, 32px);
		height: var(--cube-size, 32px);
		display: inline-block;
		vertical-align: middle;
	}

	/* ==========================================================================
	   Face Colors - Canon Opacities
	   ========================================================================== */

	.face-top {
		fill: var(--color-fg-primary);
		opacity: var(--face-opacity, 1);
	}

	.face-left {
		fill: var(--color-fg-primary);
		opacity: var(--face-opacity, 0.6);
	}

	.face-right {
		fill: var(--color-fg-primary);
		opacity: var(--face-opacity, 0.3);
	}

	.face-top-assemble path {
		fill: var(--color-fg-primary);
		opacity: var(--face-opacity, 1);
	}

	/* ==========================================================================
	   Reveal Animation (CSS fallback for non-SMIL browsers)
	   ========================================================================== */

	.cube-reveal .face-top,
	.cube-reveal .face-left,
	.cube-reveal .face-right {
		animation: face-reveal var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) forwards;
	}

	.cube-reveal .face-top {
		animation-delay: 0ms;
	}

	.cube-reveal .face-left {
		animation-delay: 100ms;
	}

	.cube-reveal .face-right {
		animation-delay: 200ms;
	}

	@keyframes face-reveal {
		from {
			opacity: 0;
		}
		to {
			opacity: var(--face-opacity, 1);
		}
	}

	/* ==========================================================================
	   Pulse Animation
	   ========================================================================== */

	.cube-pulse {
		animation: cube-pulse var(--duration-complex, 500ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1)) infinite alternate;
	}

	@keyframes cube-pulse {
		from {
			opacity: 0.6;
			transform: scale(0.97);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* ==========================================================================
	   Assemble Animation (CSS fallback)
	   ========================================================================== */

	.cube-assemble .face-top {
		opacity: 0;
	}

	.cube-assemble .face-left {
		opacity: 0;
	}

	.cube-assemble .face-right {
		opacity: 0;
	}

	/* ==========================================================================
	   Reduced Motion
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.cube-mark,
		.cube-mark .face-top,
		.cube-mark .face-left,
		.cube-mark .face-right {
			animation: none !important;
		}

		/* Restore standard opacities */
		.cube-mark .face-top {
			opacity: var(--face-opacity, 1);
		}

		.cube-mark .face-left {
			opacity: var(--face-opacity, 0.6);
		}

		.cube-mark .face-right {
			opacity: var(--face-opacity, 0.3);
		}

		/* Hide SMIL animations */
		.cube-mark animate,
		.cube-mark animateTransform {
			display: none;
		}
	}
</style>
