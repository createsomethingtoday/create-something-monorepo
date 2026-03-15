/**
 * Ink Framework - Tufte's Data-Ink Ratio for All Screens
 *
 * "Above all else, show the data." - Edward Tufte
 * "Weniger, aber besser." - Dieter Rams
 *
 * Philosophy: Edward Tufte everywhere. Golden Ratio constrains the scale,
 * Tufte constrains the application. Maximum data-ink ratio at every viewport.
 *
 * The 4-Value Constraint (following WORKWAY):
 *   --space-sm: 1rem      (16px) - tight relationships
 *   --space-md: 1.618rem  (26px) - default breathing room
 *   --space-lg: 2.618rem  (42px) - between related sections
 *   --space-xl: 4.236rem  (68px) - major landmarks, heroes
 *
 * Why 4 values? Fewer options = faster decisions = consistent application.
 * Every pixel of padding steals space from content. Be deliberate.
 *
 * @see /STANDARDS.md - Section 1.6 Responsive Design
 * @see WORKWAY's styles.css for reference implementation
 * @packageDocumentation
 */

import { breakpoints, media } from './breakpoints.js';

/**
 * Ink density modes - progressive disclosure based on viewport
 *
 * All modes prioritize data density. The difference is layout, not padding.
 */
export const inkDensity = {
	compact: 'compact', // Mobile: stack layout, progressive disclosure
	standard: 'standard', // Tablet: side-by-side, full context
	expanded: 'expanded' // Desktop: multi-column, all detail visible
} as const;

export type InkDensity = keyof typeof inkDensity;

/**
 * Ink padding - Tufte-aligned spacing (all viewports)
 *
 * Principle: Padding is non-data-ink. Minimize everywhere to maximize data.
 * Every screen is precious. Desktop users deserve density too.
 *
 * WORKWAY alignment: Tighter than traditional "generous desktop" patterns.
 * Desktop gets more content visible; mobile gets touch-safe density.
 *
 * | Context   | Desktop      | Tablet       | Mobile      |
 * |-----------|--------------|--------------|-------------|
 * | Container | 26px (md)    | 26px (md)    | 16px (sm)   |
 * | Component | 16px (sm)    | 16px (sm)    | 12px        |
 * | Cell      | 6px          | 6px          | 4px         |
 */
export const inkPadding = {
	// Container padding (page/section level)
	// Desktop: md (not lg) - tighter than traditional, more like WORKWAY
	container: {
		compact: 'var(--space-sm)', // 16px mobile
		standard: 'var(--space-md)', // 26px tablet
		expanded: 'var(--space-md)' // 26px desktop (Tufte: same as tablet)
	},

	// Component padding (cards, metrics)
	// Desktop: sm (not md) - maximize data visibility at all sizes
	component: {
		compact: '0.75rem', // 12px mobile - balanced touch/density
		standard: 'var(--space-sm)', // 16px tablet
		expanded: 'var(--space-sm)' // 16px desktop (Tufte: tight)
	},

	// Cell padding (table cells, grid items)
	// Minimal everywhere - data is the priority
	cell: {
		compact: '0.25rem', // 4px mobile (touch-safe row height)
		standard: '0.375rem', // 6px tablet
		expanded: '0.375rem' // 6px desktop (Tufte: same as tablet)
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
