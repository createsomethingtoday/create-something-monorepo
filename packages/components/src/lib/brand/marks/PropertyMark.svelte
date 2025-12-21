<script lang="ts">
	/**
	 * PropertyMark - CREATE SOMETHING Property Identifier
	 *
	 * Displays property-specific marks (.io, .ltd, .space, .agency, .lms)
	 * with support for full, abbreviated, and icon-only variants.
	 *
	 * "Good design is as little design as possible" - Dieter Rams
	 *
	 * @example
	 * <PropertyMark property="io" />
	 * <PropertyMark property="ltd" variant="full" showCube />
	 * <PropertyMark property="space" variant="abbreviated" size="lg" />
	 */

	import type { PropertyMarkProps, BrandSize } from '../types.js';
	import { BRAND_SIZE_MAP } from '../types.js';

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props extends PropertyMarkProps {
		/** Additional CSS classes */
		class?: string;
	}

	let {
		property,
		variant = 'full',
		showCube = false,
		size = 'md',
		animate = false,
		animationType = 'none',
		class: className = ''
	}: Props = $props();

	// Resolve size to pixels
	const sizeInPx = $derived(
		typeof size === 'number' ? size : BRAND_SIZE_MAP[size as BrandSize]
	);

	// Animation class
	const animationClass = $derived(
		animate && animationType !== 'none' ? `mark-${animationType}` : ''
	);

	// =============================================================================
	// PROPERTY MAPPINGS
	// =============================================================================

	/**
	 * Full property names
	 */
	const PROPERTY_NAMES = {
		io: 'CREATE SOMETHING.io',
		ltd: 'CREATE SOMETHING.ltd',
		space: 'CREATE SOMETHING.space',
		agency: 'CREATE SOMETHING.agency',
		lms: 'CREATE SOMETHING.lms'
	} as const;

	/**
	 * Abbreviated property marks (just the TLD extension)
	 */
	const PROPERTY_ABBREVIATED = {
		io: '.io',
		ltd: '.ltd',
		space: '.space',
		agency: '.agency',
		lms: '.lms'
	} as const;

	/**
	 * Property-specific accent colors (from Canon data visualization palette)
	 * Each property has a unique color identity
	 */
	const PROPERTY_COLORS = {
		io: 'var(--color-data-1)', // Blue - Research/Tools
		ltd: 'var(--color-fg-primary)', // White - Philosophy/Canon (pure, authoritative)
		space: 'var(--color-data-3)', // Purple - Practice/Experiments
		agency: 'var(--color-data-4)', // Amber - Services/Client work
		lms: 'var(--color-data-2)' // Green - Learning
	} as const;

	// Derived values
	const displayText = $derived(
		variant === 'full'
			? PROPERTY_NAMES[property]
			: variant === 'abbreviated'
				? PROPERTY_ABBREVIATED[property]
				: ''
	);

	const propertyColor = $derived(PROPERTY_COLORS[property]);
</script>

<span
	class="property-mark property-{property} variant-{variant} {animationClass} {className}"
	style="--mark-size: {sizeInPx}px; --property-color: {propertyColor}"
	aria-label="{PROPERTY_NAMES[property]}"
>
	{#if showCube}
		<svg
			viewBox="0 0 32 32"
			class="cube-icon"
			aria-hidden="true"
		>
			<path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" class="face-top" />
			<path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" class="face-left" />
			<path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" class="face-right" />
		</svg>
	{/if}

	{#if variant === 'icon'}
		<!-- Icon-only: show first letter of property in a styled badge -->
		<span class="property-icon">{property.charAt(0).toUpperCase()}</span>
	{:else}
		<span class="property-text">{displayText}</span>
	{/if}
</span>

<style>
	.property-mark {
		display: inline-flex;
		align-items: center;
		gap: calc(var(--mark-size, 32px) * 0.25);
		font-family: var(--font-sans);
		font-weight: var(--font-medium);
		line-height: 1;
	}

	/* Cube icon sizing */
	.cube-icon {
		width: var(--mark-size, 32px);
		height: var(--mark-size, 32px);
		flex-shrink: 0;
	}

	/* Face colors following Canon opacities, tinted by property */
	.face-top {
		fill: var(--property-color);
		opacity: 1;
	}

	.face-left {
		fill: var(--property-color);
		opacity: 0.6;
	}

	.face-right {
		fill: var(--property-color);
		opacity: 0.3;
	}

	/* Text sizing based on mark size */
	.property-text {
		font-size: calc(var(--mark-size, 32px) * 0.5);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight);
	}

	/* Abbreviated variant gets property color accent */
	.variant-abbreviated .property-text {
		color: var(--property-color);
		font-weight: var(--font-semibold);
	}

	/* Full variant: base text white, extension in property color */
	.variant-full .property-text {
		color: var(--color-fg-primary);
	}

	/* Icon variant */
	.property-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--mark-size, 32px);
		height: var(--mark-size, 32px);
		font-size: calc(var(--mark-size, 32px) * 0.5);
		font-weight: var(--font-bold);
		color: var(--color-bg-pure);
		background: var(--property-color);
		border-radius: var(--radius-sm);
	}

	/* ==========================================================================
	   Animations
	   ========================================================================== */

	.mark-reveal .property-text,
	.mark-reveal .property-icon {
		animation: mark-reveal var(--duration-complex) var(--ease-standard);
	}

	.mark-reveal .cube-icon {
		animation: cube-reveal var(--duration-complex) var(--ease-standard);
	}

	@keyframes mark-reveal {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes cube-reveal {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.mark-pulse .cube-icon {
		animation: mark-pulse var(--duration-complex) var(--ease-standard) infinite alternate;
	}

	@keyframes mark-pulse {
		from {
			opacity: 0.7;
		}
		to {
			opacity: 1;
		}
	}

	/* ==========================================================================
	   Reduced Motion
	   ========================================================================== */

	@media (prefers-reduced-motion: reduce) {
		.mark-reveal .property-text,
		.mark-reveal .property-icon,
		.mark-reveal .cube-icon,
		.mark-pulse .cube-icon {
			animation: none;
		}
	}
</style>
