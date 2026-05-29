# Notion Half Dozen X CREATE SOMETHING

**Official name:** Notion Half Dozen X CREATE SOMETHING.

This MCP gives **Half Dozen** access to both its own internal Notion and its **CREATE SOMETHING (agency) client’s** Notion workspace from one place. One operator can act in either workspace using the full set of Notion tools. No Composio; two operator-managed Notion integration tokens.

## Workspaces

| Workspace   | Secret                 | Use case |
|------------|------------------------|----------|
| **halfdozen** | `NOTION_API_KEY`       | Half Dozen internal: Meeting Capture, meeting transcripts (e.g. Danny meeting). |
| **client**    | `NOTION_CLIENT_API_KEY`| **CREATE SOMETHING agency client’s** Notion — work Half Dozen does for that client. |
| **createSomething** | `NOTION_CREATE_SOMETHING_API_KEY` | CREATE SOMETHING-owned Notion mirror databases, including worker-managed delivery-ticket mirrors. |

Every tool call includes `workspace: "halfdozen"` or `workspace: "client"` so the right workspace is targeted.

## Setup

1. **Two Notion integrations**
   - Create an internal integration in the **Half Dozen** Notion workspace; copy the secret → `NOTION_API_KEY`.
   - Create an internal integration in the **client's** Notion workspace; copy the secret → `NOTION_CLIENT_API_KEY`.
   - In each workspace, share the relevant pages/databases with the integration (via the integration's Access tab or by inviting the integration on each page).

2. **Worker secrets** (from `packages/halfdozen-notion-mcp/worker/`)

   ```bash
   wrangler secret put NOTION_API_KEY
   wrangler secret put NOTION_CLIENT_API_KEY
   wrangler secret put NOTION_CREATE_SOMETHING_API_KEY
   ```

3. **Run locally**

   ```bash
   pnpm install
   cd packages/halfdozen-notion-mcp/worker && pnpm dev
   ```

   MCP endpoint: `http://localhost:8787/mcp` (Streamable HTTP).

## Agency Ops Registry (Substrate Canonical, Notion View)

For CREATE SOMETHING Agency Ops, **Substrate is canonical** and **Notion is a view layer** for browsing/filtering.

This package includes two scripts:

1. **Bootstrap / migration (Notion → Substrate)** — one-time import of existing Notion ops databases into Substrate:

   ```bash
   cd packages/halfdozen-notion-mcp
   NOTION_SYNC_BEARER_TOKEN=<token> SUBSTRATE_ADMIN_TOKEN=<token or SUBSTRATE_TOKEN> \
   pnpm run sync:agency-ops
   ```

2. **View sync (Substrate → Notion)** — upserts Notion pages from Substrate and writes back `notion_page_id`/`notion_url` into Substrate for stable mapping:

   ```bash
   cd packages/halfdozen-notion-mcp
   NOTION_SYNC_BEARER_TOKEN=<token> SUBSTRATE_ADMIN_TOKEN=<token or SUBSTRATE_TOKEN> \
   pnpm run sync:agency-ops:view
   ```

   Notes:
   - Optional env overrides: `NOTION_URL`, `SUBSTRATE_URL`, `DRY_RUN=1`.
   - If `Agents` database does not exist in Notion and the script cannot infer the parent page, set `NOTION_AGENCY_OPS_PARENT_PAGE_ID=<page_id>` and rerun.

## Production

- **URL:** `https://createsomething-notion.mcp.workway.co/mcp` (after deploy and custom domain).
- **Deploy** (requires `wrangler login` or `CLOUDFLARE_API_TOKEN`):

  ```bash
  # From repo root (after pnpm install so worker has node_modules)
  pnpm run deploy:halfdozen-notion-mcp
  ```

  Or from the worker directory: `cd packages/halfdozen-notion-mcp/worker && pnpm exec wrangler deploy`.

  The worker package is in the pnpm workspace so dependencies resolve when bundling.

### Second instance: Half Dozen × System Studio

Same codebase, different Worker and URL. Workspaces: **halfdozen** = Half Dozen (HD key), **client** = System Studio (System Studio key). `wrangler.system-studio.toml` sets `[vars]` so the MCP resource and root response show "Half Dozen" and "System Studio".

```bash
cd packages/halfdozen-notion-mcp/worker
wrangler secret put NOTION_API_KEY --config wrangler.system-studio.toml       # HD (Half Dozen) key → halfdozen
wrangler secret put NOTION_CLIENT_API_KEY --config wrangler.system-studio.toml # System Studio key → client
pnpm run deploy:system-studio-notion-mcp   # from repo root
```

**URL:** `https://system-studio-notion.mcp.workway.co/mcp`

### New client instance: Half Dozen × <Client>

Create a new deployment for another client (same codebase, different Worker + secrets + domain). This repo includes per-client wrangler configs under `packages/halfdozen-notion-mcp/worker/` (e.g. `wrangler.blondish.toml`).

```bash
cd packages/halfdozen-notion-mcp/worker

# Set secrets for that client deployment (never commit these values)
wrangler secret put NOTION_API_KEY --config wrangler.<client>.toml
wrangler secret put NOTION_CLIENT_API_KEY --config wrangler.<client>.toml

# Deploy (from this directory)
pnpm exec wrangler deploy --config wrangler.<client>.toml
```

Or deploy from the repo root:

```bash
pnpm run deploy:<client>-notion-mcp
```

Verify the deployment labels:

```bash
curl -s https://<client>-notion.mcp.workway.co/ | jq
```

### BLOND:ISH delivery-ticket reverse poller

The CREATE SOMETHING BLOND:ISH deployment can run a daily Cloudflare cron that
reads `HD Status` from the Notion Worker-managed `BLOND:ISH Support Tickets [HD Delivery]`
mirror and updates only the matching BLOND:ISH source ticket status when the
mapped status differs.

Required config:

- `NOTION_CLIENT_API_KEY`: BLOND:ISH workspace integration token.
- `NOTION_CREATE_SOMETHING_API_KEY`: CREATE SOMETHING workspace integration token.
- `BLONDISH_DELIVERY_MIRROR_DATA_SOURCE_ID`: default mirror data source ID.
- `BLONDISH_DELIVERY_REVERSE_SYNC_ENABLED=true`: enables the scheduled write path.
- `BLONDISH_DELIVERY_REVERSE_SYNC_DRY_RUN=false`: allows writes after dry-run validation.

The CREATE SOMETHING Notion integration must be connected to the managed mirror
database before enabling the cron. Until then, keep
`BLONDISH_DELIVERY_REVERSE_SYNC_ENABLED=false` and use the manual endpoint with
`{"dry_run": true}` for validation:

```bash
curl -sS -X POST https://blondish-notion.mcp.createsomething.agency/blondish-ticket-sync/run-delivery-status \
  -H "Authorization: Bearer $MCP_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run":true}' | jq
```

## Client config

**Cursor / Claude Desktop** — add MCP server (HTTP):

```json
{
  "mcpServers": {
    "notion-halfdozen-create-something": {
      "url": "https://createsomething-notion.mcp.workway.co/mcp"
    }
  }
}
```

**OpenAI Codex** — add to `~/.codex/config.toml` (or project `.codex/config.toml`):

```toml
[mcp_servers."notion-halfdozen-create-something"]
url = "https://createsomething-notion.mcp.workway.co/mcp"
```

Use the Streamable HTTP URL (`/mcp`). In Codex you can then use all Notion tools; pass `workspace: "halfdozen"` or `workspace: "client"` on each call.

## Notion API 2025-09-03

This MCP uses **Notion API version 2025-09-03** and **@notionhq/client v5**. The API uses **data sources** (tables) rather than the legacy "database" endpoint. Use **data source IDs** from Notion: open the database as a full page → **Database settings** → **Manage Data Sources** → (⋯) → **Copy data source ID**.

## Tools

This MCP exposes a full Notion toolset (search, list/get/query data sources, read/create/update pages, list/append/archive blocks, bulk update/archive, create/update databases). All accept `workspace: "halfdozen" | "client"`. The root endpoint `GET /` and the `notion://tools` resource return the full list so clients can verify they see all tools.

- `notion_search` — Search workspace (pages or data sources). `filter_type`: `page` or `data_source`.
- `notion_list_databases` — List data sources the integration can access. Supports pagination with `page_size` and `start_cursor`; returns `data_sources`, `has_more`, and `next_cursor`.
- `notion_get_database` — Get data source schema (property names and types). Use `data_source_id`. Call first before query/update/create.
- `notion_query_database` — Query a data source with filter/sort. Use `data_source_id`.
- `notion_get_page` — Get a page by ID.
- `notion_list_block_children` — List child blocks for a page/block (read page body content). Supports pagination with `page_size` and `start_cursor`.
- `notion_create_page` — Create a page in a data source. Use `data_source_id` in parent.
- `notion_update_page` — Update page properties.
- `notion_append_blocks` — Append blocks to a page.
- `notion_archive_page` — Archive (trash) a page.
- `notion_archive_block` — Archive a block (move to trash). Use to revert appended content; `block_id` from append results or block children.
- `notion_bulk_update` — Update multiple pages with the same properties.
- `notion_bulk_archive` — Archive multiple pages.
- `notion_create_database` — Create a database under a page with initial property schema.
- `notion_update_database` — Update database title/description and/or data source property schema.

## Resources

- `notion://workspaces` — Lists the two workspaces with labels (Half Dozen vs Client) for context.
- `notion://tools` — Lists all Notion tools this MCP exposes. If your client only shows one tool, read this resource or `GET /` to see the full list; reconnect MCP or use a client that lists all tools (e.g. Cursor).

## Prompt

- `task_workflow` — Guidance on when to use which workspace, schema-first usage, and the pattern: read from Half Dozen → create/update in client workspace.
