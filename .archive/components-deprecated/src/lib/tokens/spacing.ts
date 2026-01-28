/**
 * Spacing System - Golden Ratio (φ = 1.618)
 *
 * All spatial rhythm follows the golden ratio for mathematical elegance.
 *
 * @see /STANDARDS.md - Section 1.3 Spacing System
 */

export const spacing = {
	xs: '0.5rem', // 8px - Base unit
	sm: '1rem', // 16px - 2x base
	md: '1.618rem', // ~26px - φ¹
	lg: '2.618rem', // ~42px - φ²
	xl: '4.236rem', // ~68px - φ³
	'2xl': '6.854rem', // ~110px - φ⁴
	'3xl': '11.089rem' // ~177px - φ⁵
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Get spacing value by key
 */
export function getSpacing(key: SpacingKey): string {
	return spacing[key];
}

/**
 * CSS custom property names for spacing
 */
export const spacingVars = {
	xs: '--space-xs',
	sm: '--space-sm',
	md: '--space-md',
	lg: '--space-lg',
	xl: '--space-xl',
	'2xl': '--space-2xl',
	'3xl': '--space-3xl'
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateSpacingCSS(): string {
	return Object.entries(spacing)
		.map(([key, value]) => `  ${spacingVars[key as SpacingKey]}: ${value};`)
		.join('\n');
}
