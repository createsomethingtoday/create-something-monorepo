import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			platformProxy: {
				remoteBindings: false
			},
			routes: {
				include: ['/*'],
				// Legacy image aliases must reach Pages static redirects before the app worker.
				exclude: ['/images/workshop/stories/*', '<all>']
			}
		})
	}
};

export default config;
