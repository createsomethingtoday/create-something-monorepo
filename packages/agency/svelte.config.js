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
			}),
			alias: {
				// Resolve workspace packages from source so app builds do not depend on generated dist files.
				'@create-something/mcp-authz': '../mcp-authz/src/index.ts',
				'@create-something/policy-os-engine': '../policy-os-engine/src/index.ts'
			}
		}
	};

export default config;
