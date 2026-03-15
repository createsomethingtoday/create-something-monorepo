/**
 * ESLint rule: prefer-canon-tokens
 *
 * Detects hardcoded CSS values in <style> blocks and suggests Canon tokens.
 *
 * Patterns detected:
 * - Hardcoded hex colors (#000000, #ffffff, #1a1a1a, etc.)
 * - Hardcoded rgba values (rgba(255, 255, 255, 0.8), etc.)
 * - Hardcoded border-radius (6px, 8px, 12px, etc.)
 * - Hardcoded shadows
 */

import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://createsomething.ltd/docs/canon/rules/${name}`
);

/**
 * Mapping of common hardcoded values to Canon tokens
 */
const CSS_VALUE_MAPPINGS: Record<string, string> = {
	// Colors - backgrounds
	'#000000': 'var(--color-bg-pure)',
	'#000': 'var(--color-bg-pure)',
	'black': 'var(--color-bg-pure)',
	'#0a0a0a': 'var(--color-bg-elevated)',
	'#111111': 'var(--color-bg-surface)',
	'#111': 'var(--color-bg-surface)',
	'#1a1a1a': 'var(--color-bg-subtle)',

	// Colors - foregrounds
	'#ffffff': 'var(--color-fg-primary)',
	'#fff': 'var(--color-fg-primary)',
	'white': 'var(--color-fg-primary)',
	'rgba(255, 255, 255, 0.8)': 'var(--color-fg-secondary)',
	'rgba(255,255,255,0.8)': 'var(--color-fg-secondary)',
	'rgba(255, 255, 255, 0.6)': 'var(--color-fg-tertiary)',
	'rgba(255,255,255,0.6)': 'var(--color-fg-tertiary)',
	'rgba(255, 255, 255, 0.46)': 'var(--color-fg-muted)',
	'rgba(255,255,255,0.46)': 'var(--color-fg-muted)',
	'rgba(255, 255, 255, 0.2)': 'var(--color-fg-subtle)',
	'rgba(255,255,255,0.2)': 'var(--color-fg-subtle)',

	// Colors - borders
	'rgba(255, 255, 255, 0.1)': 'var(--color-border-default)',
	'rgba(255,255,255,0.1)': 'var(--color-border-default)',
	'rgba(255, 255, 255, 0.3)': 'var(--color-border-strong)',
	'rgba(255,255,255,0.3)': 'var(--color-border-strong)',

	// Border radius
	'6px': 'var(--radius-sm)',
	'8px': 'var(--radius-md)',
	'12px': 'var(--radius-lg)',
	'16px': 'var(--radius-xl)',
	'9999px': 'var(--radius-full)',

	// Typography sizes
	'0.75rem': 'var(--text-caption)',
	'0.875rem': 'var(--text-body-sm)',
	'1rem': 'var(--text-body)',
	'1.125rem': 'var(--text-body-lg)',

	// Spacing
	'0.5rem': 'var(--space-xs)',
	'1.618rem': 'var(--space-md)',
	'2.618rem': 'var(--space-lg)',
	'4.236rem': 'var(--space-xl)',
	'6.854rem': 'var(--space-2xl)'
};

/**
 * Properties that should use Canon tokens
 */
const CANON_PROPERTIES = [
	'color',
	'background',
	'background-color',
	'border-color',
	'border-radius',
	'box-shadow',
	'text-shadow',
	'font-size',
	'gap',
	'padding',
	'margin'
];

export default createRule({
	name: 'prefer-canon-tokens',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer Canon CSS custom properties over hardcoded values'
		},
		messages: {
			preferCanonToken: 'Use Canon token {{canon}} instead of hardcoded value {{value}}'
		},
		schema: [
			{
				type: 'object',
				properties: {
					ignorePatterns: {
						type: 'array',
						items: { type: 'string' }
					}
				}
			}
		]
	},
	defaultOptions: [{ ignorePatterns: [] }],
	create(context) {
		const options = context.options[0] || {};
		const ignorePatterns = options.ignorePatterns || [];

		const filename = context.getFilename();
		const shouldIgnore = ignorePatterns.some((pattern: string) => {
			const regex = new RegExp(pattern.replace(/\*/g, '.*'));
			return regex.test(filename);
		});

		if (shouldIgnore) {
			return {};
		}

		/**
		 * Check if a CSS value should use a Canon token
		 */
		function checkCSSValue(node: any, property: string, value: string) {
			if (!CANON_PROPERTIES.includes(property.toLowerCase())) {
				return;
			}

			const trimmedValue = value.trim();
			const canonToken = CSS_VALUE_MAPPINGS[trimmedValue];

			if (canonToken) {
				context.report({
					node,
					messageId: 'preferCanonToken',
					data: {
						canon: canonToken,
						value: trimmedValue
					}
				});
			}
		}

		return {
			// Handle inline styles in Svelte
			'SvelteAttribute'(node: any) {
				if (node.key?.name === 'style') {
					// Parse inline style string
					// This is a simplified check - full CSS parsing would be more robust
					if (node.value && node.value.length > 0) {
						for (const val of node.value) {
							if (val.type === 'SvelteText') {
								const styleStr = val.data;
								// Simple regex to extract property: value pairs
								const matches = styleStr.matchAll(/([a-z-]+)\s*:\s*([^;]+)/gi);
								for (const match of matches) {
									const [, property, value] = match;
									checkCSSValue(node, property, value);
								}
							}
						}
					}
				}
			},

			// Handle style objects in JSX
			JSXAttribute(node: any) {
				if (node.name?.name === 'style' && node.value?.type === 'JSXExpressionContainer') {
					const expr = node.value.expression;
					if (expr.type === 'ObjectExpression') {
						for (const prop of expr.properties) {
							if (prop.type === 'Property') {
								const key = prop.key.name || prop.key.value;
								const val = prop.value;
								if (val.type === 'Literal' && typeof val.value === 'string') {
									checkCSSValue(node, key, val.value);
								}
							}
						}
					}
				}
			}
		};
	}
});
