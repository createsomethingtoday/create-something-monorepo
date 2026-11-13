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
          theme: {
            extend: {
              spacing: { 3: 'var(--spacing-3)', 4: 'var(--spacing-4)' },
              maxWidth: { reading: 'calc(var(--spacing-10) * 18)' },
              width: { evidence: 'calc(var(--spacing-10) * 9)' },
              colors: {
                'state-info': 'var(--color-text-info)',
                'state-review': 'var(--color-text-warning)',
                'state-error': 'var(--color-text-error)',
                'state-ready': 'var(--color-text-success)',
                'state-neutral': 'var(--color-text-secondary)'
              },
              minHeight: { control: 'calc(var(--spacing-10) + var(--spacing-1))' },
              minWidth: { control: 'calc(var(--spacing-10) + var(--spacing-1))' }
            }
          }
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
