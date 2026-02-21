# Connect the Server to Codex

## Outcome

Register your local MCP server so Codex can call it.

## 1) Build First

```bash
pnpm --filter @create-something/codex-demo-mcp build
```

## 2) Add MCP Config

Use Codex MCP management to register your local server:

```bash
codex mcp add codex-demo -- node "$(pwd)/packages/codex-demo-mcp/dist/index.js"
```

This writes server config to your Codex config and uses an absolute path based on the current repo.

## 3) Verify Registration

```bash
codex mcp get codex-demo
```

## 4) Reload Codex Session

After saving config, restart your Codex session so the new server is discovered.

## 5) Verify in Chat

Ask Codex:

```text
Use the codex-demo MCP tool echo_text with text "hello from mcp".
```

If connected correctly, you should see a response containing `Echo: hello from mcp`.

## Next

Continue to **Test, Debug, Iterate**.
