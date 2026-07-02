# Connect the Server to Codex

## Outcome

Register your local MCP server so Codex can discover and call it.

## 1) Build First

```bash
pnpm --filter @create-something/codex-demo-mcp build
```

## 2) Add MCP Config

Use the Codex MCP CLI to register your local server:

```bash
codex mcp add codex-demo -- node "$(pwd)/packages/codex-demo-mcp/dist/index.js"
```

This writes server config to your Codex config and uses an absolute path based on the current repo.

The same server can be represented directly in `~/.codex/config.toml`:

```toml
[mcp_servers.codex-demo]
command = "node"
args = ["/absolute/path/to/repo/packages/codex-demo-mcp/dist/index.js"]
```

If a server needs environment variables, put them in local config or a secret manager. Do not commit credentials to the repo:

```toml
[mcp_servers.internal-status]
command = "node"
args = ["/absolute/path/to/server/dist/index.js"]
env = { INTERNAL_STATUS_API_URL = "https://example.internal" }
```

## 3) Verify Registration

```bash
codex mcp list
codex mcp get codex-demo
```

## 4) Reload Codex Session

After saving config, restart your Codex session so the new server is discovered. If you are inside a long-running Codex desktop thread, start a fresh session before treating a missing tool as a server bug.

## 5) Verify in Chat

Ask Codex:

```text
Use the codex-demo MCP tool echo_text with text "hello from mcp".
```

If connected correctly, you should see a response containing `Echo: hello from mcp`.

## Auth Note

`codex mcp login` and `codex mcp logout` are for auth-capable servers. The local stdio server in this course does not need an auth login flow.

## Checkpoint

At this point you should be able to prove:

- Codex knows the server name.
- The server command points at the built file.
- The tool is discoverable in a fresh session.
- A real Codex prompt can call the tool and read the result.

## Next

Continue to **Test, Debug, Iterate**.
