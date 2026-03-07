import fs from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
