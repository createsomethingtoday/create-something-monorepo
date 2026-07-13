<script lang="ts">
	/**
	 * LiquidGlass - Apple-style glass with optional refraction effect
	 *
	 * Three modes:
	 * - solid: Clean solid background (matches ShimmerButton style)
	 * - smooth: Frosted glass with blur only - no texture
	 * - refraction: Adds SVG displacement filter for organic warping
	 *
	 * All modes include:
	 * - Highlight layers simulating light reflection
	 * - Depth with inner shadows and edge glow
	 *
	 * Philosophy: The cockpit of the automation vehicle.
	 * Like the 930's driver-centric layout: minimal, focused, everything angled toward your destination.
	 * This is Zuhandenheit made visual: the controls recede, the journey remains.
	 *
	 * @see https://css-tricks.com/getting-clarity-on-apples-liquid-glass/
	 *
	 * @example
	 * // Solid mode - clean dark background, matches button style
	 * <LiquidGlass mode="solid">
	 *   <h3>Workflow Card</h3>
	 * </LiquidGlass>
	 *
	 * @example
	 * // Smooth glass - frosted blur effect
	 * <LiquidGlass mode="smooth" tint="purple">
	 *   <h3>Workflow Card</h3>
	 * </LiquidGlass>
	 *
	 * @example
	 * // Refraction glass - organic warping texture
	 * <LiquidGlass mode="refraction" intensity="medium">
	 *   <h3>Hero Element</h3>
	 * </LiquidGlass>
	 */
	import { browser } from '$app/environment';
	import AnimatedGridPattern from '../magicui/AnimatedGridPattern.svelte';

	type Mode = 'smooth' | 'refraction' | 'solid';
	type Intensity = 'subtle' | 'medium' | 'strong';
	type Tint = 'none' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';
	type BorderRadius = 'sm' | 'md' | 'lg' | 'xl';
	type AspectRatio = 'auto' | 'video' | 'square';

	interface Props {
		/** Glass mode: 'solid' (clean dark bg), 'smooth' (blur), or 'refraction' (warping) */
		mode?: Mode;
		/** Refraction intensity - only applies when mode='refraction' */
		intensity?: Intensity;
		/** Semantic color tint */
		tint?: Tint;
		/** Show highlight reflection layers */
		highlight?: boolean;
		/** Show animated grid pattern background (works best with solid mode) */
		showGrid?: boolean;
		/** Border radius size */
		borderRadius?: BorderRadius;
		/** Aspect ratio constraint */
		aspectRatio?: AspectRatio;
		/** Custom padding override */
		padding?: string;
		/** Additional CSS classes */
		class?: string;
		/** Children content */
		children?: import('svelte').Snippet;
	}

	let {
		mode = 'smooth',
		intensity = 'medium',
		tint = 'none',
		highlight = true,
		showGrid = false,
		borderRadius = 'lg',
		aspectRatio = 'auto',
		padding = 'var(--space-performance-lg)',
		class: className = '',
		children
	}: Props = $props();

	// Generate unique filter ID for this instance
	const filterId = browser ? crypto.randomUUID().replace(/-/g, '') : 'ssr';

	// Refraction scale values from design system
	const refractionScale: Record<Intensity, number> = {
		subtle: 4,
		medium: 8,
		strong: 14
	};

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	// Determine if we should use refraction
	const useRefraction = $derived(mode === 'refraction' && browser && !prefersReducedMotion);

	// Tint color mapping
	const tintColors: Record<Exclude<Tint, 'none'>, string> = {
		purple: 'var(--liquid-glass-performance-tint-purple, #a78bfa)',
		blue: 'var(--liquid-glass-performance-tint-blue, #60a5fa)',
		emerald: 'var(--liquid-glass-performance-tint-emerald, #34d399)',
		amber: 'var(--liquid-glass-performance-tint-amber, #fbbf24)',
		rose: 'var(--liquid-glass-performance-tint-rose, #fb7185)',
		cyan: 'var(--liquid-glass-performance-tint-cyan, #22d3ee)'
	};

	// Compute background color with tint
	const bgColor = $derived(
		tint !== 'none'
			? `color-mix(in srgb, ${tintColors[tint]} var(--liquid-glass-performance-tint-mix-standard, 12%), var(--glass-performance-bg-light))`
			: 'var(--glass-performance-bg-light)'
	);

	// Compute border color with tint
	const borderColor = $derived(
		tint !== 'none'
			? `color-mix(in srgb, ${tintColors[tint]} 25%, var(--glass-performance-border-medium))`
			: 'var(--glass-performance-border-medium)'
	);
</script>

<div
	class="liquid-glass radius-{borderRadius} aspect-{aspectRatio} {className}"
	class:mode-solid={mode === 'solid'}
	class:mode-smooth={mode === 'smooth'}
	class:mode-refraction={mode === 'refraction'}
	style:--lg-bg-color={bgColor}
	style:--lg-border-color={borderColor}
	style:--lg-padding={padding}
>
	<!-- SVG Filter Definition (only for refraction mode) -->
	{#if useRefraction}
		<svg class="filter-defs" aria-hidden="true">
			<defs>
				<filter id="refraction-{filterId}" x="-20%" y="-20%" width="140%" height="140%">
					<!-- Subtle turbulence for organic distortion -->
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.015"
						numOctaves="2"
						seed="42"
						result="noise"
					/>
					<!-- Displacement creates the "bending" effect -->
					<feDisplacementMap
						in="SourceGraphic"
						in2="noise"
						scale={refractionScale[intensity]}
						xChannelSelector="R"
						yChannelSelector="G"
					/>
				</filter>
			</defs>
		</svg>
	{/if}

	<!-- Background layer with optional refraction -->
	<div
		class="glass-layer"
		class:has-refraction={useRefraction}
		style:filter={useRefraction ? `url(#refraction-${filterId})` : 'none'}
		aria-hidden="true"
	></div>

	<!-- Animated grid pattern (optional) -->
	{#if showGrid}
		<AnimatedGridPattern
			numSquares={30}
			maxOpacity={0.08}
			duration={4}
			repeatDelay={1}
			class="grid-pattern"
		/>
	{/if}

	<!-- Glass border -->
	<div class="border-layer" aria-hidden="true"></div>

	<!-- Highlight layers (optional) -->
	{#if highlight}
		<!-- Top-left light reflection -->
		<div class="highlight-layer" aria-hidden="true"></div>

		<!-- Top edge glow (simulates overhead light) -->
		<div class="edge-glow" aria-hidden="true"></div>

		<!-- Inner shadow for depth -->
		<div class="inner-shadow" aria-hidden="true"></div>
	{/if}

	<!-- Content -->
	<div class="content">
		{@render children?.()}
	</div>
</div>

<style>
	.liquid-glass {
		position: relative;
		overflow: hidden;
	}

	/* SVG filter definitions - hidden but functional */
	.filter-defs {
		position: absolute;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	/* Glass layer - main backdrop blur effect */
	.glass-layer {
		position: absolute;
		inset: 0;
		background-color: var(--lg-bg-color);
		border-radius: inherit;
	}

	/* Solid mode - clean dark background (matches ShimmerButton) */
	.liquid-glass.mode-solid .glass-layer {
		background-color: rgba(0, 0, 0, 0.95);
		backdrop-filter: none;
	}

	/* Smooth mode - clean blur without texture */
	.liquid-glass.mode-smooth .glass-layer {
		backdrop-filter: blur(var(--glass-performance-blur-lg, 48px)) saturate(130%);
	}

	/* Refraction mode - blur with SVG displacement */
	.liquid-glass.mode-refraction .glass-layer {
		backdrop-filter: blur(var(--glass-performance-blur-lg, 48px)) var(--glass-performance-saturate-lg, saturate(120%));
	}

	/* Border layer */
	.border-layer {
		position: absolute;
		inset: 0;
		border: 1px solid var(--lg-border-color);
		border-radius: inherit;
		pointer-events: none;
	}

	/* Highlight shimmer layer */
	.highlight-layer {
		position: absolute;
		inset: 0;
		background: var(--liquid-glass-performance-highlight-primary);
		border-radius: inherit;
		pointer-events: none;
	}

	/* Top edge glow */
	.edge-glow {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--liquid-glass-performance-edge-glow);
		pointer-events: none;
	}

	/* Inner shadow for depth */
	.inner-shadow {
		position: absolute;
		inset: 0;
		box-shadow: var(--liquid-glass-performance-inner-shadow);
		border-radius: inherit;
		pointer-events: none;
	}

	/* Content container */
	.content {
		position: relative;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lg-padding);
	}

	/* Border radius variants */
	.liquid-glass.radius-sm {
		border-radius: var(--radius-performance-scale-sm, 6px);
	}
	.liquid-glass.radius-md {
		border-radius: var(--radius-performance-scale-md, 8px);
	}
	.liquid-glass.radius-lg {
		border-radius: var(--radius-performance-scale-lg, 12px);
	}
	.liquid-glass.radius-xl {
		border-radius: var(--radius-performance-scale-xl, 16px);
	}

	/* Aspect ratio variants */
	.liquid-glass.aspect-video {
		aspect-ratio: 16 / 9;
	}
	.liquid-glass.aspect-square {
		aspect-ratio: 1 / 1;
	}

	/* Reduced motion - disable refraction filter */
	@media (prefers-reduced-motion: reduce) {
		.glass-layer {
			filter: none !important;
		}
	}

	/* Reduced transparency - solid background fallback */
	@media (prefers-reduced-transparency: reduce) {
		.glass-layer {
			backdrop-filter: none;
			background-color: var(--color-performance-bg-surface);
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: more) {
		.glass-layer {
			backdrop-filter: blur(var(--glass-performance-blur-sm));
			background-color: rgba(0, 0, 0, 0.85);
		}

		.border-layer {
			border-color: rgba(255, 255, 255, 0.3);
		}
	}

	/* Mobile performance optimization */
	@media (max-width: 768px) {
		.glass-layer {
			backdrop-filter: blur(24px) saturate(120%);
			/* Disable SVG filter on mobile for performance */
			filter: none !important;
		}
	}
</style>
