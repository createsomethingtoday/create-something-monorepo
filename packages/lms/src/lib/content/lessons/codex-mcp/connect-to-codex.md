# Connect the Server to Codex

## Outcome

Register your local MCP server so Codex can call it.

## 1) Build First

```bash
pnpm --filter @create-something/codex-demo-mcp build
```

## 2) Add MCP Config

In this repo, update `.mcp.json` and add a local entry:

```json
{
  "mcpServers": {
    "codex-demo": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/create-something-monorepo/packages/codex-demo-mcp/dist/index.js"
      ]
    }
  }
}
```

Use an absolute path for `dist/index.js`.

## 3) Reload Codex Session

After saving config, restart your Codex session so the new server is discovered.

## 4) Verify in Chat

Ask Codex:

```text
Use the codex-demo MCP tool echo_text with text "hello from mcp".
```

If connected correctly, you should see a response containing `Echo: hello from mcp`.

## Next

Continue to **Test, Debug, Iterate**.
