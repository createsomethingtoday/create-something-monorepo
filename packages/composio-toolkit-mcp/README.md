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
- `google_search_console_compare_periods` (Google Search Console route only)
- `gmail_mark_read_by_query` (Gmail toolkit route only)
- `zoom_latest_transcript_status` (Zoom toolkit route only)
- `zoom_list_available_transcripts` (Zoom toolkit route only)

Most Composio toolkit tools are exposed dynamically for that toolkit route.
Google Search Console is the governed exception: `policy.composio-gsc-readonly.v1`
projects an exact six-tool read allowlist before route registration. Site
add/delete, sitemap submit/delete, Indexing API, and unknown future actions are
not registered and direct calls fail as `Unknown tool` before Composio tool
execution.

### Google Search Console intelligence

The GSC route exposes these upstream reads:

- list/get sites
- Search Analytics query
- URL inspection
- list/get sitemaps

`google_search_console_compare_periods` calls only the allowlisted Search
Analytics source. It paginates two explicit windows and returns a deterministic
receipt containing impression-weighted totals, deltas, positions 8–15
opportunities, and simple question-prefix signals for answer-seeking queries.
The thresholds are configurable and the ranking formula is returned with every
receipt.

The receipt is deliberately bounded:

- dimensioned totals cover returned rows and may not equal property-wide totals
- missing rows are not proof that a URL is unindexed
- question-like queries are not proof of an AI answer or citation
- ordinary Search Analytics does not replace Search Console's dedicated
  Generative AI performance report

### Gmail helper workflow

`gmail_mark_read_by_query` removes the `UNREAD` label for every message matching a Gmail search query. It hides the two-step fetch-IDs-then-batch-modify flow behind one tool call.

Example:

```json
{
  "query": "is:unread in:inbox",
  "dryRun": false
}
```

Use `dryRun: true` to inspect matched message IDs before updating Gmail.

## Connection behavior

- `connection_status` now returns per-toolkit connection details, including duplicate active accounts and a recommended `connectedAccountId`.
- `get_connect_link` is idempotent against existing active connections and, by default, against pending requests. Use `forceNew: true` only when you intentionally want a fresh link after cleaning up stale pending requests.
- All toolkit tools accept optional `connectedAccountId` to pin execution when multiple active connected accounts exist for the same entity/toolkit.

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
- `COMPOSIO_AIRTABLE_AUTH_CONFIG_ID` (explicit Airtable auth config fallback)
- `COMPOSIO_GOOGLE_SEARCH_CONSOLE_AUTH_CONFIG_ID` (explicit Google Search Console auth config fallback)
- `COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID` (explicit QuickBooks auth config fallback)
- `COMPOSIO_DEFAULT_ENTITY_ID`
- `COMPOSIO_ENTITY_RESOLUTION_MODE` (`header_required` default, or `compat`)
- `COMPOSIO_TOOL_CACHE_SECONDS`

## Local dev

```bash
pnpm --filter @create-something/mcp-core build
pnpm --filter @create-something/composio-bridge build
pnpm --filter @create-something/composio-toolkit-mcp test
pnpm --filter @create-something/composio-toolkit-mcp typecheck
pnpm --filter @create-something/composio-toolkit-mcp dev
```

## Deploy

```bash
pnpm --filter @create-something/composio-bridge build
pnpm --filter @create-something/composio-toolkit-mcp deploy
```

Example route:

`https://composio-toolkit-mcp.<subdomain>.workers.dev/mcp/gmail`
