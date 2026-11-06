import { existsSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(
  new URL(
    process.argv.includes("--production")
      ? "./production-app/"
      : process.argv.includes("--isolated")
        ? "./isolated-app/"
        : "../ona-agents/",
    import.meta.url,
  ),
);
// The isolated fixture uses the owning app's locked toolchain; no second install.
if (
  (process.argv.includes("--isolated") ||
    process.argv.includes("--production")) &&
  !existsSync(root + "node_modules")
)
  symlinkSync("../../ona-agents/node_modules", root + "node_modules", "dir");
for (const [entry, args] of [
  ["node_modules/@sveltejs/kit/svelte-kit.js", ["sync"]],
  ["node_modules/vite/bin/vite.js", ["build"]],
]) {
  const result = spawnSync(process.execPath, [root + entry, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
