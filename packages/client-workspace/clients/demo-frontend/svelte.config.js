import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const previewBase = process.env.CLIENT_WORKSPACE_PREVIEW_BASE || '';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    paths: { base: previewBase }
  }
};
