# @create-something/half-dozen-youtube-sync

YouTube playlist transcript extraction and Notion sync for the Half Dozen client.

## Framework Tier

This MCP server operates at all three tiers of the [Three-Tier Framework](../../docs/THREE_TIER_FRAMEWORK.md):

| Tier | Role in This Server |
|------|---------------------|
| **Database** | YouTube playlists and videos as source data; Notion database as target persistence (pages with Status, Type, Source properties). MCP Resources expose video transcripts and server status. |
| **Automation** | MCP tools for playlist extraction (`scrape_playlist`), transcript retrieval (`extract_transcript`), browser session management (`create_session`, `close_session`), and end-to-end sync workflows (`sync_playlist`, `sync_to_notion`) |
| **Judgment** | MCP Prompts for guided workflows (`sync_playlist`, `transcript_analysis`). Langfuse observability for tracing, cost tracking, and audit trails. |

**Primary tier**: Automation — the server's core value is orchestrating the multi-step extraction-and-sync pipeline (YouTube -> transcripts -> Notion) via model-controlled MCP tools.

## Features

- **Playlist Extraction**: Scrape video list from YouTube playlists using Steel.dev
- **Transcript Extraction**: Server-side get_transcript with caption-track fallback
- **Optimized Notion Sync**: Batch deduplication (1 API call for N videos)
- **MCP Server**: Full MCP integration with Tools, Resources, and Prompts
- **Cloudflare Worker**: Remote HTTP/SSE transport for deployment
- **ChatGPT Connector**: `search`/`fetch` tools for cross-platform compatibility
- **Langfuse Observability**: Complete tracing and cost tracking
- **Retry Logic**: Exponential backoff with jitter for resilient API calls
- **67 Unit Tests**: URL parsing, transcript parsing/chunking, retry logic

## Quick Start

### 1. Install and Configure

```bash
# Install dependencies
pnpm install

# Copy environment template and add your API keys
cp .env.example .env
```

Edit `.env` with your keys:

```bash
NOTION_API_KEY=ntn_xxx         # Required — https://notion.so/my-integrations
NOTION_DATABASE_ID=xxx         # Required — copy from Notion database URL
STEEL_API_KEY=ste-xxx          # Optional — enables browser automation (https://steel.dev)
RESEND_API_KEY=re_xxx          # Optional — enables email notifications
```

### 2. Verify Setup

```bash
pnpm test:connection
```

This checks every service in one pass:

```
  Half Dozen YouTube Sync — Connection Test

  ● Notion API Key       Authenticated as "WORKWAY" (bot)
  ● Notion Database      "Internal LLM [HD]" — all required properties found
  ● Steel API Key        Authenticated successfully
  ● YouTube API          YouTube reachable, captions API available
  ● Resend (Email)       Authenticated — email notifications enabled

  5 passed  0 failed  0 skipped
```

### 3. Connect Your MCP Client

Choose **one** of the three options below based on how you want to use it.

#### Option A: Stdio Server (local, full features)

Best for: Claude Desktop, Cursor — runs locally with all 11 tools including browser automation.

**Claude Desktop** (`~/.config/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "half-dozen-youtube-sync": {
      "command": "npx",
      "args": ["tsx", "/path/to/create-something-monorepo/packages/half-dozen-youtube-sync/src/index.ts"],
      "env": {
        "STEEL_API_KEY": "ste-xxx",
        "NOTION_API_KEY": "ntn_xxx",
        "NOTION_DATABASE_ID": "your-db-id",
        "RESEND_API_KEY": "re_xxx"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "half-dozen-youtube-sync": {
      "command": "npx",
      "args": ["tsx", "packages/half-dozen-youtube-sync/src/index.ts"],
      "env": {
        "STEEL_API_KEY": "ste-xxx",
        "NOTION_API_KEY": "ntn_xxx",
        "NOTION_DATABASE_ID": "your-db-id",
        "RESEND_API_KEY": "re_xxx"
      }
    }
  }
}
```

#### Option B: Worker Server (remote, API-only)

Best for: Remote access, ChatGPT, shared team use — no browser automation, but transcripts and Notion sync work via API.

The Worker is already deployed at:

```
https://youtube.mcp.workway.co
```

**Claude Desktop** (remote MCP):

```json
{
  "mcpServers": {
    "half-dozen-youtube-sync": {
      "url": "https://youtube.mcp.workway.co/mcp"
    }
  }
}
```

**Cursor** (remote MCP):

```json
{
  "mcpServers": {
    "half-dozen-youtube-sync": {
      "type": "sse",
      "url": "https://youtube.mcp.workway.co/sse"
    }
  }
}
```

**Self-deploy** (your own Worker):

```bash
cd worker
npm install
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_DATABASE_ID
wrangler deploy
```

#### Option C: CLI (batch operations)

Best for: One-off syncs, scripting, cron jobs — no MCP client needed.

```bash
# Sync a playlist to Notion
npx tsx batch-sync.ts --playlist "https://youtube.com/playlist?list=PL02AA8F4D1484BBC8" --sync

# Extract first 5 videos only
npx tsx batch-sync.ts --playlist "https://youtube.com/playlist?list=..." --limit 5

# Single video transcript
npx tsx batch-sync.ts --video "https://youtube.com/watch?v=..." --sync

# Verify Notion database
npx tsx batch-sync.ts --check-db
```

### 4. First Sync

Once your MCP client is connected, just ask:

> "Sync this YouTube playlist to Notion: https://youtube.com/playlist?list=..."

The agent will use the `sync_playlist` tool automatically. You'll get:
- A JSON summary in the conversation with extraction and sync stats
- An email notification at your configured address (if Resend is set up)
- New pages in your Notion database with video titles, URLs, and transcripts

### 5. Running Tests

```bash
pnpm test              # Unit tests (67 tests)
pnpm test:watch        # Watch mode
pnpm test:connection   # Service connectivity check
```

## Architecture

```
                     ┌────────────────────────────────────────────────┐
                     │           MCP Clients                          │
                     │   (Claude, Cursor, ChatGPT, custom)            │
                     └──────────────────┬─────────────────────────────┘
                                        │
                    ┌───────────────────┼────────────────────┐
                    │                   │                    │
              ┌─────▼─────┐      ┌─────▼─────┐       ┌─────▼─────┐
              │   Stdio    │      │  Worker   │       │   CLI     │
              │  (local)   │      │  (remote) │       │  (batch)  │
              │ 11 tools   │      │  5 tools  │       │           │
              │ Resources  │      │ Resources │       │           │
              │ Prompts    │      │ Prompts   │       │           │
              └─────┬──────┘      └─────┬─────┘       └─────┬─────┘
                    │                   │                    │
         ┌──────────┼───────────────────┼────────────────────┘
         │          │                   │
    ┌────▼────┐  ┌──▼───────┐   ┌──────▼──────┐
    │ Steel   │  │ YouTube  │   │   Notion    │
    │ Browser │  │ API      │   │   API       │
    │ (local  │  │ (both)   │   │   (both)    │
    │  only)  │  │          │   │             │
    └─────────┘  └──────────┘   └─────────────┘
```

**Stdio server** (local): Full functionality including browser automation via Steel.dev. 11 tools, Resources, Prompts.

**Worker** (remote): API-only tools (no browser). Transcript extraction via YouTube API, Notion sync, ChatGPT connector. 5 tools, Resources, Prompts.

## MCP Primitives

### Tools (Worker: 7 | Stdio: 11)

**Worker (recommended for Codex/Claude Desktop):**

| Tool | Description |
|------|-------------|
| `sync_playlist` | **Main workflow** — extract playlist, get transcripts, sync to Notion with dedup |
| `extract_transcript` | Get transcript for a single video (API-only, fast) |
| `list_playlist` | List videos in a playlist without syncing |
| `sync_to_notion` | Sync video data array to Notion with dedup |
| `get_database_schema` | Inspect Notion database properties |
| `search` | ChatGPT connector: search synced videos |
| `fetch` | ChatGPT connector: get full video details |

**Stdio (local, includes browser automation via Steel):**

All Worker tools plus: `scrape_playlist`, `scrape_video`, `create_session`, `session_status`, `navigate`, `close_session`, `get_provider_status`

### Resources

| URI | Description |
|-----|-------------|
| `youtube://status` | Server status, active sessions, metrics |
| `youtube://video/{id}/transcript` | Transcript for a specific video (template) |

### Prompts

| Name | Description |
|------|-------------|
| `sync_playlist` | Guided workflow for syncing a YouTube playlist to Notion |
| `transcript_analysis` | Analyze a video transcript for themes, quotes, and action items |

## Configuration

### Environment Variables

```bash
# Required
STEEL_API_KEY=ste-xxx          # Get at https://steel.dev (stdio only)
NOTION_API_KEY=ntn_xxx         # Get at https://notion.so/my-integrations
NOTION_DATABASE_ID=xxx         # Half Dozen Internal LLM database

# Optional (observability)
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com

# Optional (tuning)
YOUTUBE_SYNC_SESSION_TIMEOUT=3600000        # Steel session timeout (ms, default: 1h)
YOUTUBE_SYNC_MAX_RETRIES=3                  # API retry attempts
YOUTUBE_SYNC_RETRY_BASE_DELAY=1000          # Base retry delay (ms)
YOUTUBE_SYNC_RETRY_MAX_DELAY=30000          # Max retry delay (ms)
YOUTUBE_SYNC_NOTION_RATE_LIMIT_DELAY=350    # Delay between Notion calls (ms)
YOUTUBE_SYNC_NOTION_CHUNK_SIZE=1900         # Transcript chunk size (chars)
YOUTUBE_SYNC_TRANSCRIPT_TIMEOUT=30000       # Transcript extraction timeout (ms)
YOUTUBE_SYNC_VIDEO_EXTRACTION_DELAY=500     # Delay between video extractions (ms)
```

### Notion Database Schema

The sync targets the Half Dozen "Internal LLM [HD]" database:

| Notion Property | Type | Value |
|-----------------|------|-------|
| Item | title | Video title |
| Source URL | url | YouTube URL (used for dedup) |
| Date | date | Video publish date |
| Status | select | "Active" |
| Source | select | "Internal" |
| Type | select | "Video" |
| (Page body) | toggle | Transcript (chunked into paragraphs) |

## Transcript Extraction Methods

### 1. YouTube Transcript APIs (Primary)

Uses YouTube's internal transcript endpoint first, then falls back to player caption tracks:
- **Fast**: No browser startup needed
- **Reliable**: Uses caption tracks when the transcript endpoint rejects a request
- **Preferred**: Default method for all extractions

Limitations:
- Only works for videos with captions enabled
- May fail for age-restricted or private videos

### 2. Steel.dev Browser (Playlist and metadata — Stdio only)

Uses cloud browser automation for local playlist scraping and video metadata:
- Opens playlists/videos in a managed browser
- Handles dynamic playlist content loading
- CAPTCHA solving enabled

## Batch Deduplication

The sync uses optimized batch deduplication:

| Operation | Before | After |
|-----------|--------|-------|
| Check 50 videos | 50 API calls | 1 API call |
| Sync new videos | N calls | N calls |
| **Total** | 50+N | 1+N |

Uses Notion's OR filter to check all URLs in a single query.

## Retry Logic

All API calls (YouTube and Notion) use exponential backoff with jitter:

| Setting | Default | Description |
|---------|---------|-------------|
| Max retries | 3 | Attempts before giving up |
| Base delay | 1000ms | Initial backoff delay |
| Max delay | 30000ms | Ceiling for backoff |
| Jitter | Random | Prevents thundering herd |

Retryable errors: 429 (rate limit), 5xx (server errors), network errors (ECONNRESET, ETIMEDOUT), Notion conflicts.

Non-retryable: 400 (bad request), 401 (unauthorized), 404 (not found), video unavailable.

## Cost Estimation

| Resource | Cost | Notes |
|----------|------|-------|
| Steel.dev | $0.10/browser-hour | Stdio server only |
| Notion API | Free | Within integration limits |
| YouTube Transcript API | Free | Public transcripts |
| Cloudflare Worker | Free tier | 100K requests/day |

### Typical Workflows

| Workflow | Browser Time | Estimated Cost |
|----------|-------------|---------------|
| 10 videos (API only) | 0 min | $0.00 |
| 50 videos (playlist sync) | 5-10 min | ~$0.02 |
| 100 videos (large playlist) | 15-20 min | ~$0.05 |
| Single transcript (API) | 0 min | $0.00 |

## Troubleshooting

### "Transcript not available"

- **Cause**: Video has no captions (disabled by owner, or auto-captions unavailable)
- **Fix**: Use the `scrape_video` tool (stdio) which uses browser automation to find transcripts
- **Note**: Some videos genuinely have no captions — this is expected

### "Steel API key required"

- **Cause**: Missing `STEEL_API_KEY` environment variable (stdio server only)
- **Fix**: Set `STEEL_API_KEY` in `.env` or pass as env variable
- **Worker**: The Worker doesn't require Steel — it uses API-only transcript extraction

### "Notion API error (401)"

- **Cause**: Invalid or expired Notion API key
- **Fix**: Regenerate at https://notion.so/my-integrations and update `NOTION_API_KEY`
- **Check**: Ensure the integration has access to the target database

### "Notion API error (429)"

- **Cause**: Notion rate limit exceeded
- **Fix**: The retry logic handles this automatically. If persistent, increase `YOUTUBE_SYNC_NOTION_RATE_LIMIT_DELAY`

### "Session expired" during playlist extraction

- **Cause**: Steel session timed out during long extraction
- **Fix**: Increase `YOUTUBE_SYNC_SESSION_TIMEOUT` (default: 1 hour)
- **Tip**: Use `--limit` flag for large playlists to extract in batches

### Worker deployment issues

- **"No database ID configured"**: Set `NOTION_DATABASE_ID` secret: `wrangler secret put NOTION_DATABASE_ID`
- **"Notion API error"**: Set `NOTION_API_KEY` secret: `wrangler secret put NOTION_API_KEY`
- **CORS errors**: The Worker serves on `/mcp` and `/sse` — ensure your client connects to the correct endpoint

## Development

### Project Structure

```
packages/half-dozen-youtube-sync/
├── src/
│   ├── index.ts                  # Stdio MCP server (11 tools, resources, prompts)
│   ├── config.ts                 # Centralized configuration
│   ├── types.ts                  # TypeScript types (including strict Notion types)
│   ├── observability.ts          # Langfuse tracing
│   ├── notion/
│   │   └── client.ts             # Notion sync client (batch dedup, chunking)
│   ├── providers/
│   │   └── steel.ts              # Steel.dev browser provider
│   ├── youtube/
│   │   ├── index.ts              # Re-exports
│   │   ├── playlist.ts           # Playlist extraction (URL parsing, browser)
│   │   └── transcript.ts         # Transcript extraction (API + captions)
│   ├── utils/
│   │   └── retry.ts              # Exponential backoff retry utility
│   └── __tests__/                # Unit tests (67 tests)
│       ├── playlist.test.ts      # URL parsing tests
│       ├── transcript.test.ts    # Transcript utility tests
│       ├── notion-client.test.ts # Chunking tests
│       └── retry.test.ts         # Retry logic tests
├── worker/
│   ├── index.ts                  # Cloudflare Worker (McpAgent, 5 tools)
│   ├── package.json              # Worker dependencies
│   ├── wrangler.toml             # Cloudflare config
│   └── tsconfig.json             # Worker TypeScript config
├── batch-sync.ts                 # CLI batch sync tool
├── test-connection.ts            # Service connectivity checker
├── package.json                  # Main package
├── tsconfig.json                 # TypeScript config
├── vitest.config.ts              # Test config
└── .env.example                  # Environment template
```

### Key Design Decisions

1. **Dual transport**: Stdio for full browser automation, Worker for remote API-only access
2. **API-first transcripts**: The `youtube-transcript` package is tried before browser automation
3. **Batch dedup**: Single Notion query for all URLs reduces API calls from N to 1
4. **Retry with backoff**: All API calls retry transient failures with exponential backoff + jitter
5. **Strict types**: Notion API responses use typed interfaces instead of `as unknown as` casts
6. **Centralized config**: All magic numbers live in `src/config.ts` with env var overrides

## Data Types

```typescript
interface VideoData {
  videoId: string;
  url: string;
  title: string;
  channelName?: string;
  publishedAt?: string;
  duration?: string;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  thumbnailUrl?: string;
  scrapedAt: string;
  extractionMethod: 'youtube-transcript-api' | 'steel';
  playlistId?: string;
  playlistTitle?: string;
}

interface TranscriptSegment {
  text: string;
  start: number;    // seconds
  duration: number; // seconds
}
```

## License

MIT - CREATE SOMETHING
