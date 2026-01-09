import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '200.html', // SPA fallback (NOT index.html!)
			precompress: false,
			strict: false
		}),
		prerender: {
			handleHttpError: 'warn', // Warn on 404s during prerender, don't fail
			handleMissingId: 'warn'
		}
	}
};

export default config;
