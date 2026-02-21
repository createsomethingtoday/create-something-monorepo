# Half Dozen DM MCP

Generalized DM endpoint for the Half Dozen team.

v2 ships with:

- **Notion CRUD tools** (`notion_*`) for a single DM workspace
- **DM-scoped Google Drive sync tools** (`google_drive_*`) using Composio for Drive and direct Notion writes
- **Env-gated cron sync** every 15 minutes (metadata-only by default)

## Setup

1. Add Worker secrets:

```bash
cd packages/halfdozen-dm-mcp/worker
wrangler secret put MCP_API_KEY
wrangler secret put NOTION_API_KEY
wrangler secret put COMPOSIO_API_KEY
wrangler secret put COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID
# set COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID to: ac_RSiSxytldB_X
```

2. Configure vars (`worker/wrangler.toml`):

- `ENABLED_TOOLSETS=notion,drive`
- `COMPOSIO_ENTITY_ID=dm`
- `DRIVE_SYNC_DATA_SOURCE_ID=<target_data_source_id>`
- `ENABLE_DRIVE_CRON=false` (default; set true to enable scheduled sync)
- `DRIVE_CRON_BATCH_SIZE=25`
- `DRIVE_CRON_INITIAL_LOOKBACK_DAYS=7`

3. Configure Drive sync D1 binding (`DRIVE_SYNC_DB`) and apply migrations:

```bash
cd packages/halfdozen-dm-mcp/worker
wrangler d1 create halfdozen-dm-drive-sync
# copy returned DB ID into wrangler.toml DRIVE_SYNC_DB database_id
wrangler d1 migrations apply halfdozen-dm-drive-sync --remote
```

4. Run locally:

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
- `COMPOSIO_API_KEY`: Composio API token for Drive toolkit calls
- `COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID`: Drive auth config ID (`ac_RSiSxytldB_X`)

### Vars

- `WORKSPACE_CLIENT_LABEL` (default `DM`)
- `WORKSPACE_CLIENT_DESCRIPTION` (default `DM Notion workspace`)
- `MCP_DISPLAY_NAME` (default `Half Dozen DM MCP`)
- `MCP_DESCRIPTION` (DM server description)
- `ENABLED_TOOLSETS` (default `notion,drive`)
- `COMPOSIO_ENTITY_ID` (default `dm`)
- `DRIVE_SYNC_DATA_SOURCE_ID` (required for Drive sync)
- `ENABLE_DRIVE_CRON` (default `false`)
- `DRIVE_CRON_BATCH_SIZE` (default `25`)
- `DRIVE_CRON_INITIAL_LOOKBACK_DAYS` (default `7`)
- Optional Drive slug overrides:
  - `COMPOSIO_DRIVE_LIST_FILES_TOOL_SLUG`
  - `COMPOSIO_DRIVE_GET_METADATA_TOOL_SLUG`
  - `COMPOSIO_DRIVE_PARSE_FILE_TOOL_SLUG`

## Tools

### Notion tools (existing)

- `notion_search`
- `notion_list_databases`
- `notion_get_database`
- `notion_query_database`
- `notion_get_page`
- `notion_list_block_children`
- `notion_create_page`
- `notion_update_page`
- `notion_append_blocks`
- `notion_archive_page`
- `notion_archive_block`
- `notion_bulk_update`
- `notion_bulk_archive`
- `notion_create_database`
- `notion_update_database`

### Drive tools (new)

- `google_drive_connection_status`
- `google_drive_get_connect_link`
- `google_drive_list_files(query?, page_size?, page_token?)`
- `google_drive_sync_file_to_notion(file_id, with_content?)`
- `google_drive_sync_recent_to_notion(limit?, since_iso?, with_content?)`

Drive sync uses deterministic upsert by `(account_id, file_id)` where `account_id` is DM entity `dm`.

## Canonical Notion schema for Drive sync

`DRIVE_SYNC_DATA_SOURCE_ID` must contain these properties exactly (name + type):

- `Name` (`title`)
- `Drive File ID` (`rich_text`)
- `Account ID` (`rich_text`)
- `Web View Link` (`url`)
- `MIME Type` (`rich_text`)
- `Modified Time` (`date`)
- `Last Synced At` (`date`)
- `Sync Status` (`select`)

The sync fails fast if required properties are missing or mismatched.

## Content extraction behavior

- `with_content=true` is supported for:
  - Google Docs (`application/vnd.google-apps.document`)
  - text/
  - `application/json`, `application/csv`, `text/csv`, `text/markdown`
- Unsupported MIME types still sync metadata and return a warning.
- Cron runs metadata-only mode regardless of `with_content`.

## Resources

- `dm://tools` — tools exposed by currently enabled toolsets
- `dm://toolsets` — enabled toolsets + workspace and Drive runtime config

## Cron behavior

- Schedule: every 15 minutes
- No-op unless `ENABLE_DRIVE_CRON=true`
- First run (no checkpoint): uses `DRIVE_CRON_INITIAL_LOOKBACK_DAYS` (default 7 days)
- Subsequent runs: sync from stored checkpoint
- Checkpoint advances only when the run completes without file-level failures

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
