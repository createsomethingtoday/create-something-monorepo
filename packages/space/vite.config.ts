import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
	// Match Vite 7's documented browser baseline. The TLA plugin otherwise
	// restores its Vite 6 defaults, including Safari 14.0's destructuring bug.
	build: { target: ['chrome107', 'edge107', 'firefox104', 'safari16'] },
	plugins: [wasm(), topLevelAwait(), sveltekit()],
	ssr: {
		noExternal: ['lucide-svelte']
	}
});
