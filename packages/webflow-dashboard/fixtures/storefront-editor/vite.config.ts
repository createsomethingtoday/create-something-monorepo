/**
 * LOCAL FIXTURE ONLY. Serves the real EditProfileModal + StorefrontEditor
 * against a deterministic in-browser fake API (fake-api.ts). Not part of the
 * SvelteKit app, its routes or its build; no production credentials, routes
 * or auth bypasses are involved.
 *
 *   pnpm --filter @create-something/webflow-dashboard fixture:storefront
 *   open http://127.0.0.1:5199/?scenario=default
 */
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const COVER_SVG = readFileSync(here('./cover.svg'));

export default defineConfig({
	root: here('.'),
	publicDir: here('../../static'),
	plugins: [
		svelte({ preprocess: vitePreprocess() }),
		{
			// Stands in for the dashboard's /api/uploads/* file route so the
			// uploaded cover renders. Image bytes only; no state.
			name: 'fixture-uploads',
			configureServer(server) {
				server.middlewares.use('/api/uploads/fixture', (_req, res) => {
					res.setHeader('Content-Type', 'image/svg+xml');
					res.end(COVER_SVG);
				});
			}
		}
	],
	resolve: {
		alias: {
			$lib: here('../../src/lib'),
			'$app/environment': here('../../src/test/app-environment.ts')
		}
	},
	server: { host: '127.0.0.1', port: 5199, strictPort: true }
});
