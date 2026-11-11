import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
export default defineConfig({
  publicDir: false,
  base: '/npg-chat/',
  css: {
    // This document gets only framework utilities used by the React entry.
    // Agency's Tailwind configuration and its public-page styles stay separate.
    postcss: {
      plugins: [
        tailwindcss({
          content: [fileURLToPath(new URL('./src/lib/npg/astryx/**/*.{ts,tsx}', import.meta.url))],
          corePlugins: { preflight: false },
          theme: { extend: { spacing: { 4: 'var(--spacing-4)' } } }
        })
      ]
    }
  },
  build: {
    outDir: 'static/npg-chat',
    emptyOutDir: true,
    manifest: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client'))
          return;
        warn(warning);
      },
      input: fileURLToPath(new URL('./src/lib/npg/astryx/main.tsx', import.meta.url))
    }
  }
});
