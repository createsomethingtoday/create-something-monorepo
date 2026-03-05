# Enable Webflow App Review MCP in an Antigravity Instance

This guide reflects the current deployed App Review MCP endpoint and auth model: a remote HTTP MCP server protected by a shared bearer token.

## Current MCP Endpoint

- Base URL: `https://webflow-app-review-mcp.createsomething.workers.dev`
- MCP endpoint: `https://webflow-app-review-mcp.createsomething.workers.dev/mcp`
- Health check: `https://webflow-app-review-mcp.createsomething.workers.dev/health`

## Auth Model (Current Server)

This server requires a bearer token at the Worker boundary:

- Header: `Authorization: Bearer <MCP_API_KEY>`
- `/health` is public
- `/mcp` and `/sse` require the bearer token

## Antigravity Navigation (Confirmed)

In Antigravity:

1. Open the editor agent panel.
2. Click `...` (top of panel) and choose `MCP Servers`.
3. Click `Manage MCP Servers` > `View raw config`.
4. Edit `mcp_config.json`.

File location:

- `~/.gemini/antigravity/mcp_config.json`
- On this machine: `/Users/micahjohnson/.gemini/antigravity/mcp_config.json`

This is a global Antigravity config file.
On first run, this file may be empty.

## Recommended Antigravity Config

Add this entry to `mcp_config.json`:

```json
{
  "mcpServers": {
    "app-review-mcp": {
      "type": "http",
      "url": "https://webflow-app-review-mcp.createsomething.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer REPLACE_WITH_MCP_API_KEY"
      }
    }
  }
}
```

Notes:

- Replace `REPLACE_WITH_MCP_API_KEY` with the shared worker token distributed to reviewers.
- Keep the token in a local secret store if your Antigravity setup supports variable interpolation or secret references.
- If `mcp_config.json` is empty, paste the full JSON block above.
- If `mcp_config.json` already has other servers, merge only the `app-review-mcp` object under `mcpServers`.

## Reload Required After Save

After saving `mcp_config.json`, reload Antigravity MCP state:

1. Return to `MCP Servers` and click refresh/reload.
2. If the server does not appear, restart Antigravity completely.
3. Re-open `MCP Servers` and confirm `app-review-mcp` is listed before testing tools.

## Validation Checklist

1. `curl https://webflow-app-review-mcp.createsomething.workers.dev/health` shows:
   - `"auth": { "mode": "Bearer required" }`
   - `"configured": true`
2. Treat step 1 as server-side validation only (it does not confirm Antigravity loaded your local config).
3. `curl https://webflow-app-review-mcp.createsomething.workers.dev/mcp` without auth returns `401`.
4. Antigravity shows the server as connected after loading the header-based config.
5. A simple tool call succeeds (for example `app_review_list_queue` with a small `limit`).

## First-Run Troubleshooting

- Symptom: `server name app-review-mcp not found`.
- Cause: Antigravity has not reloaded `mcp_config.json`.
- Fix: refresh MCP Servers, then fully restart Antigravity if needed.

- Symptom: server appears but tool calls fail with `401 Unauthorized`.
- Cause: missing or incorrect `Authorization` header in `mcp_config.json`.
- Fix: confirm the config sends `Authorization: Bearer <MCP_API_KEY>` exactly and that the token is current.

## Security Notes

- Treat the shared MCP API key as a production credential.
- Distribute via secret manager, not plain chat/docs.
- Rotate on team changes or suspected exposure.
- Validate access with `/health` first, then `/mcp`.

## Research References

- Antigravity MCP setup flow (`MCP Servers` -> `Manage MCP Servers` -> `View raw config`) and custom `mcp_config.json` format: [Google Cloud docs](https://docs.cloud.google.com/alloydb/docs/connect-ide-using-mcp-toolbox)
