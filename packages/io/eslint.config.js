/**
 * ESLint configuration for @create-something/io
 *
 * Enforces Canon design tokens via @create-something/eslint-plugin-canon
 */

import canonPlugin from '@create-something/eslint-plugin-canon';
import svelteParser from 'svelte-eslint-parser';

export default [
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				extraFileExtensions: ['.svelte']
			}
		},
		plugins: {
			canon: canonPlugin
		},
		rules: {
			'canon/no-tailwind-design-utils': ['error', {
				ignorePatterns: [
					'**/routes/experiments/**',  // Experimental routes can drift during dev
					'**/routes/prototypes/**'    // Prototypes get relaxed enforcement
				]
			}],
			'canon/prefer-canon-tokens': 'warn'
		}
	},
	{
		files: ['**/*.{js,ts,jsx,tsx}'],
		plugins: {
			canon: canonPlugin
		},
		rules: {
			'canon/no-tailwind-design-utils': 'error',
			'canon/prefer-canon-tokens': 'warn'
		}
	},
	{
		ignores: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/build/**',
			'**/dist/**'
		]
	}
];
