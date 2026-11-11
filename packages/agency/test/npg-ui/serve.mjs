import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const server = await createServer({
  configFile: false,
  root,
  plugins: [svelte({ configFile: false })],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('../../src/lib', import.meta.url)) },
    conditions: ['browser']
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.NPG_UI_PORT || 4197),
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('../../../..', import.meta.url))] }
  }
});
await server.listen();
console.log('NPG component fixture: ' + server.resolvedUrls.local[0]);
