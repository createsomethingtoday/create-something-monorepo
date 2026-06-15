import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ['lucide-svelte']
	},
	optimizeDeps: {
		include: ['html2canvas']
	}
});
