/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		exclude: ['**/node_modules/**', '**/dist/**', '**/.svelte-kit/**', '**/coverage/**']
	},
	// Component tests mount Svelte components in jsdom; resolve the browser
	// build of svelte (client `mount`) only under Vitest so dev/build behavior
	// is unchanged.
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});
