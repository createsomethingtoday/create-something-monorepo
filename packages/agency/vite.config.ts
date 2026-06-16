import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			// Pin Composio to its ESM entry so the Pages server build does not depend on pnpm's symlink traversal.
			'@composio/core': fileURLToPath(new URL('./node_modules/@composio/core/dist/index.mjs', import.meta.url))
		}
	},
	plugins: [sveltekit() as unknown as PluginOption],
	ssr: {
		noExternal: ['lucide-svelte']
	},
	build: {
		chunkSizeWarningLimit: 1200
	}
});
