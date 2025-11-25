import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Externalize cloudflare-specific imports that only work at runtime in Workers
		// The 'agents' package uses cloudflare: protocol imports internally
		external: ['agents', 'cloudflare:email', 'cloudflare:workers']
	},
	build: {
		rollupOptions: {
			// Also externalize for client bundle (though agents should only be server-side)
			external: ['agents', 'cloudflare:email', 'cloudflare:workers']
		}
	}
});
