# Meetings MCP Worker

Read-only MCP server for meeting transcript recall from the shared `meetings` D1 database.

## Capabilities

- Resources
- `meetings://stats`
- `meetings://recent`
- Tools
- `list_meetings(limit, offset, status?, property?, from?, to?)`
- `get_meeting(meeting_id, include_transcript?, max_transcript_chars?)`
- `search_transcripts(query, limit?, property?, status?, from?, to?, snippet_chars?)`

All tools are read-only.

## Auth

`MCP_API_KEY` is required for `/mcp` and `/sse`. If missing, MCP requests return `500` (misconfigured).

Set the required API key:

```bash
wrangler secret put MCP_API_KEY
```

Accepted auth forms on `/mcp` and `/sse`:

- `Authorization: Bearer <token>`
- `X-API-Key: <token>`
- `?token=<token>`

## Search Behavior

- Primary: D1 FTS via `meetings_fts MATCH ?`.
- Fallback: parameterized `LIKE` search over `transcript` + `summary` if `meetings_fts` is not present in the target DB.

## Local Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm test
```

## Deploy

```bash
pnpm deploy
```

Deployed endpoints:

- Production: `https://meetings-mcp.createsomething.workers.dev/mcp`
- `https://meetings-mcp-staging.createsomething.workers.dev/mcp`

## Claude Desktop Configuration

Use your deployed URL and either query-token or header auth.

### Option A: query token

Production:

```json
{
  "mcpServers": {
    "meetings": {
      "url": "https://meetings-mcp.createsomething.workers.dev/mcp?token=YOUR_MCP_API_KEY"
    }
  }
}
```

Staging:

```json
{
  "mcpServers": {
    "meetings-staging": {
      "url": "https://meetings-mcp-staging.createsomething.workers.dev/mcp?token=YOUR_MCP_API_KEY"
    }
  }
}
```

### Option B: header auth

Production:

```json
{
  "mcpServers": {
    "meetings": {
      "url": "https://meetings-mcp.createsomething.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

Staging:

```json
{
  "mcpServers": {
    "meetings-staging": {
      "url": "https://meetings-mcp-staging.createsomething.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

## Codex `.mcp.json` Example

Production:

```json
{
  "mcpServers": {
    "meetings": {
      "type": "http",
      "url": "https://meetings-mcp.createsomething.workers.dev/mcp?token=YOUR_MCP_API_KEY"
    }
  }
}
```

Staging:

```json
{
  "mcpServers": {
    "meetings-staging": {
      "type": "http",
      "url": "https://meetings-mcp-staging.createsomething.workers.dev/mcp?token=YOUR_MCP_API_KEY"
    }
  }
}
```
