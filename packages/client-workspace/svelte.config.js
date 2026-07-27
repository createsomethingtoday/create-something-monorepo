import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    csrf: {
      trustedOrigins: ['tauri://localhost', 'http://tauri.localhost', 'https://tauri.localhost']
    },
    csp: {
      mode: 'nonce',
      directives: {
        'default-src': ['self'],
        'base-uri': ['none'],
        'object-src': ['none'],
        'frame-ancestors': ['none'],
        'form-action': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'blob:'],
        'connect-src': ['self'],
        'frame-src': ['self']
      }
    }
  }
};
