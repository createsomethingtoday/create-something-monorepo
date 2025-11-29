/**
 * Layout Patterns
 *
 * Structure that serves content. The grid disappears when it works.
 *
 * @principle Layout is invisible infrastructure—noticed only when broken.
 */

/**
 * Page Layout Pattern
 *
 * Canonical page structure.
 */
export const pageLayoutPattern = {
	name: 'Page Layout',
	principles: [
		'Header fixed, content scrolls',
		'Footer at bottom (min-height: 100vh)',
		'Content area has max-width container',
		'Mobile-first, responsive breakpoints'
	],
	structure: {
		header: 'Fixed top, full width',
		main: 'Flexible, contains content',
		footer: 'Bottom, full width'
	},
	css: {
		container: `
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    `,
		main: `
      flex: 1;
      width: 100%;
      max-width: var(--container-xl);
      margin: 0 auto;
      padding: 0 var(--space-md);
    `
	}
} as const;

/**
 * Container Pattern
 *
 * Centered, max-width content wrapper.
 */
export const containerPattern = {
	name: 'Container',
	principles: [
		'Horizontal padding on mobile',
		'Max-width prevents too-wide lines',
		'Centered with auto margins',
		'Multiple sizes for different contexts'
	],
	sizes: {
		sm: '640px',
		md: '768px',
		lg: '1024px',
		xl: '1280px',
		prose: '65ch'
	},
	css: {
		base: `
      width: 100%;
      margin-left: auto;
      margin-right: auto;
      padding-left: var(--space-md);
      padding-right: var(--space-md);
    `
	}
} as const;

/**
 * Stack Pattern
 *
 * Vertical spacing between elements.
 */
export const stackPattern = {
	name: 'Stack',
	principles: [
		'Consistent vertical spacing',
		'Gap instead of margins',
		'Recursive—works at any level',
		'No spacing on first/last child'
	],
	css: {
		base: `
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
    `
	},
	variants: {
		tight: 'gap: var(--space-sm)',
		normal: 'gap: var(--space-md)',
		loose: 'gap: var(--space-lg)'
	}
} as const;

/**
 * Cluster Pattern
 *
 * Horizontal grouping with wrapping.
 */
export const clusterPattern = {
	name: 'Cluster',
	principles: [
		'Horizontal by default, wraps on overflow',
		'Consistent gap between items',
		'Alignment options (start, center, end)',
		'Good for tags, buttons, metadata'
	],
	css: {
		base: `
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      align-items: center;
    `
	}
} as const;

/**
 * Split Pattern
 *
 * Two elements, one on each side.
 */
export const splitPattern = {
	name: 'Split',
	principles: [
		'Two children, opposite sides',
		'Useful for header (logo + nav)',
		'Stacks vertically on mobile if needed',
		'Space-between alignment'
	],
	css: {
		base: `
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-md);
    `,
		responsive: `
      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }
    `
	}
} as const;

/**
 * Sidebar Layout Pattern
 *
 * Main content with sidebar.
 */
export const sidebarLayoutPattern = {
	name: 'Sidebar Layout',
	principles: [
		'Sidebar fixed width, main flexible',
		'Sidebar collapses on mobile',
		'Sidebar can be left or right',
		'Sticky sidebar for long content'
	],
	structure: {
		sidebar: 'Fixed width (250-300px typically)',
		main: 'Flex: 1, takes remaining space'
	},
	css: {
		container: `
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: var(--space-lg);
    `,
		mobile: `
      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    `
	}
} as const;

/**
 * Center Pattern
 *
 * Horizontally and/or vertically centered content.
 */
export const centerPattern = {
	name: 'Center',
	principles: [
		'Use for modals, empty states, loading',
		'Both axes or just horizontal',
		'Min-height for vertical centering'
	],
	css: {
		both: `
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    `,
		horizontal: `
      display: flex;
      justify-content: center;
    `
	}
} as const;

export const layoutPatterns = {
	page: pageLayoutPattern,
	container: containerPattern,
	stack: stackPattern,
	cluster: clusterPattern,
	split: splitPattern,
	sidebar: sidebarLayoutPattern,
	center: centerPattern
} as const;
