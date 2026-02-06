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
- **Transcript Extraction**: Dual-mode extraction (API first, browser fallback)
- **Optimized Notion Sync**: Batch deduplication (1 API call for N videos)
- **MCP Server**: Full MCP integration with Tools, Resources, and Prompts
- **Cloudflare Worker**: Remote HTTP/SSE transport for deployment
- **ChatGPT Connector**: `search`/`fetch` tools for cross-platform compatibility
- **Langfuse Observability**: Complete tracing and cost tracking
- **Retry Logic**: Exponential backoff with jitter for resilient API calls
- **65 Unit Tests**: URL parsing, transcript chunking, retry logic

## Quick Start

### 1. Initial Setup

```bash
# Install dependencies
pnpm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 2. CLI Usage

```bash
# Sync a playlist to Notion
npx tsx batch-sync.ts --playlist "https://youtube.com/playlist?list=PL02AA8F4D1484BBC8" --sync

# Extract first 5 videos only
npx tsx batch-sync.ts --playlist "https://youtube.com/playlist?list=..." --limit 5

# Extract single video transcript
npx tsx batch-sync.ts --video "https://youtube.com/watch?v=..." --sync

# Verify Notion database connection
npx tsx batch-sync.ts --check-db
```

### 3. MCP Server (Stdio)

Add to your MCP config:

```json
{
  "mcpServers": {
    "half-dozen-youtube-sync": {
      "command": "npx",
      "args": ["tsx", "packages/half-dozen-youtube-sync/src/index.ts"],
      "env": {
        "STEEL_API_KEY": "your-key",
        "NOTION_API_KEY": "your-key",
        "NOTION_DATABASE_ID": "your-db-id"
      }
    }
  }
}
```

### 4. MCP Server (Worker - Remote)

Deploy to Cloudflare Workers for remote access:

```bash
cd worker
pnpm install
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_DATABASE_ID
wrangler deploy
```

Connect via:
- **HTTP**: `https://halfdozen-youtube-sync-mcp.half-dozen.workers.dev/mcp`
- **SSE**: `https://halfdozen-youtube-sync-mcp.half-dozen.workers.dev/sse`

### 5. Running Tests

```bash
pnpm test         # Run all tests once
pnpm test:watch   # Watch mode
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

### Tools (Stdio: 11 | Worker: 5)

| Tool | Stdio | Worker | Description |
|------|:-----:|:------:|-------------|
| `sync_playlist` | x | | **Main workflow** - Extract playlist, get transcripts, sync to Notion |
| `scrape_playlist` | x | | Extract video list from a playlist URL |
| `scrape_video` | x | | Extract single video with transcript (browser) |
| `extract_transcript` | x | x | Get transcript via API (no browser needed) |
| `sync_to_notion` | x | x | Sync video data to Notion |
| `create_session` | x | | Create Steel browser session |
| `session_status` | x | | Check session status |
| `navigate` | x | | Navigate browser to URL |
| `close_session` | x | | Close session and get recording |
| `get_database_schema` | x | x | Get Notion database properties |
| `get_provider_status` | x | | Steel provider metrics |
| `search` | | x | ChatGPT connector: search synced videos |
| `fetch` | | x | ChatGPT connector: get video details |

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

### 1. YouTube Transcript API (Primary)

Uses the `youtube-transcript` npm package to fetch transcripts directly:
- **Fast**: No browser startup needed
- **Reliable**: Uses YouTube's internal API
- **Preferred**: Default method for all extractions

Limitations:
- Only works for videos with captions enabled
- May fail for age-restricted or private videos

### 2. Steel.dev Browser (Fallback — Stdio only)

Uses cloud browser automation when API fails:
- Opens transcript panel in YouTube player
- Extracts timestamped segments from DOM
- Handles dynamic content loading
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
│   │   └── transcript.ts         # Transcript extraction (API + browser)
│   ├── utils/
│   │   └── retry.ts              # Exponential backoff retry utility
│   └── __tests__/                # Unit tests (65 tests)
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
