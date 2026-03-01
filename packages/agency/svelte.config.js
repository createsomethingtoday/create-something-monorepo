import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import mdsvexConfig from './mdsvex.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', ...mdsvexConfig.extensions],
	preprocess: [vitePreprocess(), mdsvex(mdsvexConfig)],


		kit: {
			adapter: adapter({
				routes: {
					include: ['/*'],
					// Avoid _routes.json exclude overflow on Pages sites with many prerendered paths.
					exclude: []
				}
			})
		}
	};

export default config;
