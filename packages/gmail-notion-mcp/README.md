# @create-something/gmail-notion-mcp

Gmail to Notion MCP (Composio-backed). Exposes Gmail and Notion tools via Composio with optional auth navigation tools, resources, and prompts for flexible email-to-Notion workflows.

## Features

- **Composio GMAIL + NOTION toolkits** — Search, read, send emails; create/query Notion pages and databases.
- **Auth navigation** — `gmail_connection_status`, `gmail_get_connect_link`, `notion_connection_status`, `notion_get_connect_link` so the agent can guide users to connect accounts.
- **Resources** — `sync://config` (connection and config status), `usage://self` (run usage and pricing for the current account).
- **Prompts** — `capabilities`, `sync_workflow` for guided use.
- **Metering** — One run = one MCP tool call; 100 free runs per account per period, then 1¢/run (D1-backed).

## Setup

### 1. Composio

- Create an account at [Composio](https://app.composio.dev).
- Create auth configs for Gmail and Notion (dashboard or API); note the auth config IDs (e.g. `ac_xxx`).

### 2. Worker secrets

From `packages/gmail-notion-mcp/worker`:

```bash
wrangler secret put COMPOSIO_API_KEY
# Optional, for connect links:
wrangler secret put COMPOSIO_GMAIL_AUTH_CONFIG_ID
wrangler secret put COMPOSIO_NOTION_AUTH_CONFIG_ID
```

### 3. Run locally

```bash
cd packages/gmail-notion-mcp && pnpm dev
# Or from worker:
cd packages/gmail-notion-mcp/worker && pnpm dev
```

MCP endpoint: `http://localhost:8787/mcp` (Streamable HTTP).

### 4. Connect in a client

- **Claude Code / Codex**: Add MCP server with URL `https://your-worker.workers.dev/mcp` (Streamable HTTP).
- User must connect Gmail and Notion via the links returned by `gmail_get_connect_link` and `notion_get_connect_link` (or use Composio dashboard).

## Production & pricing

- **Run** = one MCP tool call (each Composio or auth tool invocation counts as one run).
- **Free tier**: 100 runs per account per calendar month.
- **Overage**: 1¢ per run after the free tier (WORKWAY-style pricing model).
- **Identity** (multi-user): Send one of the following so runs are attributed to the right account:
  - Header: `X-MCP-Account-Id: <accountId>`
  - Header: `Authorization: Bearer <accountId>` (treat the token as the account id for simplicity)
- **Usage**: Read resource `usage://self` for the current account’s runs this period, free vs billable, and limit.
- **Enforcement**: Today the worker only *meters* (counts runs). It does not block tool calls when over the free tier. To enforce a hard cap, put the worker behind a gateway that checks `usage://self` (or an admin API) and rejects requests when over limit, or extend the worker to check usage before executing tools.

### D1 metering (production) — migration checklist

To enable run counting and the usage resource:

1. **Create the D1 database** (from `worker/`):

   ```bash
   cd packages/gmail-notion-mcp/worker
   wrangler d1 create gmail-notion-mcp-runs
   ```

2. **Complete the migration**: Replace the placeholder `database_id` in `worker/wrangler.toml` with the UUID returned in step 1 (under `[[d1_databases]]` → `RUNS_DB`). Without this, the binding will point at a non-existent DB.

3. **Apply migrations** (creates `run_counts` table):

   ```bash
   cd packages/gmail-notion-mcp/worker
   wrangler d1 migrations apply gmail-notion-mcp-runs --remote
   # Or: pnpm db:migrate
   ```

   For **local dev** (wrangler dev), run `pnpm db:migrate:local` from `worker/` to apply migrations to the local D1 database.

4. Deploy; the worker will bind `RUNS_DB` and meter each tool call.

## Architecture

- **Automation**: Composio tools (gmail_*, notion_*) + auth tools; value-add via prompts and resources.
- **Database**: Resources (sync config, usage); D1 optional for run metering (100 free, then 1¢/run).
- **Judgment**: Prompts (capabilities, sync_workflow).

See `docs/COMPOSIO_PATTERNS.md` for when to use Composio vs custom. This package is separate from `halfdozen-gmail-sync`, which remains the custom Gmail→Notion MCP for the Half Dozen team.

## Development

From the monorepo root run `pnpm install`, then from this package:

- `pnpm typecheck` (or `pnpm check`) — TypeScript check for the worker.
- `pnpm dev` — Start the worker locally (MCP at `http://localhost:8787/mcp`).
- From `worker/`: `pnpm db:migrate:local` to apply D1 migrations for local metering.

## Security and scalability

Identity is client-supplied (see [Security and scalability](docs/SECURITY_AND_SCALE.md)): normalize account IDs, use behind a gateway for production auth, metering is best-effort. D1 and DO scaling notes are there too.
