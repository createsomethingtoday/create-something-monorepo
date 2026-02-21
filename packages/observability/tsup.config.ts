import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/atlas.ts', 'src/mcp.ts', 'src/braintrust.ts', 'src/openai-agents.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk']
});
