import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  publicDir: false,
  base: '/npg-chat/',
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
