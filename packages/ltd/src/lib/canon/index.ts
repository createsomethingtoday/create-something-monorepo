/**
 * Canon Design System Documentation Components
 *
 * These components are used to build the Canon documentation at /canon.
 * They provide interactive displays for tokens, code examples, and component previews.
 */

// Layout & Navigation
export { default as DocSidebar } from './DocSidebar.svelte';
export { canonNavigation, flattenNavigation, findCurrentNavItem } from './navigation.js';
export type { NavItem, NavSection } from './navigation.js';

// Documentation Components
export { default as CodeBlock } from './CodeBlock.svelte';
export { default as CopyButton } from './CopyButton.svelte';
export { default as TokenSwatch } from './TokenSwatch.svelte';
export { default as TokenValue } from './TokenValue.svelte';
