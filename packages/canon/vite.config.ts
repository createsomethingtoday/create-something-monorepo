/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		exclude: ['**/node_modules/**', '**/dist/**', '**/.svelte-kit/**', '**/coverage/**']
	}
});
