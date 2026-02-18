import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/panel.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
    },
  },
});
