import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/atlas.ts', 'src/mcp.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk']
});
