import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			// Pin Composio to its ESM entry so the Pages server build does not depend on pnpm's symlink traversal.
			'@composio/core': fileURLToPath(new URL('./node_modules/@composio/core/dist/index.mjs', import.meta.url)),
		},
	},
	plugins: [
		{
			name: 'ensure-sveltekit-server-output',
			writeBundle() {
				fs.mkdirSync('.svelte-kit/output/server', { recursive: true });
				fs.writeFileSync(
					'.svelte-kit/output/server/internal.js',
					[
						'import { g, o, c, s, a, b } from "./chunks/internal.js";',
						'import { s as s2, e, f } from "./chunks/environment.js";',
						'export {',
						'  g as get_hooks,',
						'  o as options,',
						'  s2 as set_assets,',
						'  e as set_building,',
						'  c as set_manifest,',
						'  f as set_prerendering,',
						'  s as set_private_env,',
						'  a as set_public_env,',
						'  b as set_read_implementation',
						'};',
						''
					].join('\n')
				);
			}
		},
		sveltekit()
	],
	ssr: {
		resolve: {
			conditions: ['workerd', 'worker']
		}
	},
	build: {
		chunkSizeWarningLimit: 1200
	}
});
