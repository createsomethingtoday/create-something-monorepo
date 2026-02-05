# @create-something/zoom-clips-mcp

MCP server for extracting Zoom Clips transcripts and syncing to Notion with human-in-the-loop authentication.

## Features

- **Session Context Authentication**: Capture browser state once, reuse for future sessions (bypasses login/reCAPTCHA)
- **Automatic Transcript Extraction**: Clicks the Transcript tab and extracts timestamped content
- **Optimized Notion Sync**: Batch deduplication (1 API call for N clips)
- **Steel.dev Integration**: Cloud browser automation with live viewing
- **Langfuse Observability**: Full tracing and session recordings

## Quick Start

### 1. Initial Setup (One Time)

```bash
# Install dependencies
pnpm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 2. Capture Session Context (One Time Per Login)

```bash
# Start a watch session - log in manually via Live View
npx tsx watch-session.ts

# Open the Live View URL and log into Zoom
# The session context is automatically captured to session-context.json
```

### 3. Extract & Sync Clips

```bash
# Extract clips from library and sync to Notion
npx tsx batch-extract.ts --sync --limit 5

# Extract specific clips
npx tsx batch-extract.ts --sync --urls "url1,url2,url3"

# Extract without Notion sync (saves to extracted-clips/)
npx tsx batch-extract.ts --limit 10
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Input: Zoom Clips Library or specific URLs                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Authentication: Session Context (captured cookies/storage)  │
│ - Bypasses reCAPTCHA                                        │
│ - Reusable across sessions                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Extraction: Steel.dev Cloud Browser + Puppeteer             │
│ 1. Navigate to clip                                         │
│ 2. Click "Transcript" tab (.zoom-tabs__item)               │
│ 3. Extract timestamped content                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Notion Sync: Optimized batch deduplication                  │
│ - 1 API call checks all URLs for duplicates                │
│ - Transcript → Collapsible toggle block (chunked)          │
│ - Properties: Status=Active, Source=Zoom, Type=Clip        │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Required
STEEL_API_KEY=ste-xxx          # Get at https://steel.dev
NOTION_API_KEY=ntn_xxx         # Get at https://notion.so/my-integrations

# Optional (observability)
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
```

### Notion Database Schema

The default configuration syncs to a database with these properties:

| Notion Property | Type | Value |
|-----------------|------|-------|
| Item | title | Clip title |
| Source URL | url | Zoom clip share URL (used for dedup) |
| Attendees | rich_text | Speaker name |
| Date | date | Clip creation date |
| Status | select | "Active" |
| Source | select | "Zoom" |
| Type | select | "Clip" |
| (Page body) | toggle | Transcript (chunked into paragraphs) |

## CLI Scripts

### `batch-extract.ts` - Main Extraction Tool

```bash
npx tsx batch-extract.ts [options]

Options:
  --limit N        Extract first N clips (default: 10)
  --urls url1,url2 Extract specific clip URLs
  --sync           Sync to Notion after extraction
  --database ID    Use specific Notion database ID
```

### `daily-sync.ts` - Automated Daily Sync

Cron-friendly script with auth detection and optional alerts.

```bash
# Run sync
npx tsx daily-sync.ts

# Run with Slack/webhook alerts on failure
npx tsx daily-sync.ts --webhook https://hooks.slack.com/...

# Or set via environment
ALERT_WEBHOOK_URL=https://hooks.slack.com/... npx tsx daily-sync.ts
```

**Schedule with cron** (run daily at 9am):

```bash
0 9 * * * cd /path/to/zoom-clips-mcp && npx tsx daily-sync.ts >> logs/sync.log 2>&1
```

**Auth failure detection**: If cookies expire, the script exits with error and sends alert.

### `watch-session.ts` - Capture Session Context

```bash
npx tsx watch-session.ts

# Opens a Steel session with Live View
# Navigate to clips, the script captures context automatically
# Press Ctrl+C when done - context saved to session-context.json
```

### `test-notion-sync.ts` - Test Notion Integration

```bash
npx tsx test-notion-sync.ts        # Test with existing transcript
npx tsx test-notion-sync.ts --new  # Force create new entry
```

## Scheduled Sync (Modal.com)

Deploy to Modal.com for serverless cron scheduling with Resend email alerts.

### Setup

```bash
# 1. Install Modal CLI
pip install modal

# 2. Authenticate
modal setup

# 3. Create secrets in Modal dashboard (modal.com/secrets)
#    Name: zoom-clips-secrets
#    Keys: STEEL_API_KEY, NOTION_API_KEY, RESEND_API_KEY

# 4. Upload session context
modal volume put zoom-clips-data session-context.json /session-context.json

# 5. Deploy
modal deploy modal_sync.py
```

### Usage

```bash
# Test locally
modal run modal_sync.py

# View logs
modal app logs zoom-clips-sync

# Update session context (when cookies expire)
modal volume put zoom-clips-data session-context.json /session-context.json
```

### Schedule

The cron runs daily at **9am EST** (14:00 UTC). Edit `modal_sync.py` to change:

```python
schedule=modal.Cron("0 14 * * *")  # Change cron expression
```

### Email Alerts

- **Success**: Summary of processed/synced/skipped clips
- **Failure**: Error details + instructions to refresh session context

## Session Context & Cookie Lifespan

| Component | Lifespan | Notes |
|-----------|----------|-------|
| Steel Session | 15 minutes | Created fresh each run |
| Session Context (cookies) | 1-2 weeks | Stored in `session-context.json` |

**When cookies expire**, the sync will:
1. Detect auth failure (redirect to login page)
2. Send failure email via Resend
3. Exit with error

**To refresh cookies:**
```bash
# 1. Capture new session locally
npx tsx watch-session.ts
# Open Live View URL, log in, press Ctrl+C

# 2. Upload to Modal volume
modal volume put zoom-clips-data session-context.json /session-context.json
```

## Zoom Clips UI Structure (Feb 2026)

Verified page structure for extraction:

```
┌─────────────────────────────────────────────────────────────┐
│ Video Player (center)                                       │
├─────────────────────────────────────────────────────────────┤
│ Title + Speaker + Play Count                                │
├─────────────────────────────────────────────────────────────┤
│ Tabbed Sidebar:                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Summary | Chapters | Comments | Transcript | Statistics │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Transcript Tab Content:                                     │
│   "00:01Text here00:13More text00:25Even more text..."     │
└─────────────────────────────────────────────────────────────┘
```

**Key Selectors:**
- Tab buttons: `.zoom-tabs__item`
- Active tab: `.zoom-tabs__item.is-active`
- Summary text: `.summary-text`

## Transcript Format

Raw transcript is timestamped inline:

```
00:01Hello, this is the start00:05Now we move to the next point00:12And this is the conclusion
```

The extraction parses this into structured segments and stores the full text in Notion as a collapsible toggle block.

## Notion Sync Details

### Transcript Chunking

Notion has a 2,000 character limit per rich text object. The sync automatically:

1. Splits transcript at sentence boundaries (~1,900 chars per chunk)
2. Creates a collapsible Toggle block titled "📝 Transcript"
3. Adds each chunk as a Paragraph inside the toggle

### Batch Deduplication

For 3-5 clips/day workflow, the sync is optimized:

| Operation | Before | After |
|-----------|--------|-------|
| Check 5 clips | 5 API calls | 1 API call |
| Sync new clips | N calls | N calls |
| **Total** | 5+N | 1+N |

Uses Notion's OR filter to check all URLs in a single query.

## MCP Tools (for Agent Integration)

| Tool | Description |
|------|-------------|
| `create_session` | Create browser session with Live View URL |
| `session_status` | Check session state |
| `scrape_clip` | Extract clip data from current page |
| `sync_to_notion` | Sync clips to Notion (optimized batch dedup) |
| `diagnose_ui` | Run diagnostics on page structure |

## Data Types

```typescript
interface ClipData {
  url: string;
  title: string;
  description?: string;
  speaker?: string;
  transcript?: string;
  duration?: string;
  createdAt?: string;
  scrapedAt: string;
  extractionMethod: 'steel' | 'api';
}

interface NotionSelectDefaults {
  status?: string;   // "Active"
  source?: string;   // "Zoom"
  type?: string;     // "Clip"
}
```

## Files

| File | Purpose |
|------|---------|
| `session-context.json` | Captured browser state for reuse |
| `cookies.json` | Manual cookie export (alternative auth) |
| `extracted-clips/` | Output directory for extracted data |
| `full-transcript.txt` | Last extracted transcript |

## License

MIT - CREATE SOMETHING
