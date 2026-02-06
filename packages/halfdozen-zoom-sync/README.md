# @create-something/halfdozen-zoom-sync

Daily Zoom Clips to Notion sync for Half Dozen. Runs on Modal.com with Steel.dev browser automation and Resend email alerts.

## Architecture

```
Modal.com (Cron: 9am EST daily)
  |
  +-- Steel.dev (Playwright browser automation)
  |     +-- Load session context (cookies from Modal Volume)
  |     +-- Navigate to Zoom Clips library
  |     +-- Extract metadata + transcript per clip
  |
  +-- Notion API (direct HTTP)
  |     +-- Batch deduplication (OR filter, 1 API call)
  |     +-- Create page with properties
  |     +-- Append transcript as toggle block (chunked)
  |
  +-- Resend (email alerts)
        +-- Success: clip counts
        +-- Session expired: fix instructions
        +-- Failure: error details
```

## Setup

```bash
# 1. Install Modal CLI
pip install modal

# 2. Authenticate
modal setup

# 3. Create secrets in Modal dashboard (modal.com/secrets)
#    Name: zoom-clips-secrets
#    Keys: STEEL_API_KEY, NOTION_API_KEY, RESEND_API_KEY

# 4. Capture session context (one-time, refresh when cookies expire)
npx tsx watch-session.ts
# Open the Live View URL, log into Zoom, press Ctrl+C

# 5. Upload session context to Modal
modal volume put zoom-clips-data session-context.json /session-context.json

# 6. Deploy
modal deploy modal_sync.py
```

## Usage

```bash
# Run sync manually
modal run modal_sync.py

# Deploy (enables daily cron)
modal deploy modal_sync.py

# Update session context when cookies expire
npx tsx watch-session.ts
modal volume put zoom-clips-data session-context.json /session-context.json --force
```

## Notion Database Schema

| Notion Property | Type | Value |
|-----------------|------|-------|
| Item | title | Clip title |
| Source URL | url | Zoom clip share URL (used for dedup) |
| Attendees | rich_text | Speaker name |
| Date | date | Clip creation date |
| Status | select | "Active" |
| Source | select | "Zoom" |
| Type | select | "Clip" |
| (Page body) | toggle | Transcript (chunked at sentence boundaries) |

## Session Context & Cookie Lifespan

| Component | Lifespan | Notes |
|-----------|----------|-------|
| Steel Session | 15 minutes | Created fresh each run |
| Session Context | 1-2 weeks | Stored in Modal Volume |

When cookies expire, the sync detects the auth redirect, sends an "ACTION REQUIRED" email, and exits.

## Schedule

Daily at 9am EST (14:00 UTC). Edit in `modal_sync.py`:

```python
schedule=modal.Cron("0 14 * * *")
```

## Files

| File | Purpose |
|------|---------|
| `modal_sync.py` | Production sync script (Modal deployment) |
| `watch-session.ts` | Capture browser session context for auth |
| `.env.example` | Environment variable template |

## License

MIT - CREATE SOMETHING
