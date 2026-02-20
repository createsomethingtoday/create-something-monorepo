# Enable Webflow App Review MCP in an Antigravity Instance

This guide is verified against current Antigravity MCP behavior (custom MCP config via `mcp_config.json`) and your current App Review MCP security posture (OAuth shared client, bearer disabled).

## Current MCP Endpoint

- Base URL: `https://webflow-app-review-mcp.createsomething.workers.dev`
- MCP endpoint: `https://webflow-app-review-mcp.createsomething.workers.dev/mcp`
- Health check: `https://webflow-app-review-mcp.createsomething.workers.dev/health`

## Auth Model (Current Server)

This server is configured for OAuth 2.1 shared-client mode:

- `client_id`: `app-review-reviewers`
- `client_secret`: shared reviewer secret
- Legacy bearer fallback is disabled (`legacy_api_key: false`)

## Critical Compatibility Note

Google Cloud documents that Antigravity currently does not support MCP OAuth client-ID/secret flows natively.  
For this server, use the `mcp-remote` bridge with static OAuth client info.

Because dynamic client registration is disabled in shared-client mode, Antigravity should connect through `mcp-remote` with static OAuth client info.

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

## Recommended Antigravity Config

Add this entry to `mcp_config.json`:

```json
{
  "mcpServers": {
    "app-review-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://webflow-app-review-mcp.createsomething.workers.dev/mcp",
        "--static-oauth-client-info",
        "{\"client_id\":\"app-review-reviewers\",\"client_secret\":\"${APP_REVIEW_OAUTH_CLIENT_SECRET}\"}"
      ],
      "env": {
        "APP_REVIEW_OAUTH_CLIENT_SECRET": "REPLACE_WITH_SHARED_SECRET"
      }
    }
  }
}
```

Notes:

- `mcp-remote` is a bridge for stdio-first clients to connect to remote OAuth MCP servers.
- Replace `REPLACE_WITH_SHARED_SECRET` with your distributed shared secret.
- If your Antigravity runtime does not resolve `${...}` placeholders in args, inline the secret in the JSON string instead.

## Redirect Allowlist Requirement

`mcp-remote` uses localhost callback defaults for OAuth (host `localhost`, port `3334` by default).  
Your Worker currently enforces host allowlisting via `SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS`, so include localhost hosts:

```bash
printf '%s' 'claude.ai,localhost,127.0.0.1' | npx wrangler secret put SHARED_OAUTH_ALLOWED_REDIRECT_HOSTS --name webflow-app-review-mcp
```

If you run `mcp-remote` with `--host <custom-host>`, include that host in the allowlist too.

## Validation Checklist

1. `curl https://webflow-app-review-mcp.createsomething.workers.dev/health` shows:
   - `"oauth_mode": "shared-client-secret"`
   - `"shared_client_configured": true`
2. Antigravity shows the server as connected after auth.
3. A simple tool call succeeds (for example `app_review_list_queue` with a small `limit`).

## Security Notes

- Treat the shared client secret as a production credential.
- Distribute via secret manager, not plain chat/docs.
- Rotate on team changes or suspected exposure.
- Keep redirect host allowlist minimal.

## Research References

- Antigravity MCP setup flow (`MCP Servers` -> `Manage MCP Servers` -> `View raw config`) and custom `mcp_config.json` format: [Google Cloud docs](https://docs.cloud.google.com/alloydb/docs/connect-ide-using-mcp-toolbox)
- Antigravity OAuth limitation for MCP client ID/secret: [Google Cloud MCP known issues](https://docs.cloud.google.com/mcp/known-issues)
- `mcp-remote` usage, `--static-oauth-client-info`, and localhost OAuth callback defaults: [mcp-remote README](https://raw.githubusercontent.com/geelen/mcp-remote/main/README.md)
