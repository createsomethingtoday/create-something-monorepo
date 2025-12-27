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
 * Safe accessor for nested canon properties
 * Returns undefined if any part of the path doesn't exist
 */
function safeGet<T>(obj: any, ...keys: string[]): T | undefined {
	let current = obj;
	for (const key of keys) {
		if (current === undefined || current === null) return undefined;
		current = current[key];
	}
	return current as T;
}

/**
 * Tailwind utilities that violate Canon principles
 * These should be replaced with Canon tokens
 *
 * Descriptions pulled from canon.json where available.
 * Note: canon.json uses 'borderRadius' not 'radius', 'background'/'foreground' not 'bg'/'fg'
 */
export const CANON_MAPPINGS: CanonMapping[] = [
	// Border radius - using canon.json values (canon.borderRadius)
	{
		tailwind: 'rounded-sm',
		canon: 'var(--radius-sm)',
		category: 'radius',
		description: safeGet<string>(canon, 'borderRadius', 'sm', 'value') ?? '6px'
	},
	{
		tailwind: 'rounded-md',
		canon: 'var(--radius-md)',
		category: 'radius',
		description: safeGet<string>(canon, 'borderRadius', 'md', 'value') ?? '8px'
	},
	{
		tailwind: 'rounded-lg',
		canon: 'var(--radius-lg)',
		category: 'radius',
		description: safeGet<string>(canon, 'borderRadius', 'lg', 'value') ?? '12px'
	},
	{
		tailwind: 'rounded-xl',
		canon: 'var(--radius-xl)',
		category: 'radius',
		description: safeGet<string>(canon, 'borderRadius', 'xl', 'value') ?? '16px'
	},
	{
		tailwind: 'rounded-full',
		canon: 'var(--radius-full)',
		category: 'radius',
		description: safeGet<string>(canon, 'borderRadius', 'full', 'value') ?? '9999px'
	},
	{ tailwind: /^rounded-\w+$/, canon: 'var(--radius-*)', category: 'radius' },

	// Background colors - using canon.json values (canon.colors.background)
	{
		tailwind: 'bg-black',
		canon: 'var(--color-bg-pure)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'background', 'pure', 'value') ?? '#000000'
	},
	{
		tailwind: 'bg-white',
		canon: 'var(--color-fg-primary)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'foreground', 'primary', 'value') ?? '#ffffff'
	},
	{
		tailwind: /^bg-white\/5$/,
		canon: 'var(--color-bg-subtle)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'background', 'subtle', 'value') ?? '#1a1a1a'
	},
	{
		tailwind: /^bg-white\/10$/,
		canon: 'var(--color-bg-surface)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'background', 'surface', 'value') ?? '#111111'
	},
	{ tailwind: /^bg-gray-/, canon: 'var(--color-bg-*)', category: 'color' },
	{ tailwind: /^bg-slate-/, canon: 'var(--color-bg-*)', category: 'color' },

	// Text colors - using canon.json values (canon.colors.foreground)
	{
		tailwind: 'text-white',
		canon: 'var(--color-fg-primary)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'foreground', 'primary', 'value') ?? '#ffffff'
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
		description: safeGet<string>(canon, 'colors', 'foreground', 'secondary', 'value') ?? 'rgba(255, 255, 255, 0.8)'
	},
	{
		tailwind: /^text-white\/60$/,
		canon: 'var(--color-fg-tertiary)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'foreground', 'tertiary', 'value') ?? 'rgba(255, 255, 255, 0.6)'
	},
	{
		tailwind: /^text-white\/46$/,
		canon: 'var(--color-fg-muted)',
		category: 'color',
		description: (() => {
			const value = safeGet<string>(canon, 'colors', 'foreground', 'muted', 'value');
			const desc = safeGet<string>(canon, 'colors', 'foreground', 'muted', 'description');
			return value && desc ? `${value} - ${desc}` : 'rgba(255, 255, 255, 0.46) - WCAG AA compliant';
		})()
	},
	{
		tailwind: /^text-white\/20$/,
		canon: 'var(--color-fg-subtle)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'foreground', 'subtle', 'value') ?? 'rgba(255, 255, 255, 0.2)'
	},
	{ tailwind: /^text-gray-/, canon: 'var(--color-fg-*)', category: 'color' },
	{ tailwind: /^text-slate-/, canon: 'var(--color-fg-*)', category: 'color' },

	// Border colors - using canon.json values
	{
		tailwind: /^border-white\/10$/,
		canon: 'var(--color-border-default)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'border', 'default', 'value') ?? 'rgba(255, 255, 255, 0.1)'
	},
	{
		tailwind: /^border-white\/20$/,
		canon: 'var(--color-border-emphasis)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'border', 'emphasis', 'value') ?? 'rgba(255, 255, 255, 0.2)'
	},
	{
		tailwind: /^border-white\/30$/,
		canon: 'var(--color-border-strong)',
		category: 'color',
		description: safeGet<string>(canon, 'colors', 'border', 'strong', 'value') ?? 'rgba(255, 255, 255, 0.3)'
	},
	{ tailwind: /^border-gray-/, canon: 'var(--color-border-*)', category: 'color' },
	{ tailwind: /^border-white$/, canon: 'var(--color-border-*)', category: 'color' },
	{ tailwind: /^border-black$/, canon: 'var(--color-border-*)', category: 'color' },

	// Shadows - using canon.json values (flat structure: canon.shadows.sm, not canon.shadows.elevation.sm)
	{
		tailwind: 'shadow-sm',
		canon: 'var(--shadow-sm)',
		category: 'shadow',
		description: safeGet<string>(canon, 'shadows', 'sm', 'value') ?? '0 1px 2px 0 rgba(0, 0, 0, 0.5)'
	},
	{
		tailwind: 'shadow-md',
		canon: 'var(--shadow-md)',
		category: 'shadow',
		description: safeGet<string>(canon, 'shadows', 'md', 'value') ?? '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
	},
	{
		tailwind: 'shadow-lg',
		canon: 'var(--shadow-lg)',
		category: 'shadow',
		description: safeGet<string>(canon, 'shadows', 'lg', 'value') ?? '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
	},
	{
		tailwind: 'shadow-xl',
		canon: 'var(--shadow-xl)',
		category: 'shadow',
		description: safeGet<string>(canon, 'shadows', 'xl', 'value') ?? '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
	},
	{
		tailwind: 'shadow-2xl',
		canon: 'var(--shadow-2xl)',
		category: 'shadow',
		description: safeGet<string>(canon, 'shadows', '2xl', 'value') ?? '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
	},
	{ tailwind: /^shadow-\w+$/, canon: 'var(--shadow-*)', category: 'shadow' },

	// Typography - using canon.json values (flat structure: canon.typography.scale.caption, etc.)
	{
		tailwind: 'text-xs',
		canon: 'var(--text-caption)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'caption', 'value') ?? '0.833rem'
	},
	{
		tailwind: 'text-sm',
		canon: 'var(--text-body-sm)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'bodysm', 'value') ?? '0.913rem'
	},
	{
		tailwind: 'text-base',
		canon: 'var(--text-body)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'body', 'value') ?? '1rem'
	},
	{
		tailwind: 'text-lg',
		canon: 'var(--text-body-lg)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'bodylg', 'value') ?? '1.095rem'
	},
	{
		tailwind: 'text-xl',
		canon: 'var(--text-h3)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'h3', 'value') ?? 'clamp(1.02rem, 1vw + 0.5rem, 1.2rem)'
	},
	{
		tailwind: 'text-2xl',
		canon: 'var(--text-h2)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'h2', 'value') ?? 'clamp(1.2rem, 2vw + 0.5rem, 1.618rem)'
	},
	{
		tailwind: 'text-3xl',
		canon: 'var(--text-h1)',
		category: 'typography',
		description: safeGet<string>(canon, 'typography', 'scale', 'h1', 'value') ?? 'clamp(1.618rem, 3vw + 1rem, 2.618rem)'
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
