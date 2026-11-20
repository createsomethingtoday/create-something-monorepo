import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@astryxdesign/theme-neutral/fonts.css': fileURLToPath(
        new URL('./ui/fonts.css', import.meta.url)
      )
    }
  },
  server: { host: '127.0.0.1', port: 4383, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'safari16.4', cssTarget: 'safari16.4' }
});
