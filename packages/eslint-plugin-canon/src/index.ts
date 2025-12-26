/**
 * ESLint plugin for enforcing CREATE SOMETHING Canon design tokens
 *
 * Philosophy: Build-time constraints, not runtime discovery.
 * Inspired by NanoLang's shadow tests - constraints should be intrinsic.
 */

import noTailwindDesignUtils from './rules/no-tailwind-design-utils.js';
import preferCanonTokens from './rules/prefer-canon-tokens.js';

const plugin = {
	meta: {
		name: '@create-something/eslint-plugin-canon',
		version: '1.0.0'
	},
	rules: {
		'no-tailwind-design-utils': noTailwindDesignUtils,
		'prefer-canon-tokens': preferCanonTokens
	},
	configs: {
		recommended: {
			plugins: ['canon'],
			rules: {
				'canon/no-tailwind-design-utils': 'error',
				'canon/prefer-canon-tokens': 'warn'
			}
		},
		strict: {
			plugins: ['canon'],
			rules: {
				'canon/no-tailwind-design-utils': 'error',
				'canon/prefer-canon-tokens': 'error'
			}
		}
	}
};

export default plugin;
