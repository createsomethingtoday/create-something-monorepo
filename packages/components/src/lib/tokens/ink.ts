/**
 * Ink Framework - Tufte's Data-Ink Ratio for Mobile
 *
 * "Above all else, show the data." - Edward Tufte
 *
 * Philosophy: Golden Ratio (φ) for desktop, Tufte for mobile.
 * - Desktop: Generous spacing for visual breathing room
 * - Mobile: Maximize data-ink ratio, minimize padding
 *
 * Method: Apply φ⁻¹ (0.618×) scaling from desktop to mobile.
 * This maintains golden ratio proportions while being ~40% tighter on mobile.
 *
 * @see /STANDARDS.md - Section 1.6 Responsive Design
 * @packageDocumentation
 */

import { breakpoints, media } from './breakpoints.js';

/**
 * Ink density modes - progressive disclosure based on viewport
 */
export const inkDensity = {
	compact: 'compact', // Mobile: stack, hide secondary, tight spacing
	standard: 'standard', // Tablet: side-by-side, show context
	expanded: 'expanded' // Desktop: full detail, generous spacing
} as const;

export type InkDensity = keyof typeof inkDensity;

/**
 * Ink padding - Tufte-aligned responsive spacing
 *
 * Principle: Padding is non-data-ink. Minimize on mobile to maximize data.
 *
 * | Context   | Desktop (φ²) | Tablet (φ¹) | Mobile (φ⁰) |
 * |-----------|--------------|-------------|-------------|
 * | Container | 42px (lg)    | 26px (md)   | 16px (sm)   |
 * | Component | 26px (md)    | 16px (sm)   | 10px (xs)   |
 * | Cell      | 8px          | 6px         | 4px         |
 */
export const inkPadding = {
	// Container padding (page/section level)
	container: {
		compact: 'var(--space-sm)', // 16px mobile
		standard: 'var(--space-md)', // 26px tablet
		expanded: 'var(--space-lg)' // 42px desktop
	},

	// Component padding (cards, metrics)
	component: {
		compact: 'var(--space-xs)', // 10px mobile - maximize data visibility
		standard: 'var(--space-sm)', // 16px tablet
		expanded: 'var(--space-md)' // 26px desktop
	},

	// Cell padding (table cells, grid items)
	cell: {
		compact: '0.25rem', // 4px mobile (touch-safe row height)
		standard: '0.375rem', // 6px tablet
		expanded: '0.5rem' // 8px desktop
	},

	// Touch target minimum (never reduce below)
	touchMin: '44px'
} as const;

/**
 * Ink sparkline sizes - word-sized graphics
 *
 * Tufte: "Sparklines are datawords: data-intense, design-simple,
 * word-sized graphics."
 */
export const inkSparkline = {
	compact: { width: 32, height: 10 }, // Mobile: tight inline
	standard: { width: 40, height: 12 }, // Tablet: standard inline
	expanded: { width: 48, height: 14 } // Desktop: comfortable inline
} as const;

/**
 * Ink small multiples grid - columns by viewport
 *
 * Tufte: "Small multiples reveal, all at once, a scope of alternatives,
 * a range of options."
 *
 * Target: 4-9 small multiples visible on any screen size
 */
export const inkMultiples = {
	compact: 2, // Mobile: 2 columns (4 visible in 2×2)
	sm: 3, // Large mobile: 3 columns
	standard: 4, // Tablet: 4 columns
	expanded: 7 // Desktop: 7 columns (days of week)
} as const;

/**
 * Ink metric grid - dashboard layout columns
 *
 * Adaptive grid for metric cards that maintains data density
 */
export const inkMetricGrid = {
	compact: 1, // Mobile: 1 column (full width metrics)
	sm: 2, // Large mobile: 2 columns
	standard: 3, // Tablet: 3 columns
	expanded: 6 // Desktop: 6 columns (full dashboard)
} as const;

/**
 * Ink media query helpers - density-based
 */
export const inkMedia = {
	compact: media['max-sm'], // <640px
	standard: media.md, // >=768px
	expanded: media.lg // >=1024px
} as const;

/**
 * CSS custom property names for Ink tokens
 */
export const inkVars = {
	// Padding
	'--ink-pad-container': inkPadding.container.compact,
	'--ink-pad-component': inkPadding.component.compact,
	'--ink-pad-cell': inkPadding.cell.compact,
	'--ink-touch-min': inkPadding.touchMin,

	// Sparkline
	'--ink-sparkline-width': `${inkSparkline.compact.width}px`,
	'--ink-sparkline-height': `${inkSparkline.compact.height}px`,

	// Grid columns (mobile defaults)
	'--ink-grid-cols': String(inkMultiples.compact),
	'--ink-metric-cols': String(inkMetricGrid.compact)
} as const;

/**
 * Generate CSS custom properties string for Ink
 */
export function generateInkCSS(): string {
	return Object.entries(inkVars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');
}

/**
 * Get current Ink density based on viewport (client-side only)
 */
export function getInkDensity(): InkDensity {
	if (typeof window === 'undefined') return 'compact';

	const width = window.innerWidth;
	if (width >= 1024) return 'expanded';
	if (width >= 768) return 'standard';
	return 'compact';
}

/**
 * Get padding value for current density
 */
export function getInkPadding(
	context: 'container' | 'component' | 'cell',
	density?: InkDensity
): string {
	const d = density ?? getInkDensity();
	return inkPadding[context][d];
}

/**
 * Get sparkline dimensions for current density
 */
export function getInkSparkline(density?: InkDensity): { width: number; height: number } {
	const d = density ?? getInkDensity();
	return inkSparkline[d];
}

/**
 * Get grid columns for current density
 */
export function getInkMultiples(density?: InkDensity): number {
	const d = density ?? getInkDensity();
	if (d === 'compact') return inkMultiples.compact;
	if (d === 'standard') return inkMultiples.standard;
	return inkMultiples.expanded;
}
