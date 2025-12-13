# @create-something/meetings

Meeting transcription and summarization service. Tools recede, understanding remains.

## Philosophy

Meetings are ephemeral—understanding should persist. This service captures audio, transcribes via Whisper, summarizes with Claude, and stores in the CREATE SOMETHING knowledge graph.

The meeting doesn't end when you hang up. It enters the hermeneutic circle.

## Architecture

```
Local App → POST /upload → R2 (audio) → Queue → Worker
                               ↓
                          D1 (metadata)
                               ↓
                     Workers AI (Whisper)
                               ↓
                     Claude API (summary)
                               ↓
                     D1 (transcript, summary, topics)
```

## Setup

### 1. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create meetings

# Create R2 bucket
wrangler r2 bucket create meetings-audio

# Create Queue
wrangler queues create meeting-processing
```

### 2. Update wrangler.toml

Add the database ID from step 1:

```toml
[[d1_databases]]
binding = "DB"
database_name = "meetings"
database_id = "your-database-id-here"
```

### 3. Run Migrations

```bash
wrangler d1 migrations apply meetings --local  # Local dev
wrangler d1 migrations apply meetings          # Production
```

### 4. Set Secrets

```bash
wrangler secret put ANTHROPIC_API_KEY
```

### 5. Deploy

```bash
pnpm --filter=@create-something/meetings deploy
```

## API

### Upload Meeting

```bash
curl -X POST https://create-something-meetings.workers.dev/upload \
  -F "audio=@meeting.mp3" \
  -F 'metadata={"title":"Weekly Sync","property":"agency","projectId":"proj_123"}'
```

### List Meetings

```bash
curl "https://create-something-meetings.workers.dev/meetings?limit=10&property=agency"
```

### Get Meeting

```bash
curl "https://create-something-meetings.workers.dev/meetings/{id}"
```

### Search Transcripts

```bash
curl "https://create-something-meetings.workers.dev/search?q=budget+timeline"
```

## Local Development

```bash
# Start dev server
pnpm --filter=@create-something/meetings dev

# Test upload
curl -X POST http://localhost:8787/upload \
  -F "audio=@test.mp3" \
  -F 'metadata={}'
```

## Local App Integration

The local menubar app (to be built) should:

1. Detect meeting start (monitor for Zoom/Meet/Teams processes)
2. Capture system audio (via BlackHole or similar)
3. Save to temp file when meeting ends
4. POST to `/upload` endpoint
5. Delete local file after successful upload

## Schema

See `migrations/0001_create_meetings.sql` for the full schema.

Key fields:
- `transcript` - Full transcription text
- `summary` - AI-generated summary
- `action_items` - JSON array of action items
- `topics` - JSON array of discussed topics
- `project_id` - Link to CREATE SOMETHING projects
- `property` - Which property (agency, io, space, ltd)

## Connections

Meetings can be linked to:
- **Projects** via `project_id` - connect to agency client work
- **Properties** via `property` - categorize by CREATE SOMETHING domain
- **Tags** via `tags` - arbitrary categorization

Future: automatic linking based on participant detection and topic extraction.
