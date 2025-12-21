// Brand module exports
// Central access point for CREATE SOMETHING brand assets and components

// Types
export * from './types.js';

// OG Image Generation (server-side SVG generation)
export {
	generateOGSVG,
	generateMinimalOGSVG,
	generateOGDataURI,
	OG_WIDTH,
	OG_HEIGHT
} from './og-template.js';

// Social Components (Svelte components for client-side rendering)
export * from './social/index.js';

// State Components (loading, skeleton, transitions)
export * from './states/index.js';

// Styles
// CSS-based icons: import '@create-something/components/brand/icons.css'
// - .icon-cube: Isometric cube mark with Canon face opacities
// - .icon-cube-mono: Single-color cube variant
// - Size classes: .icon-xs (16px), .icon-sm (24px), .icon-md (32px), .icon-lg (48px), .icon-xl (64px)
// - Animation classes: .icon-pulse, .icon-spin

// Placeholder exports for future components
// These will be populated as components are implemented:
// - marks/CubeMark.svelte
// - marks/Wordmark.svelte
// - marks/PropertyMark.svelte
// - utils/cube-geometry.ts
// - utils/cube-animations.ts
