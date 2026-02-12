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

Tools are split by **auth surface**: Clips (scrape/session) vs Zoom API (Composio). Each surface is authenticated separately.

| Tool | Auth surface | Description |
|------|--------------|-------------|
| `sync_clips` | **Clips** | Full sync: scrape Zoom Clips library, dedup, sync new clips to Notion |
| `extract_clip` | **Clips** | Extract a single clip by URL (metadata + transcript) → Notion |
| `search_clips` | **Clips** | Search synced clips by title, speaker, or date range |
| `get_session_status` | **Clips** | Check if Zoom cookies are still valid |
| `upload_session_context` | **Clips** | Upload new session cookies after manual refresh |
| `zoom_api_*` (optional) | **Zoom API** | Composio Zoom toolkit (meetings, recordings, webinars); see [Authentication](#authentication) |

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

## Three-Tier Framework Review

This MCP is aligned to the [Three-Tier Framework](../../docs/THREE_TIER_FRAMEWORK.md) (Database, Automation, Judgment) and uses all three MCP primitives with the correct control models.

| Tier | MCP primitive | Control | This MCP |
|------|----------------|---------|----------|
| **Database** | Resources | Application-controlled | `clips://library`, `clips://status`, `clips://session`, `clips://clip/{id}` — client decides when to fetch |
| **Automation** | Tools | Model-controlled | sync_clips, extract_clip, search_clips, session tools, zoom_api_* — LLM decides when to call |
| **Judgment** | Prompts | User-controlled | transcript_analysis, clip_summarization, sync_strategy — user selects templates |

**Cross-cutting:**

- **Touchpoints**: MCP server surface — `/mcp` (Streamable HTTP), `/sse`, `/` (health). Ready for Codex, Claude Code, Cursor.
- **Artifacts**: Clip records, sync run status, session context — typed boundaries between tiers.
- **Orchestration**: Sync is on-demand (tool invocation); no in-worker cron. Optional external scheduler can call the worker.
- **Insight**: `submit_feedback` tool (when FEEDBACK_DB is set), `clips://status` and `clips://session` for operational visibility.

## Authentication

This MCP has **two independent auth surfaces**. They are not shared: authenticating for one does not authenticate the other.

| Surface | Method | Used by | Setup |
|--------|--------|---------|--------|
| **Zoom Clips** (scrape) | Session context (cookies in KV) | `sync_clips`, `extract_clip`, `search_clips`, `get_session_status`, `upload_session_context` | Run `watch-session.ts` → log into Zoom in Steel Live View → use `upload_session_context` to store cookies. No Composio. |
| **Zoom API** (Composio) | Composio connected account | `zoom_api_*` tools (when `COMPOSIO_API_KEY` is set) | Create a Composio auth config for Zoom, connect an account for entity `default`. See [Composio auth](https://docs.composio.dev/docs/tools-direct/authenticating-tools). |

**Why two surfaces?** Zoom Clips have no REST API; we use browser automation (Steel.dev) and cookie-based session context. Zoom’s REST API (meetings, recordings, webinars) is exposed via Composio and uses OAuth. The same Zoom account can be used for both, but the MCP does not link them — you must complete both setups if you use both Clips and API tools.

**Future pattern:** Other MCPs may mix “scrape” (session/cookies/Steel) and “API” (Composio or direct OAuth) the same way. The health endpoint exposes `auth_surfaces` so clients know which tools require which setup.

### How the agent navigates auth

The agent discovers auth needs by **surface** and uses dedicated tools to check status and fix gaps.

| Surface | Agent flow |
|--------|------------|
| **Zoom Clips** | 1. Call `get_session_status`. If it reports no session or expired, tell the user: run `npx tsx watch-session.ts` locally, log into Zoom in the Steel Live View, then paste the captured session JSON. 2. Call `upload_session_context` with that JSON. 3. Retry `get_session_status` or `sync_clips`. Tool responses include explicit instructions (e.g. "Use upload_session_context to upload fresh cookies"). |
| **Zoom API** | 1. Call `zoom_api_connection_status`. If not connected, call `zoom_api_get_connect_link` and present the returned URL to the user. 2. User opens the link and authorizes Zoom in Composio. 3. Retry `zoom_api_connection_status` or any `zoom_api_*` tool. If the server has no connect link configured, the agent can only report that the admin must set up Composio Zoom auth. |

So: **Clips** = status tool + upload tool (agent-guided). **Zoom API** = status tool + connect-link tool (agent presents link). Both are self-service from the agent's perspective as long as the server exposes the auth-navigation tools.

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
# Optional: for Zoom API tools (meetings, recordings, webinars)
wrangler secret put COMPOSIO_API_KEY
# Optional: for zoom_api_get_connect_link (agent can present connect URL to user)
wrangler secret put COMPOSIO_ZOOM_AUTH_CONFIG_ID
```

### 4. Capture Zoom session cookies (Clips surface)

Zoom Clips has no API — we use browser automation with cookies for auth.

```bash
npx tsx watch-session.ts
# Opens Steel Live View → log into Zoom → captures cookies
# Upload via the upload_session_context MCP tool
```

### 5. (Optional) Connect Zoom in Composio (Zoom API surface)

If you set `COMPOSIO_API_KEY`, create a Composio auth config for Zoom and connect an account for entity ID `default`. The `zoom_api_*` tools will then use that account. See [Authentication](#authentication).

### 6. Deploy

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

| Transport | URL | Clients |
|-----------|-----|---------|
| Streamable HTTP | `https://zoom.mcp.workway.co/mcp` | Claude Code, **Codex** |
| SSE | `https://zoom.mcp.workway.co/sse` | Cursor, ChatGPT, Claude Desktop |

### OpenAI Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers."zoom-sync"]
url = "https://zoom.mcp.workway.co/mcp"
```

Use the Streamable HTTP URL (`/mcp`). Complete Clips auth via the agent: `get_session_status` → `upload_session_context` if needed. For Zoom API tools, use `zoom_api_connection_status` and `zoom_api_get_connect_link` if the server has Composio configured.

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
