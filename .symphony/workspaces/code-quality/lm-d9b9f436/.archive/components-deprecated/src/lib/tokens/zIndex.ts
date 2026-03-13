/**
 * Z-Index System - Semantic Layering
 *
 * Mies: "God is in the details"
 * Systematic layering prevents z-index chaos.
 *
 * @see /STANDARDS.md - Section 1.5 Z-Index System
 */

export const zIndex = {
	base: 0, // Default layer
	dropdown: 10, // Dropdown menus
	sticky: 20, // Sticky headers
	fixed: 50, // Fixed navigation
	modal: 100, // Modal overlays
	popover: 200, // Popovers, tooltips
	tooltip: 300 // Always-on-top tooltips
} as const;

export type ZIndexKey = keyof typeof zIndex;

/**
 * Get z-index value by key
 */
export function getZIndex(key: ZIndexKey): number {
	return zIndex[key];
}

/**
 * CSS custom property names for z-index
 */
export const zIndexVars = {
	base: '--z-base',
	dropdown: '--z-dropdown',
	sticky: '--z-sticky',
	fixed: '--z-fixed',
	modal: '--z-modal',
	popover: '--z-popover',
	tooltip: '--z-tooltip'
} as const;

/**
 * Generate CSS custom properties string
 */
export function generateZIndexCSS(): string {
	return Object.entries(zIndex)
		.map(([key, value]) => `  ${zIndexVars[key as ZIndexKey]}: ${value};`)
		.join('\n');
}
