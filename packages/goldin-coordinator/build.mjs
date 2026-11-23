import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("./", import.meta.url));
const options = {
  entryPoints: [root + "worker.mjs"],
  outfile: root + "dist/worker.mjs",
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  tsconfigRaw: { compilerOptions: { target: "ES2022" } },
  external: ["cloudflare:workers", "node:crypto"],
  alias: {
    "@create-something/canon/auth/server": fileURLToPath(
      new URL("../canon/src/lib/auth/server.ts", import.meta.url),
    ),
    "@create-something/auth-platform": fileURLToPath(
      new URL("../auth-platform/src/index.ts", import.meta.url),
    ),
  },
};

await build(options);
await build({
  ...options,
  entryPoints: [root + "../ona-agents/src/routes/api/goldin/+server.ts"],
  outfile: root + "dist/browser-route.mjs",
  alias: {
    ...options.alias,
    "@create-something/goldin-coordinator/browser-invocation":
      root + "browser-invocation.mjs",
  },
});

await build({
  ...options,
  entryPoints: [root + "production-browser.mjs"],
  outfile: root + "dist/production-browser.mjs",
});
