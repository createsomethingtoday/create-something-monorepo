# Half Dozen DM MCP

Generalized DM endpoint for the Half Dozen team.

v3 ships with:

- **Notion CRUD tools** (`notion_*`) for a single DM workspace
- **DM-namespaced Composio proxy tools** (`dm_composio__<toolkit>__<tool>`) with allow-list enforcement
- **Composio management tools**:
  - `dm_composio_toolkit_inventory`
  - `dm_composio_connection_status`
  - `dm_composio_get_connect_link`

Direct Drive sync integration and Drive cron sync were removed.

## Setup

1. Add Worker secrets:

```bash
cd packages/halfdozen-dm-mcp/worker
wrangler secret put MCP_API_KEY
wrangler secret put NOTION_API_KEY
wrangler secret put COMPOSIO_API_KEY
```

2. Configure vars (`worker/wrangler.toml`):

- `ENABLED_TOOLSETS=notion,composio`
- `COMPOSIO_PROXY_MODE=allowlist` (recommended)
- `COMPOSIO_ALLOWED_TOOLKITS=googledrive,zoom,slack,quickbooks,dropbox` (example)
- `COMPOSIO_ALLOWED_TOOLKITS_BY_ENTITY={...}` (optional per-entity override)
- `COMPOSIO_ENTITY_ID=dm` (default entity fallback)
- `COMPOSIO_TOOL_NAME_PREFIX=dm_composio`
- `COMPOSIO_AUTH_CONFIG_MAP={...}` (required for `dm_composio_get_connect_link`, inject per environment)

3. Run locally:

```bash
pnpm install
cd packages/halfdozen-dm-mcp/worker
pnpm dev
```

MCP endpoint: `http://localhost:8787/mcp`

## Production

- URL: `https://dm.mcp.workway.co/mcp`
- Deploy from repo root:

```bash
pnpm run deploy:halfdozen-dm-mcp
```

Or from worker directory:

```bash
cd packages/halfdozen-dm-mcp/worker
pnpm exec wrangler deploy
```

## Auth

`/mcp` and `/sse` require `MCP_API_KEY`.

Accepted auth forms:

- `Authorization: Bearer <MCP_API_KEY>`
- `X-API-Key: <MCP_API_KEY>`

If `MCP_API_KEY` is missing in a deployment, the server returns `500` on MCP transport routes.

## Environment

### Secrets

- `MCP_API_KEY`: transport auth token for `/mcp` and `/sse`
- `NOTION_API_KEY`: DM Notion integration token
- `COMPOSIO_API_KEY`: Composio API token

### Vars

- `WORKSPACE_CLIENT_LABEL` (default `DM`)
- `WORKSPACE_CLIENT_DESCRIPTION` (default `DM Notion workspace`)
- `MCP_DISPLAY_NAME` (default `Half Dozen DM MCP`)
- `MCP_DESCRIPTION` (server description)
- `ENABLED_TOOLSETS` (default `notion,composio`)
- `COMPOSIO_ENTITY_ID` (default `dm`)
- `COMPOSIO_PROXY_MODE` (`allowlist` or `all`, default `allowlist`)
- `COMPOSIO_ALLOWED_TOOLKITS` (CSV toolkit slugs)
- `COMPOSIO_ALLOWED_TOOLKITS_BY_ENTITY` (JSON map of entity -> toolkit list)
- `COMPOSIO_TOOL_NAME_PREFIX` (default `dm_composio`)
- `COMPOSIO_TOOL_CACHE_SECONDS` (default `300`)
- `COMPOSIO_AUTH_CONFIG_MAP` (JSON map `toolkit -> authConfigId`, used by connect-link tool)

## Allow-list behavior

- **default deny** in `allowlist` mode unless toolkit is allowed globally or for the resolved entity.
- Entity resolution order:
  1. `entity_id` / `__dm_entity_id` / `account_id` tool argument
  2. `x-mcp-account-id` / `x-account-id` header
  3. `COMPOSIO_ENTITY_ID` fallback
- Tool catalog is built from the configured allow-list union. Execution is re-checked per entity.

## Resources

- `dm://tools` — tools exposed by currently enabled toolsets
- `dm://toolsets` — enabled toolsets + workspace + composio runtime/allow-list config

## Root Metadata (`/`)

- `GET /` returns server metadata including the resolved tool list.
- When Composio is enabled, the endpoint uses a cached Composio discovery fallback so DM proxy tools (for example `dm_composio__dropbox__*`) are visible even before an `/mcp` session warms in-memory state.

## Client Setup

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.halfdozen-dm-mcp]
url = "https://dm.mcp.workway.co/mcp"
enabled = true
bearer_token_env_var = "HALFDOZEN_DM_MCP_API_KEY"
```

Set the token in your shell/profile:

```bash
export HALFDOZEN_DM_MCP_API_KEY="YOUR_DM_MCP_API_KEY"
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "halfdozen-dm-mcp": {
      "url": "https://dm.mcp.workway.co/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DM_MCP_API_KEY"
      }
    }
  }
}
```
