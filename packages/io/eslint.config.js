/**
 * ESLint configuration for @create-something/io
 *
 * Enforces Canon design tokens via @create-something/eslint-plugin-canon
 */

import canonPlugin from '@create-something/eslint-plugin-canon';
import svelteParser from 'svelte-eslint-parser';
import tsParser from '@typescript-eslint/parser';

export default [
	// Ignores must come first in flat config
	{
		ignores: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/build/**',
			'**/dist/**',
			'worker-configuration.d.ts'
		]
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				extraFileExtensions: ['.svelte'],
				sourceType: 'module',
				ecmaVersion: 'latest'
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
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 'latest'
			}
		},
		plugins: {
			canon: canonPlugin
		},
		rules: {
			'canon/no-tailwind-design-utils': 'error',
			'canon/prefer-canon-tokens': 'warn'
		}
	}
];
