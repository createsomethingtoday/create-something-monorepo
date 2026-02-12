# @create-something/notion-sync-mcp

Two-way Notion database sync MCP server -- built on `@create-something/mcp-core` with all three MCP primitives aligned to the Three-Tier Framework.

## What It Does

Synchronizes a **master Issues database** with **client-specific databases** bidirectionally. Each client sees only their filtered issues; changes flow both ways with conflict resolution.

```
Master DB (all issues)          Client DBs (filtered)
┌─────────────────────┐         ┌──────────────────┐
│ Issue A (Acme)      │ ──push──> │ Issue A          │  Acme Corp
│ Issue B (Acme)      │ <──pull── │ Issue B          │
│ Issue C (Vibe)      │         └──────────────────┘
│ Issue D (Vibe)      │         ┌──────────────────┐
│                     │ ──push──> │ Issue C          │  Vibe Records
│                     │ <──pull── │ Issue D          │
└─────────────────────┘         └──────────────────┘
```

## Three-Tier Framework

5 tools + 4 resources + 3 prompts = 12 primitives, each mapping to a tier:

| Tier | MCP Primitive | Control Model | Implementation |
|------|---------------|---------------|----------------|
| **Database** | Resources | Application-controlled | `sync://clients`, `sync://status`, `sync://client/{name}`, `sync://history/{name}` |
| **Automation** | Tools | Model-controlled | 5 action tools (register, update, sync, remove, resolve) |
| **Judgment** | Prompts | User-controlled | `sync_strategy`, `conflict_resolution`, `client_onboarding` |

Cross-cutting concerns:
- **Insight**: `InsightEmitter` on every tool/resource/prompt invocation
- **Artifacts**: `ClientMapping`, `SyncResult`, `DryRunResult`, `PageIdMapping`
- **Touchpoints**: MCP server endpoints (stdio + HTTP)
- **Orchestration**: CRON-based background sync via Cloudflare Worker

### Agent UX Design Principles

- **No format decisions** -- All tools return structured JSON. The agent formats for human display.
- **No tool/resource ambiguity** -- Read-only queries are Resources (application-controlled). Tools are actions only (model-controlled).
- **Auto-initialization** -- D1 schema is created automatically on first use. No setup step needed.
- **Dry-run preflight** -- `notion_sync_issues` accepts `dry_run: true` to preview changes before executing.
- **Update without re-register** -- `notion_sync_update_client` modifies config in-place.

## Client Configuration

### Production URL

```
https://notion-sync-mcp-worker.createsomething.workers.dev/mcp
```

### OpenAI Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers."notion-sync"]
url = "https://notion-sync-mcp-worker.createsomething.workers.dev/mcp"
```

### Claude Code

```bash
claude mcp add notion-sync \
  --transport http \
  https://notion-sync-mcp-worker.createsomething.workers.dev/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notion-sync": {
      "url": "https://notion-sync-mcp-worker.createsomething.workers.dev/mcp"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "notion-sync": {
      "url": "https://notion-sync-mcp-worker.createsomething.workers.dev/mcp"
    }
  }
}
```

### Local Development (stdio)

```json
{
  "mcpServers": {
    "notion-sync": {
      "command": "node",
      "args": ["packages/notion-sync-mcp/dist/index.js"],
      "env": {
        "CF_ACCOUNT_ID": "your-account-id",
        "CF_API_TOKEN": "your-api-token",
        "CF_D1_DATABASE_ID": "your-database-id"
      }
    }
  }
}
```

## Quick Start

### 1. Prerequisites

- Cloudflare account with D1 database
- Notion integrations for master + client workspaces

### 2. Create D1 Database

```bash
wrangler d1 create notion-sync
# Note the database ID from the output
```

### 3. Configure Environment

```bash
export CF_ACCOUNT_ID="your-cloudflare-account-id"
export CF_API_TOKEN="your-cloudflare-api-token"
export CF_D1_DATABASE_ID="your-d1-database-id"
```

### 4. Install & Run

```bash
# From monorepo root
pnpm install
pnpm --filter=notion-sync-mcp build

# Run via stdio (for Claude Desktop / Claude Code)
pnpm --filter=notion-sync-mcp start
```

The D1 schema is created automatically on first tool call -- no initialization step needed.

## MCP Primitives

### Tools (Automation Tier)

Action-only tools. All return structured JSON.

| Tool | Description |
|------|-------------|
| `notion_sync_register_client` | Register a client for sync (validates database access) |
| `notion_sync_update_client` | Update sync_properties or conflict_strategy without re-registering |
| `notion_sync_issues` | Sync issues (push/pull/bidirectional). Supports `dry_run: true` for preview. |
| `notion_sync_remove_client` | Remove client and all sync data (does NOT delete Notion pages) |
| `notion_sync_resolve_conflicts` | Resolve all pending conflicts with master_wins or client_wins |

### Resources (Database Tier)

Read-only state queries. Application-controlled -- injected into context without the model calling tools.

| URI | Description |
|-----|-------------|
| `sync://clients` | All registered clients with configurations (tokens masked) |
| `sync://status` | Global sync stats (total clients, page mappings, pending, conflicts) |
| `sync://client/{client_name}` | Per-client detail: config + status counts + last sync info |
| `sync://history/{client_name}` | Recent sync history (last 10 operations) |

### Prompts (Judgment Tier)

User-controlled guidance that shapes how the agent reasons.

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `sync_strategy` | Choose sync direction based on current state context | `client_name` (optional) |
| `conflict_resolution` | Surface conflicts and guide resolution strategy | `client_name` (optional) |
| `client_onboarding` | Step-by-step guide for registering a new client | None |

## Architecture

```
src/
  index.ts              Stdio entry point (mcp-core serveStdio)
  server.ts             ScopedMcpServer setup + all registrations
  auth.ts               NotionSyncAuth provider (env -> AccountContext)
  constants.ts          Enums and config constants
  types.ts              TypeScript type definitions
  schemas/
    tools.ts            Zod schemas for tool inputs
  tools/
    handlers.ts         Tool handler implementations (5 action tools)
  resources/
    handlers.ts         Resource handlers (4 read-only queries)
  prompts/
    handlers.ts         Prompt handlers (3 judgment guides)
  services/
    notion.ts           Notion API client (rate-limited, retry, multi-token)
    d1.ts               Cloudflare D1 operations (auto-init, dual executor)
    sync-engine.ts      Bidirectional sync + dry-run preview
    crypto.ts           AES-GCM token encryption at rest
worker/
  index.ts              Cloudflare Worker (MCP HTTP + CRON sync)
  wrangler.toml         Worker config with D1 binding
```

### Key Design Decisions

**D1 Executor abstraction**: All D1 operations go through a `D1Executor` interface with two implementations: `createRestExecutor` (for stdio via REST API) and `createBindingExecutor` (for Worker via D1 binding). This enables the shared sync engine to work in both contexts.

**Token encryption**: Notion integration tokens are encrypted at rest in D1 using AES-GCM. The encryption key is a Worker secret (`TOKEN_ENCRYPTION_KEY`). Decryption handles plaintext migration gracefully.

**Retry with backoff**: All Notion API calls use exponential backoff (3 retries) for 429/5xx/network errors. Rate limiting (~3 req/s) prevents hitting Notion's limits proactively.

**Auto-initialization**: The `ensureInitialized()` function probes for tables on first use and creates them if missing. Uses a `WeakSet` keyed by executor instance to avoid redundant checks per isolate.

**Dry-run sync**: The `dryRunSync()` function queries both Notion databases and computes what would change without writing anything.

## Cloudflare Worker Deployment

```bash
cd packages/notion-sync-mcp/worker

# Set secrets
wrangler secret put MCP_API_KEY           # API key for client authentication
wrangler secret put TOKEN_ENCRYPTION_KEY  # AES-GCM key for token encryption

# Deploy
wrangler deploy
```

The Worker provides:
- `GET /health` -- Health check + endpoint discovery
- `POST /sync` -- Manual sync trigger (requires auth)
- `POST /mcp` -- MCP Streamable HTTP transport (requires auth)
- CRON every 15 minutes -- Automatic background sync

## Conflict Resolution

When both master and client pages change between syncs:

| Strategy | Behavior |
|----------|----------|
| `master_wins` | Master value overwrites client (default) |
| `client_wins` | Client value overwrites master |
| `latest_wins` | Most recent edit wins (defaults to master when ambiguous) |
| `manual` | Marks as conflict for manual resolution |

## Supported Property Types

title, rich_text, number, select, multi_select, date, checkbox, url, email, phone_number, status

Not supported: relations, rollups, formulas, created_by, last_edited_by, files

## Security

- **API key auth**: All `/mcp` and `/sync` endpoints require a valid API key (Bearer token or X-API-Key header). Set via `MCP_API_KEY` Worker secret.
- **Token encryption**: Notion tokens encrypted at rest with AES-GCM. Set key via `TOKEN_ENCRYPTION_KEY` Worker secret.
- **CORS**: Full CORS support for browser-based and remote MCP clients.
- **No token exposure**: Resources mask Notion tokens in all output.

## Limitations

- Notion rate limits: ~3 req/s (handled with built-in rate limiting + retry)
- Cross-workspace: Each workspace needs its own integration token
- No real-time sync: Triggered via MCP tools or CRON schedule (every 15 min)
