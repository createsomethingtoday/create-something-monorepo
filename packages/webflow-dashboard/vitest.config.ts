import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '$app/environment': new URL('./src/test/app-environment.ts', import.meta.url).pathname
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
