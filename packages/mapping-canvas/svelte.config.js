import cloudflareAdapter from '@sveltejs/adapter-cloudflare';
import staticAdapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
const native = process.env.DRAW_NATIVE_BUILD === '1';
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: native
      ? staticAdapter({ pages: 'build', assets: 'build', fallback: 'index.html', precompress: false, strict: true })
      : cloudflareAdapter({ routes: { include: ['/*'], exclude: ['<all>'] } })
  }
};
