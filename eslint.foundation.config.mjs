import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import canonPlugin from './packages/eslint-plugin-canon/dist/index.js';
import reactHooks from 'eslint-plugin-react-hooks';
import svelte from 'eslint-plugin-svelte';

function asWarnings(rules = {}) {
  return Object.fromEntries(
    Object.entries(rules).map(([name, setting]) => {
      if (setting === 'off' || setting === 0 || setting?.[0] === 'off' || setting?.[0] === 0) {
        return [name, setting];
      }
      return [name, Array.isArray(setting) ? ['warn', ...setting.slice(1)] : 'warn'];
    })
  );
}

const sourceFiles = ['packages/mcp-core/**/*.{js,cjs,mjs,ts,tsx}', 'packages/webflow-components/**/*.{js,cjs,mjs,jsx,tsx,ts}'];
const ioScriptFiles = ['packages/io/**/*.{js,cjs,mjs,jsx,tsx,ts}'];

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.svelte-kit/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/worker-configuration.d.ts'
    ]
  },
  {
    files: [...sourceFiles, ...ioScriptFiles],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    rules: asWarnings(js.configs.recommended.rules)
  },
  {
    files: ['packages/mcp-core/**/*.{ts,tsx}', 'packages/webflow-components/**/*.{ts,tsx}', 'packages/io/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tseslint },
    rules: asWarnings({
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-wrapper-object-types': 'error',
      '@typescript-eslint/prefer-as-const': 'error'
    })
  },
  {
    files: ['packages/webflow-components/**/*.{jsx,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: asWarnings(reactHooks.configs.recommended.rules)
  },
  ...svelte.configs['flat/recommended'].map((config) => ({
    ...config,
    ...(config.files ? { files: config.files.map((file) => `packages/io/${file}`) } : {}),
    rules: asWarnings(config.rules)
  })),
  {
    files: ['packages/io/**/*.svelte'],
    languageOptions: {
      parser: svelte.configs['flat/recommended'][1].languageOptions.parser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte'],
        sourceType: 'module',
        ecmaVersion: 'latest'
      }
    },
    plugins: { canon: canonPlugin },
    rules: {
      'canon/no-tailwind-design-utils': 'warn',
      'canon/prefer-canon-tokens': 'warn'
    }
  }
];
