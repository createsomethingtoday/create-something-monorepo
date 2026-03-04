# @create-something/composio-toolkit-mcp

Toolkit-scoped Composio MCP gateway for Hub-controlled toggles.

## Endpoints

- `/mcp/<toolkitSlug>` — Streamable HTTP MCP endpoint for one toolkit
- `/health` — service status and cache summary

## Why

This package enables per-toolkit registry entries in the CREATE SOMETHING Hub:

- One deployment
- Many toolkit-specific MCP routes
- Hub can enable/disable each toolkit independently via registry/state

## Management tools (per toolkit route)

- `connection_status`
- `get_connect_link`
- `toolkit_info`
- `zoom_latest_transcript_status` (Zoom toolkit route only)
- `zoom_list_available_transcripts` (Zoom toolkit route only)

All Composio toolkit tools are exposed dynamically for that toolkit route.

## Identity resolution

Default (`COMPOSIO_ENTITY_RESOLUTION_MODE=header_required`):

1. `x-mcp-account-id` header
2. Missing header returns an error

Compatibility mode (`COMPOSIO_ENTITY_RESOLUTION_MODE=compat`) resolves in this order:

1. `x-mcp-account-id` header
2. `Authorization: Bearer <entityId>`
3. `COMPOSIO_DEFAULT_ENTITY_ID`
4. `default`

## Required env

- `COMPOSIO_API_KEY`

## Optional env

- `COMPOSIO_AUTH_CONFIG_MAP` (JSON string, toolkit -> auth config id)
- `COMPOSIO_DEFAULT_ENTITY_ID`
- `COMPOSIO_ENTITY_RESOLUTION_MODE` (`header_required` default, or `compat`)
- `COMPOSIO_TOOL_CACHE_SECONDS`

## Local dev

```bash
pnpm --filter @create-something/composio-bridge build
pnpm --filter @create-something/composio-toolkit-mcp dev
```

## Deploy

```bash
pnpm --filter @create-something/composio-bridge build
pnpm --filter @create-something/composio-toolkit-mcp deploy
```

Example route:

`https://composio-toolkit-mcp.<subdomain>.workers.dev/mcp/gmail`
