import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Let SvelteKit handle route configuration automatically
			// This ensures API routes are properly handled by the worker
		}),
		// Disable X-Frame-Options to allow iframe embedding
		// We use Content-Security-Policy frame-ancestors instead (set in hooks.server.ts)
		csp: {
			mode: 'auto',
			directives: {
				'frame-ancestors': ["'self'", 'https://webflow.com', 'https://*.webflow.com', 'https://*.webflow.io', 'https://*.createsomething.io']
			}
		}
	}
};

export default config;
