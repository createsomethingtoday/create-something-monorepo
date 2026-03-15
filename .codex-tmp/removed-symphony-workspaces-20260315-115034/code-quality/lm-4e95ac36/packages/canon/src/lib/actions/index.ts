/**
 * Svelte Actions
 *
 * Reusable behavior patterns for DOM elements.
 * Actions add functionality without requiring component wrappers.
 */

// Accessibility actions
export { keyboardClick, keyboardToggle, focusTrap } from './a11y.js';
export type { KeyboardClickOptions, KeyboardToggleOptions, FocusTrapOptions } from './a11y.js';
