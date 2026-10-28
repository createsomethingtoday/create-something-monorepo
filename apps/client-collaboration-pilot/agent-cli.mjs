// One bounded local invocation, shared by Claude Code and Codex shell tools.
// MCP-shaped contract adapter, not a complete MCP transport/server.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openStore, principals, contract, invoke } from "./store.mjs";
if (process.env.NODE_ENV === "production")
  throw Error("Synthetic adapter cannot run in production");
mkdirSync(new URL("./.local/", import.meta.url), { recursive: true });
const store = openStore(
  fileURLToPath(new URL("./.local/pilot.sqlite", import.meta.url)),
);
try {
  const [method, raw = "{}"] = process.argv.slice(2);
  const a = JSON.parse(raw);
  const result =
    method === "resources/read"
      ? store.context(principals.agent)
      : method === "tools/list"
        ? contract.tools
        : method === "tools/call"
          ? invoke(store, principals.agent, a.name, a.arguments)
          : undefined;
  if (result === undefined)
    throw Error("Use resources/read, tools/list or tools/call");
  console.log(JSON.stringify({ result }, null, 2));
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exitCode = 1;
} finally {
  store.close();
}
