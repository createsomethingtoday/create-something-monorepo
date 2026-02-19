import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		// Keep SQLite fallback external for local Node development.
		external: ['better-sqlite3']
	}
});
