/**
 * Shadow & Elevation System
 *
 * Shadows indicate elevation and hierarchy.
 * Subtle by default—prominence through restraint.
 *
 * "Good design is unobtrusive" - Dieter Rams
 *
 * @see /STANDARDS.md - Section 1.5 Elevation
 */

export const shadows = {
	// Elevation levels
	none: 'none',
	sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
	md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
	lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
	xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
	'2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.75)',

	// Glow effects (for dark themes)
	'glow-sm': '0 0 10px rgba(255, 255, 255, 0.05)',
	'glow-md': '0 0 20px rgba(255, 255, 255, 0.1)',
	'glow-lg': '0 0 40px rgba(255, 255, 255, 0.15)',

	// Inner shadows
	inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)',
	'inner-lg': 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.5)'
} as const;

export type ShadowKey = keyof typeof shadows;

/**
 * CSS custom property names for shadows
 */
export const shadowVars = {
	'--shadow-performance-scale-none': shadows.none,
	'--shadow-performance-scale-sm': shadows.sm,
	'--shadow-performance-scale-md': shadows.md,
	'--shadow-performance-scale-lg': shadows.lg,
	'--shadow-performance-scale-xl': shadows.xl,
	'--shadow-performance-scale-2xl': shadows['2xl'],
	'--shadow-performance-scale-glow-sm': shadows['glow-sm'],
	'--shadow-performance-scale-glow-md': shadows['glow-md'],
	'--shadow-performance-scale-glow-lg': shadows['glow-lg'],
	'--shadow-performance-scale-inner': shadows.inner,
	'--shadow-performance-scale-inner-lg': shadows['inner-lg']
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateShadowsCSS(): string {
	return Object.entries(shadowVars)
		.map(([key, value]) => `  ${key}: ${value};`)
		.join('\n');
}

/**
 * Get shadow by elevation level (semantic)
 */
export function getElevation(
	level: 'base' | 'raised' | 'elevated' | 'floating' | 'overlay'
): string {
	const elevationMap = {
		base: shadows.none,
		raised: shadows.sm,
		elevated: shadows.md,
		floating: shadows.lg,
		overlay: shadows.xl
	};
	return elevationMap[level];
}
