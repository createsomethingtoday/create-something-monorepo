import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/halfdozen.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: [
    "@create-something/observability",
    "@create-something/observability/openai-agents",
    "@openai/agents",
    "@trigger.dev/sdk",
    "zod",
  ],
});
