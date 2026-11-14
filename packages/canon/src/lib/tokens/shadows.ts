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
	sm: '0 1px 3px rgb(41 43 40 / 0.06)',
	md: '0 4px 12px rgb(41 43 40 / 0.08)',
	lg: '0 12px 28px rgb(41 43 40 / 0.10)',
	xl: '0 20px 40px rgb(41 43 40 / 0.12)',
	'2xl': '0 24px 56px rgb(41 43 40 / 0.14)',

	// Glow effects (for dark themes)
	'glow-sm': 'none',
	'glow-md': 'none',
	'glow-lg': 'none',

	// Inner shadows
	inner: 'inset 0 1px 2px rgb(41 43 40 / 0.08)',
	'inner-lg': 'inset 0 2px 4px rgb(41 43 40 / 0.10)'
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
