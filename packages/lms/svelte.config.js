import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        // Legacy image aliases must reach Pages static redirects before the app worker.
        exclude: ['/workshop/canon.png', '<all>']
      }
    }),
    alias: {
      $components: 'src/lib/components',
      $content: 'src/lib/content',
      $progress: 'src/lib/progress',
      $canon: '../canon/src/lib'
    }
  }
};

export default config;
