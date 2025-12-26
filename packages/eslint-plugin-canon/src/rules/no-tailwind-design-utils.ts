/**
 * ESLint rule: no-tailwind-design-utils
 *
 * Enforces Canon tokens over Tailwind design utilities.
 * "Tailwind for structure, Canon for aesthetics."
 *
 * Detects:
 * - Hardcoded colors (bg-white, text-gray-*, etc.)
 * - Border radius (rounded-*)
 * - Shadows (shadow-*)
 * - Typography scale (text-sm, text-lg, etc.)
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import { findCanonReplacement, getCanonSuggestion, isAllowedTailwindUtil } from '../canon-mappings.js';

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://createsomething.ltd/docs/canon/rules/${name}`
);

export default createRule({
	name: 'no-tailwind-design-utils',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow Tailwind design utilities in favor of Canon tokens'
		},
		messages: {
			noTailwindDesign: '{{message}}',
			useCanonToken: 'Use Canon token {{canon}} instead of Tailwind {{tailwind}}'
		},
		schema: [
			{
				type: 'object',
				properties: {
					ignorePatterns: {
						type: 'array',
						items: { type: 'string' },
						description: 'File path patterns to ignore (e.g., "experiments/**")'
					}
				},
				additionalProperties: false
			}
		]
	},
	defaultOptions: [{ ignorePatterns: [] }],
	create(context) {
		const options = context.options[0] || {};
		const ignorePatterns = options.ignorePatterns || [];

		// Check if current file should be ignored
		const filename = context.getFilename();
		const shouldIgnore = ignorePatterns.some((pattern: string) => {
			const regex = new RegExp(pattern.replace(/\*/g, '.*'));
			return regex.test(filename);
		});

		if (shouldIgnore) {
			return {};
		}

		/**
		 * Check a class string for Canon violations
		 */
		function checkClassString(node: any, classStr: string) {
			// Split on whitespace to get individual classes
			const classes = classStr.split(/\s+/).filter(Boolean);

			for (const className of classes) {
				// Skip allowed structural utilities
				if (isAllowedTailwindUtil(className)) {
					continue;
				}

				// Check if it's a design utility that needs Canon replacement
				const mapping = findCanonReplacement(className);
				if (mapping) {
					context.report({
						node,
						messageId: 'noTailwindDesign',
						data: {
							message: getCanonSuggestion(className, mapping)
						}
					});
				}
			}
		}

		return {
			// Check JSX className attributes
			JSXAttribute(node: any) {
				if (node.name?.name === 'class' || node.name?.name === 'className') {
					if (node.value?.type === 'Literal' && typeof node.value.value === 'string') {
						checkClassString(node, node.value.value);
					}
					// Handle template literals
					if (node.value?.type === 'JSXExpressionContainer') {
						const expr = node.value.expression;
						if (expr.type === 'TemplateLiteral') {
							for (const quasi of expr.quasis) {
								if (quasi.value?.raw) {
									checkClassString(node, quasi.value.raw);
								}
							}
						}
					}
				}
			},

			// Check HTML class attributes (for Svelte/Vue)
			// This will be handled by the Svelte parser
			'SvelteAttribute'(node: any) {
				if (node.key?.name === 'class') {
					// Static class attribute
					if (node.value && node.value.length > 0) {
						for (const val of node.value) {
							// Handle SvelteLiteral (static class strings)
							if (val.type === 'SvelteLiteral' && typeof val.value === 'string') {
								checkClassString(node, val.value);
							}
							// Handle SvelteText (text nodes)
							if (val.type === 'SvelteText') {
								checkClassString(node, val.data);
							}
							// Handle dynamic expressions
							if (val.type === 'SvelteMustacheTag' && val.expression?.type === 'Literal') {
								checkClassString(node, val.expression.value);
							}
						}
					}
				}
			},

			// Check template literal class assignments
			CallExpression(node: any) {
				// Check for classnames/clsx/cn utilities
				const calleeName = node.callee?.name;
				if (calleeName === 'cn' || calleeName === 'clsx' || calleeName === 'classnames') {
					for (const arg of node.arguments) {
						if (arg.type === 'Literal' && typeof arg.value === 'string') {
							checkClassString(node, arg.value);
						}
						if (arg.type === 'TemplateLiteral') {
							for (const quasi of arg.quasis) {
								if (quasi.value?.raw) {
									checkClassString(node, quasi.value.raw);
								}
							}
						}
					}
				}
			}
		};
	}
});
