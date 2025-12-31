# Social Posting Patterns

Automated LinkedIn posting with research-backed timing. The tool recedes; the content distributes itself.

## Architecture

```
packages/agency/
├── content/social/
│   └── linkedin-*.md               # Longform content files
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

**Canon insight**: Daily longform posts, each self-contained. No threading—LinkedIn has no native thread structure. One complete insight per day.

## Strategy: Daily Longform

| Principle | Application |
|-----------|-------------|
| **One post per weekday** | Mon-Fri at 9am local time |
| **Self-contained** | Each post stands alone (no "as I mentioned yesterday") |
| **1500+ characters** | LinkedIn rewards depth over brevity |
| **CTA in comments** | Links in first comment, not post body |
| **Conflict detection** | Prevents double-posting on same day |

### Posting Modes

| Mode | Use Case | When |
|------|----------|------|
| `longform` | Daily insights (recommended) | Default for all content |
| `drip` | Multi-part series | Only when content genuinely requires multiple days |
| `immediate` | Testing only | Never in production |

## Content Format

Each content file is a complete, standalone post:

```markdown
# LinkedIn Post: Title

**Campaign:** identifier
**Target:** LinkedIn
**Type:** Longform post
**CTA:** url

---

## Post

Your complete post content here.

1500+ characters recommended.

Multiple paragraphs for readability.

Concrete examples, specific metrics.

---

## Comment (Post after publishing)

CTA link and hashtags go here.

#Hashtag1 #Hashtag2 #Hashtag3

---

## Voice Compliance

- [x] Claims backed by methodology
- [x] Self-contained (no thread references)
- [x] No marketing jargon
```

The parser:
- Extracts content from `## Post` section
- Extracts comment content from `## Comment` section
- Validates character count (warns if <1500)
- Checks hashtag count (warns if >5)

## API Reference

### Schedule Posts

```bash
# Schedule a longform post for next available weekday
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d '{"platform":"linkedin","content":"<markdown>","mode":"longform"}'

# Dry run (preview schedule)
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d '{"platform":"linkedin","content":"<markdown>","mode":"longform","dryRun":true}'
```

**Request:**
```typescript
{
  platform: 'linkedin',
  content: string,                // Raw markdown or content file path
  mode?: 'longform' | 'drip',     // Default: longform
  timezone?: string,              // Default: America/Los_Angeles
  dryRun?: boolean                // Preview without scheduling
}
```

**Response:**
```json
{
  "scheduled": {
    "scheduledFor": "Tue, Jan 7, 9:00 AM PST",
    "preview": "Most automation fails...",
    "characterCount": 1650
  },
  "tokenStatus": {
    "connected": true,
    "daysRemaining": 55
  }
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
curl -X DELETE "https://createsomething.agency/api/social/cancel?id=sp_xxx"
```

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
  created_at INTEGER NOT NULL,
  posted_at INTEGER,
  metadata TEXT                   -- JSON (commentContent, etc.)
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

## Daily Workflow

```bash
# 1. Create content file
# packages/agency/content/social/linkedin-{topic}.md

# 2. Check token status
curl https://createsomething.agency/api/social/status | jq .tokenStatus

# 3. Schedule for next available weekday
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d '{"platform":"linkedin","content":"...","mode":"longform"}'

# 4. Monitor
curl https://createsomething.agency/api/social/status?status=pending
```

## Subtractive Triad

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I built this before? | Reuses io's OAuth, shared KV |
| **Rams** | Does this earn existence? | Each post self-contained, 1500+ chars |
| **Heidegger** | Does this serve the whole? | Daily insights enable GTM at scale |

The infrastructure disappears; the content distributes itself. One complete thought per day, every weekday.
