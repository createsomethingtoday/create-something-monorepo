/**
 * Design Tokens
 *
 * Canonical design values following the CREATE SOMETHING standards.
 * Based on Dieter Rams' principles: "Less, but better"
 *
 * @see /STANDARDS.md
 */

// Export all token modules
export * from './spacing.js';
export * from './radius.js';
export * from './animation.js';
export * from './zIndex.js';

// Re-export for convenience
export { spacing, spacingVars, generateSpacingCSS } from './spacing.js';
export { radius, radiusVars, generateRadiusCSS } from './radius.js';
export { animation, animationVars, generateAnimationCSS, transitions } from './animation.js';
export { zIndex, zIndexVars, generateZIndexCSS } from './zIndex.js';

/**
 * Generate complete CSS custom properties string
 */
export async function generateAllTokensCSS(): Promise<string> {
	const { generateSpacingCSS } = await import('./spacing.js');
	const { generateRadiusCSS } = await import('./radius.js');
	const { generateAnimationCSS } = await import('./animation.js');
	const { generateZIndexCSS } = await import('./zIndex.js');

	return `:root {
  /* Spacing - Golden Ratio (φ = 1.618) */
${generateSpacingCSS()}

  /* Border Radius */
${generateRadiusCSS()}

  /* Animation */
${generateAnimationCSS()}

  /* Z-Index */
${generateZIndexCSS()}
}`;
}
