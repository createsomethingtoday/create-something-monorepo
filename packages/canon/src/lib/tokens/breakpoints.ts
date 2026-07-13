/**
 * Breakpoint System - Content-First Responsive Design
 *
 * Breakpoints follow common device patterns but should be used sparingly.
 * Prefer fluid typography and spacing over breakpoint-dependent styles.
 *
 * "The details are not the details. They make the design." - Charles Eames
 *
 * @remarks
 * All exports in this module are part of the public design system API.
 * They are intentionally exposed for external consumption even if not
 * used internally within this monorepo.
 *
 * @see /STANDARDS.md - Section 1.6 Responsive Design
 * @packageDocumentation
 */

export const breakpoints = {
	// Mobile-first breakpoints (min-width)
	sm: '640px', // Large phones, small tablets
	md: '768px', // Tablets
	lg: '1024px', // Laptops, small desktops
	xl: '1280px', // Desktops
	'2xl': '1536px' // Large desktops
} as const;

export type BreakpointKey = keyof typeof breakpoints;

/**
 * Container max-widths at each breakpoint
 */
export const containers = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1400px', // Slightly narrower for readability
	prose: '65ch' // Optimal reading width
} as const;

/**
 * Media query helpers
 */
export const media = {
	sm: `(min-width: ${breakpoints.sm})`,
	md: `(min-width: ${breakpoints.md})`,
	lg: `(min-width: ${breakpoints.lg})`,
	xl: `(min-width: ${breakpoints.xl})`,
	'2xl': `(min-width: ${breakpoints['2xl']})`,

	// Max-width (for mobile-only styles)
	'max-sm': `(max-width: ${parseInt(breakpoints.sm) - 1}px)`,
	'max-md': `(max-width: ${parseInt(breakpoints.md) - 1}px)`,
	'max-lg': `(max-width: ${parseInt(breakpoints.lg) - 1}px)`,

	// Preference queries
	'prefers-reduced-motion': '(prefers-reduced-motion: reduce)',
	'prefers-dark': '(prefers-color-scheme: dark)',
	'prefers-light': '(prefers-color-scheme: light)'
} as const;

/**
 * CSS custom property names for breakpoints
 */
export const breakpointVars = {
	'--breakpoint-performance-sm': breakpoints.sm,
	'--breakpoint-performance-md': breakpoints.md,
	'--breakpoint-performance-lg': breakpoints.lg,
	'--breakpoint-performance-xl': breakpoints.xl,
	'--breakpoint-performance-2xl': breakpoints['2xl'],

	'--container-performance-sm': containers.sm,
	'--container-performance-md': containers.md,
	'--container-performance-lg': containers.lg,
	'--container-performance-xl': containers.xl,
	'--container-performance-2xl': containers['2xl'],
	'--container-performance-prose': containers.prose
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateBreakpointsCSS(): string {
	return Object.entries(breakpointVars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');
}

/**
 * Check if viewport matches breakpoint (client-side only)
 */
export function matchesBreakpoint(breakpoint: BreakpointKey): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia(media[breakpoint]).matches;
}
