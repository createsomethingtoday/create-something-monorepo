/**
 * Border Radius Scale
 *
 * Systematic rounding for consistent visual softness.
 *
 * @see /STANDARDS.md - Section 1.4 Border Radius
 */

export const radius = {
	sm: '6px', // Subtle rounding
	md: '8px', // Standard cards
	lg: '12px', // Prominent cards
	xl: '16px', // Large elements
	full: '9999px' // Pills, badges, circular buttons
} as const;

export type RadiusKey = keyof typeof radius;

/**
 * Get radius value by key
 */
export function getRadius(key: RadiusKey): string {
	return radius[key];
}

/**
 * CSS custom property names for radius
 */
export const radiusVars = {
	sm: '--radius-performance-scale-sm',
	md: '--radius-performance-scale-md',
	lg: '--radius-performance-scale-lg',
	xl: '--radius-performance-scale-xl',
	full: '--radius-performance-scale-full'
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateRadiusCSS(): string {
	return Object.entries(radius)
		.map(([key, value]) => `  ${radiusVars[key as RadiusKey]}: ${value};`)
		.join('\n');
}
