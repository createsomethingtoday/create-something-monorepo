# Half Dozen DM MCP

Generalized DM endpoint for the Half Dozen team.

v1 ships with **Notion tools only** (single client workspace, single key), while keeping a generic server identity so more DM toolsets can be added later.

## Setup

1. Add Notion integration key as Worker secret:

```bash
cd packages/halfdozen-dm-mcp/worker
wrangler secret put NOTION_API_KEY
```

2. Run locally:

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

## Environment

- `NOTION_API_KEY` (secret): DM client Notion integration token
- `WORKSPACE_CLIENT_LABEL` (var): default `DM`
- `WORKSPACE_CLIENT_DESCRIPTION` (var): default `DM Notion workspace`
- `MCP_DISPLAY_NAME` (var): default `Half Dozen DM MCP`
- `MCP_DESCRIPTION` (var): generic DM server description
- `ENABLED_TOOLSETS` (var): comma-separated toolsets, default `notion`

## Tools (v1)

All exposed tools are `notion_*` tools:

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

DM v1 targets a single workspace, so tool inputs do **not** include a `workspace` field.

## Resources

- `dm://tools` — canonical list of exposed tools
- `dm://toolsets` — enabled toolsets and workspace target

