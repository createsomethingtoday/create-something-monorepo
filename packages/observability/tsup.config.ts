import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/atlas.ts', 'src/mcp.ts', 'src/langfuse.ts', 'src/openai-agents.ts'],
  format: ['esm'],
  dts: true,
  // This package is built by multiple downstream prebuild hooks in parallel.
  // Avoid cleaning dist/ so concurrent builds do not race on unlinking the same files.
  clean: false,
  splitting: false,
  sourcemap: true,
  external: ['@modelcontextprotocol/sdk']
});
