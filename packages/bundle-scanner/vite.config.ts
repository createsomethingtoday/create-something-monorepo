import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Make process.env available for API key access
    'process.env': {}
  },
  server: {
    port: 3100
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
