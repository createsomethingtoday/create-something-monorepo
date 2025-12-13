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
				// Ignore missing images during prerender
				if (path.startsWith('/images/')) {
					console.warn(`Missing image: ${path}`);
					return;
				}
				// Throw for other errors
				throw new Error(message);
			}
		}
	}
};

export default config;
