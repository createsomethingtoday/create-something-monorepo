/**
 * Visual Canon - CREATE SOMETHING
 *
 * Isometric visual language for philosophy visualization.
 * Embodies the Subtractive Triad in visual form:
 *
 * - DRY: Reusable geometric primitives
 * - Rams: Minimal palette, nothing ornamental
 * - Heidegger: Assembly relationships showing parts serving whole
 *
 * "Animation should reveal truth, not decorate surface."
 */

// Utility functions
export * from './isometric.js';
export * from './animations.js';
export * from './easing.js';
export * from './typography.js';
export * from './layout.js';

// Svelte components - Primitives
export { default as IsometricBox } from './IsometricBox.svelte';

// Svelte components - Compositions
export { default as IsometricAssembly } from './IsometricAssembly.svelte';
export { default as IsometricArchitecture } from './IsometricArchitecture.svelte';
export { default as IsometricSpiral } from './IsometricSpiral.svelte';
export { default as SubtractiveTriad } from './SubtractiveTriad.svelte';
