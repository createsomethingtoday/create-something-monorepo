# Schedule MCP

Shared scheduling MCP server with backfill, forecast, and conflict detection. Deployable as a Cloudflare Worker with SSE/Streamable HTTP for universal AI client access.

## Architecture

**Three-Tier Framework alignment:**

| Tier | MCP Primitive | Implementation |
|------|---------------|----------------|
| **Database** | Resources | Calendars, members, units, templates |
| **Automation** | Tools | CRUD, backfill, forecast, conflicts, iCal |
| **Judgment** | Prompts | Schedule analysis, conflict resolution, optimization |

## Endpoints

| Path | Transport | Clients |
|------|-----------|---------|
| `/mcp` | Streamable HTTP | Claude Code, Codex |
| `/sse` | SSE | Cursor, ChatGPT, Claude Desktop |
| `/` | JSON | Health check |

## Tools (14)

**CRUD:** `create_calendar`, `create_event`, `update_event`, `delete_event`, `create_unit`, `add_member`, `share_calendar`

**Scheduling:** `backfill`, `forecast`, `find_conflicts`, `find_availability`, `apply_template`

**Interop:** `export_ical`, `create_template`

## Resources (4)

`schedule://calendars`, `schedule://members`, `schedule://units`, `schedule://templates`

## Prompts (3)

`schedule_analysis`, `conflict_resolution`, `schedule_optimization`

## Development

```bash
# stdio mode (in-memory database)
pnpm --filter=@create-something/schedule-mcp build
node packages/schedule-mcp/dist/index.js

# Worker mode (D1 database)
cd packages/schedule-mcp/worker
pnpm install
pnpm dev
```

## Deployment

```bash
# Create D1 database
wrangler d1 create schedule-mcp-db

# Update database_id in worker/wrangler.toml

# Apply migrations
wrangler d1 migrations apply schedule-mcp-db --remote

# Deploy
cd packages/schedule-mcp/worker
pnpm deploy
```

## Client Configuration

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "schedule": {
      "url": "https://schedule.mcp.createsomething.agency/mcp"
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "schedule": {
      "url": "https://schedule.mcp.createsomething.agency/sse"
    }
  }
}
```

### Codex

```json
{
  "mcpServers": {
    "schedule": {
      "url": "https://schedule.mcp.createsomething.agency/mcp"
    }
  }
}
```
