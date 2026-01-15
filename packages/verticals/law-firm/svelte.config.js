import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		prerender: {
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore external links during prerender
				if (path.startsWith('https://')) {
					return;
				}
				// Warn but don't fail on 404s
				console.warn(`${path} (from ${referrer}): ${message}`);
			}
		}
	}
};

export default config;
