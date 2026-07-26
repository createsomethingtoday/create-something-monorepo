import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '$app/environment': new URL('./src/test/app-environment.ts', import.meta.url).pathname,
      // SvelteKit resolves $lib at build time; tests need the same mapping so
      // route handlers can be imported directly.
      $lib: new URL('./src/lib', import.meta.url).pathname
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
