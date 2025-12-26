/**
 * Canon token mappings
 *
 * Maps Tailwind design utilities to Canon CSS custom properties.
 * Based on css-canon.md "Detection Patterns" section.
 *
 * Loads actual token values from canon.json for descriptions.
 */

import { loadCanon, getCanonValue } from './utils/canon-tokens.js';

export interface CanonMapping {
	tailwind: string | RegExp;
	canon: string;
	category: 'color' | 'radius' | 'shadow' | 'typography' | 'spacing';
	description?: string;
}

// Load canon.json to get actual token values
const canon = loadCanon();

/**
 * Tailwind utilities that violate Canon principles
 * These should be replaced with Canon tokens
 *
 * Descriptions pulled from canon.json where available.
 */
export const CANON_MAPPINGS: CanonMapping[] = [
	// Border radius - using canon.json values
	{
		tailwind: 'rounded-sm',
		canon: 'var(--radius-sm)',
		category: 'radius',
		description: canon.radius.sm.value
	},
	{
		tailwind: 'rounded-md',
		canon: 'var(--radius-md)',
		category: 'radius',
		description: canon.radius.md.value
	},
	{
		tailwind: 'rounded-lg',
		canon: 'var(--radius-lg)',
		category: 'radius',
		description: canon.radius.lg.value
	},
	{
		tailwind: 'rounded-xl',
		canon: 'var(--radius-xl)',
		category: 'radius',
		description: canon.radius.xl.value
	},
	{
		tailwind: 'rounded-full',
		canon: 'var(--radius-full)',
		category: 'radius',
		description: canon.radius.full.value
	},
	{ tailwind: /^rounded-\w+$/, canon: 'var(--radius-*)', category: 'radius' },

	// Background colors - using canon.json values
	{
		tailwind: 'bg-black',
		canon: 'var(--color-bg-pure)',
		category: 'color',
		description: canon.colors.bg.pure.value
	},
	{
		tailwind: 'bg-white',
		canon: 'var(--color-fg-primary)',
		category: 'color',
		description: canon.colors.fg.primary.value
	},
	{
		tailwind: /^bg-white\/5$/,
		canon: 'var(--color-bg-subtle)',
		category: 'color',
		description: canon.colors.bg.subtle.value
	},
	{
		tailwind: /^bg-white\/10$/,
		canon: 'var(--color-bg-surface)',
		category: 'color',
		description: canon.colors.bg.surface.value
	},
	{ tailwind: /^bg-gray-/, canon: 'var(--color-bg-*)', category: 'color' },
	{ tailwind: /^bg-slate-/, canon: 'var(--color-bg-*)', category: 'color' },

	// Text colors - using canon.json values
	{
		tailwind: 'text-white',
		canon: 'var(--color-fg-primary)',
		category: 'color',
		description: canon.colors.fg.primary.value
	},
	{
		tailwind: 'text-black',
		canon: 'var(--color-fg-primary)',
		category: 'color',
		description: '#000000 (inverted theme)'
	},
	{
		tailwind: /^text-white\/80$/,
		canon: 'var(--color-fg-secondary)',
		category: 'color',
		description: canon.colors.fg.secondary.value
	},
	{
		tailwind: /^text-white\/60$/,
		canon: 'var(--color-fg-tertiary)',
		category: 'color',
		description: canon.colors.fg.tertiary.value
	},
	{
		tailwind: /^text-white\/46$/,
		canon: 'var(--color-fg-muted)',
		category: 'color',
		description: `${canon.colors.fg.muted.value} - ${canon.colors.fg.muted.description}`
	},
	{
		tailwind: /^text-white\/20$/,
		canon: 'var(--color-fg-subtle)',
		category: 'color',
		description: canon.colors.fg.subtle.value
	},
	{ tailwind: /^text-gray-/, canon: 'var(--color-fg-*)', category: 'color' },
	{ tailwind: /^text-slate-/, canon: 'var(--color-fg-*)', category: 'color' },

	// Border colors - using canon.json values
	{
		tailwind: /^border-white\/10$/,
		canon: 'var(--color-border-default)',
		category: 'color',
		description: canon.colors.border.default.value
	},
	{
		tailwind: /^border-white\/20$/,
		canon: 'var(--color-border-emphasis)',
		category: 'color',
		description: canon.colors.border.emphasis.value
	},
	{
		tailwind: /^border-white\/30$/,
		canon: 'var(--color-border-strong)',
		category: 'color',
		description: canon.colors.border.strong.value
	},
	{ tailwind: /^border-gray-/, canon: 'var(--color-border-*)', category: 'color' },
	{ tailwind: /^border-white$/, canon: 'var(--color-border-*)', category: 'color' },
	{ tailwind: /^border-black$/, canon: 'var(--color-border-*)', category: 'color' },

	// Shadows - using canon.json values where available
	{
		tailwind: 'shadow-sm',
		canon: 'var(--shadow-sm)',
		category: 'shadow',
		description: canon.shadows.elevation.sm.value
	},
	{
		tailwind: 'shadow-md',
		canon: 'var(--shadow-md)',
		category: 'shadow',
		description: canon.shadows.elevation.md.value
	},
	{
		tailwind: 'shadow-lg',
		canon: 'var(--shadow-lg)',
		category: 'shadow',
		description: canon.shadows.elevation.lg.value
	},
	{
		tailwind: 'shadow-xl',
		canon: 'var(--shadow-xl)',
		category: 'shadow',
		description: canon.shadows.elevation.xl.value
	},
	{
		tailwind: 'shadow-2xl',
		canon: 'var(--shadow-2xl)',
		category: 'shadow',
		description: canon.shadows.elevation['2xl'].value
	},
	{ tailwind: /^shadow-\w+$/, canon: 'var(--shadow-*)', category: 'shadow' },

	// Typography - using canon.json values
	{
		tailwind: 'text-xs',
		canon: 'var(--text-caption)',
		category: 'typography',
		description: canon.typography.scale.utility.caption.value
	},
	{
		tailwind: 'text-sm',
		canon: 'var(--text-body-sm)',
		category: 'typography',
		description: canon.typography.scale.body.sm.value
	},
	{
		tailwind: 'text-base',
		canon: 'var(--text-body)',
		category: 'typography',
		description: canon.typography.scale.body.default.value
	},
	{
		tailwind: 'text-lg',
		canon: 'var(--text-body-lg)',
		category: 'typography',
		description: canon.typography.scale.body.lg.value
	},
	{
		tailwind: 'text-xl',
		canon: 'var(--text-h3)',
		category: 'typography',
		description: canon.typography.scale.headings.h3.value
	},
	{
		tailwind: 'text-2xl',
		canon: 'var(--text-h2)',
		category: 'typography',
		description: canon.typography.scale.headings.h2.value
	},
	{
		tailwind: 'text-3xl',
		canon: 'var(--text-h1)',
		category: 'typography',
		description: canon.typography.scale.headings.h1.value
	},
	{ tailwind: /^text-\d+xl$/, canon: 'var(--text-*)', category: 'typography' },

	// Opacity (use rgba in Canon tokens instead)
	{
		tailwind: /^opacity-\d+$/,
		canon: 'rgba() in Canon token',
		category: 'color',
		description: 'Use color tokens with built-in opacity'
	}
];

/**
 * Layout utilities that are allowed (structure, not design)
 */
export const ALLOWED_TAILWIND_UTILS = [
	// Flexbox
	/^flex(-\w+)?$/,
	/^items-/,
	/^justify-/,
	/^self-/,
	/^flex-row/,
	/^flex-col/,
	/^flex-wrap/,
	/^flex-nowrap/,
	/^flex-grow/,
	/^flex-shrink/,

	// Grid
	/^grid(-\w+)?$/,
	/^col-/,
	/^row-/,
	/^gap-/,
	/^grid-cols-/,
	/^grid-rows-/,
	/^auto-cols-/,
	/^auto-rows-/,

	// Position
	/^(static|fixed|absolute|relative|sticky)$/,
	/^(top|right|bottom|left)-/,
	/^inset-/,

	// Display
	/^(block|inline|inline-block|hidden|invisible)$/,

	// Sizing
	/^w-/,
	/^h-/,
	/^min-w-/,
	/^min-h-/,
	/^max-w-/,
	/^max-h-/,

	// Spacing (structural)
	/^p-/,
	/^px-/,
	/^py-/,
	/^pt-/,
	/^pr-/,
	/^pb-/,
	/^pl-/,
	/^m-/,
	/^mx-/,
	/^my-/,
	/^mt-/,
	/^mr-/,
	/^mb-/,
	/^ml-/,
	/^space-/,

	// Overflow
	/^overflow-/,

	// Z-index
	/^z-/,

	// Order
	/^order-/,

	// Cursor
	/^cursor-/,

	// Pointer events
	/^pointer-events-/,

	// Visibility
	/^(visible|invisible)$/,

	// Allowed special cases
	'rounded-none',
	'shadow-none'
];

/**
 * Check if a Tailwind class is allowed (structural utility)
 */
export function isAllowedTailwindUtil(className: string): boolean {
	return ALLOWED_TAILWIND_UTILS.some((pattern) => {
		if (typeof pattern === 'string') {
			return className === pattern;
		}
		return pattern.test(className);
	});
}

/**
 * Find Canon replacement for a Tailwind utility
 */
export function findCanonReplacement(className: string): CanonMapping | null {
	return CANON_MAPPINGS.find((mapping) => {
		if (typeof mapping.tailwind === 'string') {
			return className === mapping.tailwind;
		}
		return mapping.tailwind.test(className);
	}) || null;
}

/**
 * Get suggestion message for replacing Tailwind with Canon
 */
export function getCanonSuggestion(className: string, mapping: CanonMapping): string {
	let msg = `Replace Tailwind '${className}' with Canon token '${mapping.canon}'`;
	if (mapping.description) {
		msg += ` (${mapping.description})`;
	}
	msg += `. Use in <style> block, not class attribute.`;
	return msg;
}
