import { defineConfig } from '../../../packages/private-pcn/node_modules/vite/dist/node/index.js';
import { svelte } from '../../../packages/private-pcn/node_modules/@sveltejs/vite-plugin-svelte/src/index.js';
import { fileURLToPath } from 'node:url';
const at = (path) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: at('./'), publicDir: at('../../../packages/private-pcn/static'),
  plugins: [svelte({configFile: false}), {
    name: 'local-fixture-data',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET' && req.url === '/videos') { res.end(JSON.stringify({ videos: [] })); }
        else { res.statusCode = 405; res.end(JSON.stringify({ error: 'Fixture has no writes' })); }
      });
    }
  }],
  resolve: { dedupe: ['svelte'], alias: {
    '$lib': at('../../../packages/private-pcn/src/lib'),
    '$app/state': at('./state.svelte.ts'), '$app/navigation': at('./navigation.ts')
  }},
  server: { host: '127.0.0.1', port: 43115, strictPort: true, fs: { allow: [at('../../../')] } }
});
