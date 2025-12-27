/**
 * Shared Tailwind Base Configuration for Vertical Templates
 *
 * Philosophy: Prevent class purging at build time, not through runtime verification.
 * The tool recedes when configuration is correct.
 *
 * Usage in template tailwind.config.js:
 *   export { default } from '@create-something/vertical-shared/tailwind.config.base';
 *
 * Or with customizations:
 *   import { baseConfig } from '@create-something/vertical-shared/tailwind.config.base';
 *   export default { ...baseConfig, theme: { extend: { ...baseConfig.theme.extend, ... } } };
 */

/**
 * Content paths that must be scanned for all templates
 * These are relative to where the config is consumed (each template directory)
 */
const content = [
	// Template's own source
	'./src/**/*.{html,js,svelte,ts}',
	'./src/routes/**/*.{svelte,ts,js}',
	'./src/lib/**/*.{svelte,ts,js}',
	// Shared vertical components (relative path from template)
	'../shared/**/*.{svelte,js,ts}',
	// Main component library
	'../../components/src/**/*.{svelte,js,ts}'
];

/**
 * Safelist patterns for commonly used dynamic classes
 * These are preserved even if not found in static analysis
 */
const safelist = [
	// Explicit common classes
	'gap-6',
	'gap-8',
	'p-8',
	'px-4',
	'py-8',
	'max-w-7xl',
	'mx-auto',
	'w-full',
	'h-full',
	'min-h-screen',

	// Spacing patterns (padding, margin, gap)
	{
		pattern: /(p|m|px|py|mx|my|mt|mb|ml|mr|pt|pb|pl|pr)-(0|1|2|3|4|5|6|8|10|12|16|20|24)/
	},
	{
		pattern: /gap-(0|1|2|3|4|5|6|8|10|12|16)/
	},

	// Width patterns
	{
		pattern: /w-(0|1|2|4|6|8|10|12|16|20|24|32|40|48|56|64|72|80|96|full|screen|auto)/
	},
	{
		pattern: /w-(1\/2|1\/3|2\/3|1\/4|2\/4|3\/4|1\/5|2\/5|3\/5|4\/5)/
	},

	// Max-width patterns
	{
		pattern: /max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|prose|screen-sm|screen-md|screen-lg|screen-xl)/
	},

	// Grid patterns
	{
		pattern: /grid-cols-(1|2|3|4|5|6|12)/
	},
	{
		pattern: /col-span-(1|2|3|4|5|6|12|full)/
	},

	// Flex patterns
	{
		pattern: /flex-(1|auto|initial|none)/
	},

	// Text sizing (layout concern, not design - Canon handles design)
	{
		pattern: /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)/
	}
];

/**
 * Shared theme extensions
 * Font families align with Canon design system
 */
const theme = {
	extend: {
		fontFamily: {
			sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
			mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace']
		}
	}
};

/** @type {import('tailwindcss').Config} */
export const baseConfig = {
	content,
	theme,
	plugins: [],
	safelist
};

export default baseConfig;
