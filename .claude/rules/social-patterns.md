# Social Posting Patterns

Automated LinkedIn posting with research-backed timing. The tool recedes; the content distributes itself.

## Architecture

```
packages/agency/
├── content/social/
│   └── linkedin-thread-*.md        # Content files
├── src/lib/social/
│   ├── linkedin-client.ts          # API client
│   ├── linkedin-parser.ts          # Markdown parser
│   ├── strategy.ts                 # Timing optimization
│   └── index.ts                    # Exports
├── src/routes/api/social/
│   ├── schedule/+server.ts         # POST: schedule posts
│   ├── status/+server.ts           # GET: view scheduled
│   └── cancel/+server.ts           # DELETE: cancel posts
└── workers/social-poster/
    ├── src/index.ts                # Cron + queue worker
    └── wrangler.toml               # Worker config
```

## LinkedIn Best Practices (2025 Research)

| Factor | Best Practice | Source |
|--------|---------------|--------|
| **Critical window** | First 30 min = 75% of reach | Sprout Social |
| **Optimal times** | Tue-Wed 8-9am or 10-11am local | Buffer |
| **Post frequency** | Max 1/day (penalty for multiple) | Hootsuite |
| **Hashtags** | Max 5 (penalty for more) | AuthoredUp |
| **Links** | Put in comments, not post body | CXL |
| **Content length** | 1500+ chars = more reach | Closely |

**Key insight**: Multi-post "threads" in rapid succession trigger penalties. Use `drip` mode.

## Posting Modes

| Mode | Posts | Timing | Use Case |
|------|-------|--------|----------|
| `drip` | 1/day | Tue/Thu 9am | Multi-part content (default) |
| `longform` | 1 total | Next optimal slot | Consolidated pieces |
| `immediate` | All now | 1-min delays | Testing only |

## API Reference

### Schedule Posts

```bash
# Dry run (preview schedule)
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d '{"platform":"linkedin","content":"<markdown>","mode":"drip","dryRun":true}'

# Actual scheduling (requires LinkedIn auth)
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d '{"platform":"linkedin","content":"<markdown>","mode":"drip"}'
```

**Request:**
```typescript
{
  platform: 'linkedin',           // Only LinkedIn supported
  content: string,                // Raw markdown or content name
  mode?: 'drip' | 'longform' | 'immediate',  // Default: drip
  timezone?: string,              // Default: America/Los_Angeles
  startDate?: string,             // ISO date, default: next optimal day
  dryRun?: boolean                // Preview without scheduling
}
```

**Response (dry run):**
```json
{
  "dryRun": true,
  "mode": "drip",
  "timezone": "America/Los_Angeles",
  "threadId": "thread_xxx",
  "totalPosts": 7,
  "tokenStatus": {
    "connected": true,
    "daysRemaining": 55,
    "warning": null
  },
  "scheduled": [
    {
      "scheduledFor": "Tue, Dec 30, 9:00 AM PST",
      "preview": "1/7: Most automation fails...",
      "fullContent": "...",
      "hasCommentLink": false
    }
  ]
}
```

### Check Status

```bash
curl https://createsomething.agency/api/social/status
curl https://createsomething.agency/api/social/status?status=pending
curl https://createsomething.agency/api/social/status?campaign=kickstand
```

### Cancel Posts

```bash
# Cancel single post
curl -X DELETE "https://createsomething.agency/api/social/cancel?id=sp_xxx"

# Cancel entire thread
curl -X DELETE "https://createsomething.agency/api/social/cancel?thread=thread_xxx"
```

## Content Format

Content files follow this markdown structure:

```markdown
# LinkedIn Thread: Title

**Campaign:** identifier
**Target:** LinkedIn
**Type:** N-tweet thread
**CTA:** url

---

## Thread

### Tweet 1 (Hook)

Content for first post.

---

### Tweet 2 (Topic)

Content for second post.

---
```

The parser:
- Extracts content between `### Tweet N` headers
- Adds thread labels (1/7, 2/7, etc.)
- Converts `**bold**` to plain text (LinkedIn doesn't support markdown)
- Extracts hashtags from final post
- Detects and moves links to comments

## Worker Behavior

The `social-poster` worker runs every 15 minutes:

1. **Cron handler**: Query D1 for posts where `scheduled_for <= now() AND status = 'pending'`
2. **Queue to processing**: Send matching posts to `social-posting-queue`
3. **Queue consumer**: For each message:
   - Validate LinkedIn token
   - Call LinkedIn UGC Posts API
   - Add comment with link if specified
   - Update D1 with result (success/failure)
4. **Retry logic**: Transient errors retry (max 3); permanent errors (expired token, 401) don't

## D1 Schema

```sql
CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_for INTEGER NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  status TEXT DEFAULT 'pending',  -- pending|queued|posted|failed|cancelled
  post_id TEXT,                   -- LinkedIn's post ID
  post_url TEXT,                  -- URL to view post
  error TEXT,                     -- Error message if failed
  campaign TEXT,                  -- Source campaign identifier
  thread_id TEXT,                 -- Groups posts in thread
  thread_index INTEGER,           -- Position (1-based)
  thread_total INTEGER,           -- Total in thread
  created_at INTEGER NOT NULL,
  posted_at INTEGER,
  metadata TEXT                   -- JSON (commentLink, etc.)
);
```

## Authentication

LinkedIn OAuth flow is at `packages/io`:

1. Visit `https://createsomething.io/api/linkedin/auth`
2. Authorize with LinkedIn
3. Token stored in shared KV namespace `SESSIONS`
4. Token valid ~60 days

Check token status:
```bash
curl https://createsomething.agency/api/social/status | jq .tokenStatus
```

## Workflow

```bash
# 1. Authenticate (once every ~60 days)
# Visit: https://createsomething.io/api/linkedin/auth

# 2. Check token status
curl https://createsomething.agency/api/social/status | jq .tokenStatus

# 3. Dry run to preview schedule
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d @/tmp/schedule-request.json | jq .

# 4. Schedule for real (remove dryRun flag)
# Posts will be sent automatically at scheduled times

# 5. Monitor
curl https://createsomething.agency/api/social/status?status=pending
```

## Subtractive Triad

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I built this before? | Reuses io's OAuth, shared KV |
| **Rams** | Does this earn existence? | Research-backed timing, zero manual intervention |
| **Heidegger** | Does this serve the whole? | Enables GTM Phase 3 at scale |

When the tool works, you schedule once and forget. The infrastructure disappears; the content distributes itself.
