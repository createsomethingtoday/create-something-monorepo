# DM Client Hub Onboarding and Secure Key Handoff

This runbook is for onboarding a DM client to connect their Hub/client tools to the DM MCP endpoint securely.

## 1. Security Baseline

- Do not send keys over email, Slack channels, tickets, or shared docs.
- Use one-time secret delivery (1Password share link, Bitwarden Send, or equivalent).
- Share only client-facing auth keys.
- Never share internal upstream secrets (`NOTION_API_KEY`, `COMPOSIO_API_KEY`, `HUB_SESSION_RESOLVE_TOKEN`).

## 2. Important Constraint: "Export" From Cloudflare Secrets

Cloudflare Worker secret values are not retrievable after being set.

- You can list secret names (`wrangler secret list`).
- You cannot export existing secret values.
- If a value is needed for handoff, generate/rotate a new value and set it as the current secret.

## 3. Key Inventory (What to Share vs Not Share)

| Key | Shared With Client? | Purpose |
|---|---|---|
| `MCP_API_KEY` (as client env var `HALFDOZEN_DM_MCP_API_KEY`) | Yes | Auth for `https://dm.mcp.workway.co/mcp` |
| `HUB_API_TOKEN` (if client uses your remote Hub endpoint directly) | Maybe | Gateway auth for Hub remote endpoint |
| `NOTION_API_KEY` | No | Server-side Notion integration secret |
| `COMPOSIO_API_KEY` | No | Server-side Composio secret |
| `HUB_SESSION_RESOLVE_TOKEN` | No | Internal resolver auth secret |

## 4. Internal Prep Before Client Call

Run from the right package directory before sharing:

```bash
# DM MCP key rotation (if needed)
cd packages/halfdozen-dm-mcp/worker
NEW_DM_KEY="$(openssl rand -hex 32)"
printf '%s' "$NEW_DM_KEY" | pnpm exec wrangler secret put MCP_API_KEY
pnpm exec wrangler deploy
```

Optional Hub token rotation:

```bash
cd packages/cs-mcp-hub-remote
NEW_HUB_TOKEN="$(openssl rand -hex 32)"
printf '%s' "$NEW_HUB_TOKEN" | pnpm exec wrangler secret put HUB_API_TOKEN
pnpm exec wrangler deploy
```

## 5. Key Packet Template (Fill Before Call)

Copy this block, fill real values locally, and deliver through one-time secure share:

```txt
Client: <client_name>
Created: <yyyy-mm-dd hh:mm TZ>
Expires/Rotate By: <yyyy-mm-dd>

DM Endpoint:
https://dm.mcp.workway.co/mcp

HALFDOZEN_DM_MCP_API_KEY:
<paste_dm_key_here>

Optional Hub Endpoint:
<paste_hub_url_here>

Optional HUB_API_TOKEN:
<paste_hub_token_here>
```

## 6. Client Walkthrough Script

### 6.1 Set key in shell

```bash
export HALFDOZEN_DM_MCP_API_KEY="<paste_dm_key_here>"
```

Persist for zsh:

```bash
echo 'export HALFDOZEN_DM_MCP_API_KEY="<paste_dm_key_here>"' >> ~/.zshrc
source ~/.zshrc
```

### 6.2 Codex config (`~/.codex/config.toml`)

```toml
[mcp_servers.halfdozen-dm-mcp]
url = "https://dm.mcp.workway.co/mcp"
enabled = true
bearer_token_env_var = "HALFDOZEN_DM_MCP_API_KEY"
```

### 6.3 Claude Desktop config (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "halfdozen-dm-mcp": {
      "url": "https://dm.mcp.workway.co/mcp",
      "headers": {
        "Authorization": "Bearer <paste_dm_key_here>"
      }
    }
  }
}
```

### 6.4 Verification check

Ask client to confirm tools/resources load in their MCP host after restart.

Optional HTTP check:

```bash
curl -i https://dm.mcp.workway.co/mcp \
  -H "Authorization: Bearer $HALFDOZEN_DM_MCP_API_KEY"
```

## 7. Delivery Procedure

1. Generate/rotate the key if needed.
2. Paste into the "Key Packet Template."
3. Send via one-time secure share.
4. Deliver passphrase in a separate channel (if your tool supports it).
5. Confirm client copied the key.
6. Revoke one-time link.
7. Record handoff timestamp and next rotation date.

## 8. Rotation and Revocation

- Immediate rotation triggers: suspected exposure, client offboarding, or lost device.
- Standard rotation cadence: every 60-90 days.
- After rotation:
  - redeploy service,
  - send new key through secure channel,
  - confirm client connectivity,
  - invalidate old key distribution artifacts.

