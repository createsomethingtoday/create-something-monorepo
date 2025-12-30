import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// Detect if we're building the embed widget
const buildEmbed = process.env.BUILD_EMBED === 'true';

export default defineConfig({
	plugins: buildEmbed
		? [
				svelte({
					compilerOptions: {
						customElement: false
					}
				})
		  ]
		: [sveltekit()],
	build: buildEmbed
		? {
				// Embed widget build config
				outDir: 'static',
				lib: {
					entry: path.resolve(__dirname, 'src/embed/widget.ts'),
					name: 'CourtReserve',
					fileName: () => 'embed.js',
					formats: ['iife']
				},
				rollupOptions: {
					output: {
						inlineDynamicImports: true
					}
				}
		  }
		: undefined
});
