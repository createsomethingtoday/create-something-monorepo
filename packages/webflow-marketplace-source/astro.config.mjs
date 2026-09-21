import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  site: 'https://webflow.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    resolve: { alias: { '@marketplace': fileURLToPath(new URL('../webflow-components/src/components', import.meta.url)) }, dedupe: ['react', 'react-dom'] },
    server: { fs: { allow: [fileURLToPath(new URL('../', import.meta.url))] } },
  },
});
