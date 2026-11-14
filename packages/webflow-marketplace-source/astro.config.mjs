import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  site: 'https://webflow.com',
  output: 'server',
  compressHTML: true,
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    resolve: { alias: { '@marketplace': fileURLToPath(new URL('./src/vendor/marketplace', import.meta.url)) }, dedupe: ['react', 'react-dom'] },
    // Template demos allow framing from http://*.webflow.com only (CSP frame-ancestors). A hosts alias
    // such as marketplace-dev.webflow.com on port 80 lets the dev preview show the real demo.
    server: { fs: { allow: [fileURLToPath(new URL('../', import.meta.url))] }, allowedHosts: ['.webflow.com'] },
  },
});
