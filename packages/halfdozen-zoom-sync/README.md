# @create-something/halfdozen-zoom-sync

Zoom Clips to Notion MCP Server for Half Dozen. Uses all three MCP primitives aligned to the Three-Tier Framework.

**Critical constraint**: Zoom has no REST API for Clips. This server uses Steel.dev browser automation via CDP-over-WebSocket to extract clip metadata and transcripts.

## Three-Tier Framework

### Database Tier (Resources)

| URI | Description |
|-----|-------------|
| `clips://library` | List of synced clips (from D1 cache) |
| `clips://status` | Latest sync run status, clip counts, recent history |
| `clips://session` | Session health: cookie age, validity, expiry estimate |
| `clips://clip/{id}` | Individual clip metadata + transcript from Notion |

### Automation Tier (Tools)

| Tool | Description |
|------|-------------|
| `sync_clips` | Full sync: scrape Zoom Clips library, dedup, sync new clips to Notion |
| `extract_clip` | Extract a single clip by URL (metadata + transcript) → Notion |
| `search_clips` | Search synced clips by title, speaker, or date range |
| `get_session_status` | Check if Zoom cookies are still valid |
| `upload_session_context` | Upload new session cookies after manual refresh |

### Judgment Tier (Prompts)

| Prompt | Description |
|--------|-------------|
| `transcript_analysis` | Analyze a clip transcript for topics, action items, decisions |
| `clip_summarization` | Summarize a set of clips from a date range |
| `sync_strategy` | Recommend sync frequency and configuration |

## Architecture

```
Cloudflare Worker (Durable Object — McpAgent)
├── MCP Protocol Layer (Streamable HTTP /mcp, SSE /sse)
│   ├── Resources → D1 + Notion API
│   ├── Tools → Steel.dev + Notion API
│   └── Prompts → Judgment templates
│
├── Steel.dev Integration
│   ├── Session create/release (REST API)
│   ├── CDP-over-WebSocket (browser automation)
│   └── Cookie management (KV-backed)
│
├── Notion API (direct fetch, no SDK)
│   ├── Database queries (dedup)
│   ├── Page creation (clip metadata)
│   └── Block append (transcripts as toggle)
│
├── D1 Database
│   ├── sync_runs (history, status)
│   ├── clips_cache (metadata cache)
│   └── session_state (cookie health)
│
└── KV Store
    └── Session context (Zoom cookies)
```

## Setup

### Prerequisites

- Cloudflare account with Workers, D1, and KV enabled
- Steel.dev API key ([steel.dev](https://steel.dev))
- Notion integration ([notion.so/my-integrations](https://www.notion.so/my-integrations))
- Notion database with the schema below

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create Cloudflare resources

```bash
# D1 database
wrangler d1 create halfdozen-zoom-sync-db
# Copy the database_id to worker/wrangler.toml

# KV namespace
wrangler kv namespace create ZOOM_SESSION_CONTEXT
# Copy the id to worker/wrangler.toml
```

### 3. Set secrets

```bash
cd worker
wrangler secret put STEEL_API_KEY
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_DATABASE_ID
```

### 4. Capture Zoom session cookies

Zoom Clips has no API — we use browser automation with cookies for auth.

```bash
npx tsx watch-session.ts
# Opens Steel Live View → log into Zoom → captures cookies
# Upload via the upload_session_context MCP tool
```

### 5. Deploy

```bash
cd worker
wrangler deploy
```

## Usage

### Claude Desktop / Claude Code (stdio)

```json
{
  "mcpServers": {
    "zoom-clips": {
      "command": "node",
      "args": ["packages/halfdozen-zoom-sync/dist/index.js"],
      "env": {
        "STEEL_API_KEY": "steel_...",
        "NOTION_API_KEY": "secret_...",
        "NOTION_DATABASE_ID": "27a019..."
      }
    }
  }
}
```

### Remote (Cloudflare Worker)

```
# Streamable HTTP (Claude Code, Codex)
https://zoom.mcp.workway.co/mcp

# SSE (Cursor, ChatGPT)
https://zoom.mcp.workway.co/sse
```

### Example Interactions

```
"Sync my latest Zoom clips"
→ sync_clips tool runs: creates Steel session, scrapes Zoom, syncs to Notion

"Search for clips about the product roadmap"
→ search_clips tool queries Notion by title

"Analyze the transcript from this clip"
→ transcript_analysis prompt provides structured analysis

"Is my Zoom session still valid?"
→ get_session_status checks cookie health
```

## Notion Database Schema

| Property | Type | Value |
|----------|------|-------|
| Item | title | Clip title |
| Source URL | url | Zoom clip share URL (used for dedup) |
| Attendees | rich_text | Speaker name |
| Date | date | Clip creation date |
| Status | select | "Active" |
| Source | select | "Zoom" |
| Type | select | "Clip" |
| (Page body) | toggle | Transcript (chunked at sentence boundaries) |

## Session Management

| Component | Lifespan | Notes |
|-----------|----------|-------|
| Steel Session | 15 minutes | Created per sync run, released after |
| Zoom Cookies | 1-2 weeks | Stored in KV, refreshed via watch-session.ts |

When cookies expire, `sync_clips` detects the Zoom login redirect and returns a `session_expired` status. Use `get_session_status` to check proactively, and `upload_session_context` to upload fresh cookies.

## Files

| Path | Purpose |
|------|---------|
| `src/index.ts` | Stdio entry point |
| `src/tools/sync.ts` | sync_clips, extract_clip (browser automation) |
| `src/tools/search.ts` | search_clips (Notion queries) |
| `src/tools/session.ts` | get_session_status, upload_session_context |
| `src/resources/clips.ts` | clips://library, clips://clip/{id} |
| `src/resources/status.ts` | clips://status, clips://session |
| `src/prompts/analysis.ts` | transcript_analysis, clip_summarization, sync_strategy |
| `src/lib/cdp-client.ts` | CDP-over-WebSocket client for Workers |
| `src/lib/steel.ts` | Steel.dev REST API helpers |
| `src/lib/notion.ts` | Notion API helpers |
| `src/lib/text.ts` | Text chunking, date parsing |
| `src/lib/db.ts` | D1 schema and query helpers |
| `worker/index.ts` | Cloudflare Worker entry point (McpAgent) |
| `worker/wrangler.toml` | Worker configuration |
| `watch-session.ts` | Cookie capture tool (Steel Live View) |

## Migration from v1 (Modal.com)

v1 was a Python script (`modal_sync.py`) running on Modal.com with Playwright.
v2 is a full MCP server deployed as a Cloudflare Worker with CDP-over-WebSocket.

| Aspect | v1 (Modal) | v2 (MCP Worker) |
|--------|-----------|-----------------|
| Runtime | Modal.com (Python) | Cloudflare Worker (TypeScript) |
| Browser | Playwright + Steel | CDP-over-WebSocket + Steel |
| Interface | Cron job + email alerts | MCP tools, resources, prompts |
| State | Modal Volume | D1 + KV |
| Trigger | Daily cron (9am EST) | On-demand via MCP tools |
| Monitoring | Resend email alerts | Resources (clips://status, clips://session) |

## License

MIT - CREATE SOMETHING
