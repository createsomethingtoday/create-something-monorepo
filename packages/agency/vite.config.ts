import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			// Pin Composio to its ESM entry so the Pages server build does not depend on pnpm's symlink traversal.
			'@composio/core': fileURLToPath(new URL('./node_modules/@composio/core/dist/index.mjs', import.meta.url)),
		},
	},
	plugins: [
		{
			name: 'ensure-sveltekit-server-output',
			writeBundle() {
				fs.mkdirSync('.svelte-kit/output/server', { recursive: true });
			}
		},
		sveltekit()
	],
	ssr: {
		resolve: {
			conditions: ['workerd', 'worker']
		}
	},
	build: {
		chunkSizeWarningLimit: 1200
	}
});
