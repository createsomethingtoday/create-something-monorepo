import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  root: resolve(import.meta.dirname, 'web'),
  build: {
    outDir: resolve(import.meta.dirname, 'dist/client'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'web/index.html'),
        app: resolve(import.meta.dirname, 'web/app.html'),
        inboxes: resolve(import.meta.dirname, 'web/inboxes.html')
      }
    }
  },
  server: { proxy: { '/api': 'http://127.0.0.1:8796', '/auth': 'http://127.0.0.1:8796' } }
});
