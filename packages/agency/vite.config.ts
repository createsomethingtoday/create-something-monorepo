import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		resolve: {
			conditions: ['workerd', 'worker']
		}
	},
	build: {
		chunkSizeWarningLimit: 1200
	}
});
