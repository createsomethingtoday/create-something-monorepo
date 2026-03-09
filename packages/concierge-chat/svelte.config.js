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
    alias: {
      $chat: 'src/lib/chat',
      $demo: 'src/lib/demo',
      $server: 'src/lib/server',
      $widgets: 'src/lib/widgets'
    }
  }
};

export default config;
