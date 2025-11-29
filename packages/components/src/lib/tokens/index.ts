/**
 * Design Tokens
 *
 * Canonical design values following the CREATE SOMETHING standards.
 * Based on Dieter Rams' principles: "Less, but better"
 *
 * Framework-agnostic tokens that can be consumed by any build system.
 *
 * @see /STANDARDS.md
 */

// Export all token modules
export * from './spacing.js';
export * from './radius.js';
export * from './animation.js';
export * from './zIndex.js';
export * from './colors.js';
export * from './typography.js';
export * from './shadows.js';
export * from './breakpoints.js';

// Re-export for convenience
export { spacing, spacingVars, generateSpacingCSS } from './spacing.js';
export { radius, radiusVars, generateRadiusCSS } from './radius.js';
export { animation, animationVars, generateAnimationCSS, transitions } from './animation.js';
export { zIndex, zIndexVars, generateZIndexCSS } from './zIndex.js';
export { colors, colorVars, generateColorsCSS } from './colors.js';
export { typography, typographyVars, generateTypographyCSS, getHeadingStyles } from './typography.js';
export { shadows, shadowVars, generateShadowsCSS, getElevation } from './shadows.js';
export { breakpoints, containers, media, breakpointVars, generateBreakpointsCSS, matchesBreakpoint } from './breakpoints.js';

/**
 * Complete tokens object for JSON export
 */
export const tokens = {
	spacing: await import('./spacing.js').then((m) => m.spacing),
	radius: await import('./radius.js').then((m) => m.radius),
	animation: await import('./animation.js').then((m) => m.animation),
	zIndex: await import('./zIndex.js').then((m) => m.zIndex),
	colors: await import('./colors.js').then((m) => m.colors),
	typography: await import('./typography.js').then((m) => m.typography),
	shadows: await import('./shadows.js').then((m) => m.shadows),
	breakpoints: await import('./breakpoints.js').then((m) => m.breakpoints)
};

/**
 * Generate complete CSS custom properties string
 */
export async function generateAllTokensCSS(): Promise<string> {
	const { generateSpacingCSS } = await import('./spacing.js');
	const { generateRadiusCSS } = await import('./radius.js');
	const { generateAnimationCSS } = await import('./animation.js');
	const { generateZIndexCSS } = await import('./zIndex.js');
	const { generateColorsCSS } = await import('./colors.js');
	const { generateTypographyCSS } = await import('./typography.js');
	const { generateShadowsCSS } = await import('./shadows.js');
	const { generateBreakpointsCSS } = await import('./breakpoints.js');

	return `:root {
  /* ==========================================================================
     CREATE SOMETHING Design Tokens
     "Weniger, aber besser" - Dieter Rams
     ========================================================================== */

  /* Colors - Functional Minimalism */
${generateColorsCSS()}

  /* Typography - Fluid & Canonical */
${generateTypographyCSS()}

  /* Spacing - Golden Ratio (φ = 1.618) */
${generateSpacingCSS()}

  /* Border Radius */
${generateRadiusCSS()}

  /* Shadows & Elevation */
${generateShadowsCSS()}

  /* Animation & Motion */
${generateAnimationCSS()}

  /* Z-Index Layers */
${generateZIndexCSS()}

  /* Breakpoints & Containers */
${generateBreakpointsCSS()}
}`;
}
