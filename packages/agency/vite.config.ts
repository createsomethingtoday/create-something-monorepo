import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';

// Public editorial media and Switzer remain owned by the private Webflow site.
// Opt in locally to reproduce production edge ownership without copying assets.
const editorialAssetOrigin = process.env.AGENCY_EDITORIAL_ASSET_ORIGIN;
export default defineConfig({
  server: editorialAssetOrigin ? {
    proxy: { '^/agency/(?:editorial|fonts)/': { target: editorialAssetOrigin, changeOrigin: true } }
  } : undefined,
	resolve: {
		alias: {
			// Pin Composio to its ESM entry so the Pages server build does not depend on pnpm's symlink traversal.
			'@composio/core': fileURLToPath(new URL('./node_modules/@composio/core/dist/index.mjs', import.meta.url))
		}
	},
	plugins: [sveltekit() as unknown as PluginOption],
	ssr: {
		noExternal: ['lucide-svelte']
	},
	build: {
		chunkSizeWarningLimit: 1200
	}
});
