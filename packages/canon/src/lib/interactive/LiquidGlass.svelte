<script lang="ts">
	/**
	 * LiquidGlass - Apple-style glass with refraction effect
	 *
	 * Unlike standard frosted glass (blur only), Liquid Glass:
	 * 1. Refracts/warps background via SVG displacement filter
	 * 2. Adds highlight layers simulating light reflection
	 * 3. Creates depth with inner shadows and edge glow
	 *
	 * Philosophy: The cockpit of the automation vehicle.
	 * Like the 930's driver-centric layout: minimal, focused, everything angled toward your destination.
	 * This is Zuhandenheit made visual: the controls recede, the journey remains.
	 *
	 * @see https://css-tricks.com/getting-clarity-on-apples-liquid-glass/
	 *
	 * @example
	 * <LiquidGlass intensity="medium" tint="purple">
	 *   <h3>Workflow Card</h3>
	 *   <p>Your automation runs here</p>
	 * </LiquidGlass>
	 */
	import { browser } from '$app/environment';

	type Intensity = 'subtle' | 'medium' | 'strong';
	type Tint = 'none' | 'purple' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';
	type BorderRadius = 'sm' | 'md' | 'lg' | 'xl';
	type AspectRatio = 'auto' | 'video' | 'square';

	interface Props {
		/** Refraction intensity - how much the background warps */
		intensity?: Intensity;
		/** Semantic color tint */
		tint?: Tint;
		/** Show highlight reflection layers */
		highlight?: boolean;
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
		intensity = 'medium',
		tint = 'none',
		highlight = true,
		borderRadius = 'lg',
		aspectRatio = 'auto',
		padding = 'var(--space-lg)',
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

	// Tint color mapping
	const tintColors: Record<Exclude<Tint, 'none'>, string> = {
		purple: 'var(--liquid-glass-tint-purple, #a78bfa)',
		blue: 'var(--liquid-glass-tint-blue, #60a5fa)',
		emerald: 'var(--liquid-glass-tint-emerald, #34d399)',
		amber: 'var(--liquid-glass-tint-amber, #fbbf24)',
		rose: 'var(--liquid-glass-tint-rose, #fb7185)',
		cyan: 'var(--liquid-glass-tint-cyan, #22d3ee)'
	};

	// Compute background color with tint
	const bgColor = $derived(
		tint !== 'none'
			? `color-mix(in srgb, ${tintColors[tint]} var(--liquid-glass-tint-mix-standard, 12%), var(--glass-bg-light))`
			: 'var(--glass-bg-light)'
	);

	// Compute border color with tint
	const borderColor = $derived(
		tint !== 'none'
			? `color-mix(in srgb, ${tintColors[tint]} 25%, var(--glass-border-medium))`
			: 'var(--glass-border-medium)'
	);
</script>

<div
	class="liquid-glass radius-{borderRadius} aspect-{aspectRatio} {className}"
	style:--lg-bg-color={bgColor}
	style:--lg-border-color={borderColor}
	style:--lg-padding={padding}
>
	<!-- SVG Filter Definition -->
	{#if browser && !prefersReducedMotion}
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

	<!-- Background layer with refraction -->
	<div
		class="refraction-layer"
		class:has-refraction={browser && !prefersReducedMotion}
		style:filter={browser && !prefersReducedMotion ? `url(#refraction-${filterId})` : 'none'}
		aria-hidden="true"
	></div>

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

	/* Background layer with glass effect */
	.refraction-layer {
		position: absolute;
		inset: 0;
		backdrop-filter: blur(var(--glass-blur-lg)) var(--glass-saturate-lg);
		background-color: var(--lg-bg-color);
		border-radius: inherit;
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
		background: var(--liquid-glass-highlight-primary);
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
		background: var(--liquid-glass-edge-glow);
		pointer-events: none;
	}

	/* Inner shadow for depth */
	.inner-shadow {
		position: absolute;
		inset: 0;
		box-shadow: var(--liquid-glass-inner-shadow);
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
		border-radius: var(--radius-sm, 6px);
	}
	.liquid-glass.radius-md {
		border-radius: var(--radius-md, 8px);
	}
	.liquid-glass.radius-lg {
		border-radius: var(--radius-lg, 12px);
	}
	.liquid-glass.radius-xl {
		border-radius: var(--radius-xl, 16px);
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
		.refraction-layer {
			filter: none !important;
		}
	}

	/* Reduced transparency - solid background fallback */
	@media (prefers-reduced-transparency: reduce) {
		.refraction-layer {
			backdrop-filter: none;
			background-color: var(--color-bg-surface);
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: more) {
		.refraction-layer {
			backdrop-filter: blur(var(--glass-blur-sm));
			background-color: rgba(0, 0, 0, 0.85);
		}

		.border-layer {
			border-color: rgba(255, 255, 255, 0.3);
		}
	}

	/* Mobile performance optimization */
	@media (max-width: 768px) {
		.refraction-layer {
			backdrop-filter: blur(24px) saturate(120%);
			/* Disable SVG filter on mobile for performance */
			filter: none !important;
		}
	}
</style>
