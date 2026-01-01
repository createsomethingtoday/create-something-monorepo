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

**Canon insight**: Quality over volume. Each post serves the unified thesis. No threading—LinkedIn has no native thread structure.

## Strategy: Unified Thesis (Updated January 2026)

**The Core Thesis** (every post must connect to this):

> "AI development works when you treat LLMs as partners, not tools. Peter Norvig proved it empirically. We've built the methodology. Here's what we've learned."

**Gateway Paper**: [The Norvig Partnership](https://createsomething.io/papers/norvig-partnership) — Empirical validation from Peter Norvig's Advent of Code 2025 experiments.

---

## Multi-Account Strategy

Three accounts, three purposes. Each recedes into its function (Zuhandenheit).

### Account Roles

| Account | Purpose | Content Origin | Voice |
|---------|---------|----------------|-------|
| **CREATE SOMETHING** | Research institution | Primary for papers, methodology, experiments | Formal, analytical |
| **WORKWAY** | Methodology in practice | Primary for vertical template, business building | Practical, applied |
| **Personal (Micah)** | Hermeneutic synthesis | Reposts + commentary | Reflective, contextual |

### The Flow

```
Daily work (Webflow) → Insights emerge
        ↓
Papers/experiments written → Posted to CREATE SOMETHING
        ↓
Micah reposts → Adds personal context ("Here's what I'm learning...")
        ↓
WORKWAY demonstrates → Methodology applied to real business
        ↓
Micah reposts → Endorses with practitioner perspective
```

### Why This Works

**Personal account becomes curation, not origin.**

Previously: Micah's account was origin for everything → scattered, no thesis
Now: Micah's account synthesizes and contextualizes → unified voice

This follows the hermeneutic circle:
- CREATE SOMETHING = parts (individual papers, experiments)
- WORKWAY = application (methodology in practice)
- Personal = whole (synthesis, connecting parts)

### Account-Specific Guidelines

#### CREATE SOMETHING (Primary Research)

| Do | Don't |
|----|-------|
| Post papers with key insights | Post personal updates |
| Share experiments with methodology | Cross-post WORKWAY content |
| Announce research findings | Use casual voice |
| Link to gateway paper | Promote LMS directly |

**Voice**: "Our research shows..." / "This paper examines..." / "The methodology demonstrates..."

#### WORKWAY (Practice Layer)

| Do | Don't |
|----|-------|
| Share building-in-public updates | Post theoretical content |
| Show methodology applied | Cross-post CREATE SOMETHING papers |
| Document decisions with Canon lens | Use research voice |
| Link back to methodology when relevant | Ignore the hermeneutic connection |

**Voice**: "We're building..." / "Here's how we applied..." / "The Subtractive Triad in action..."

#### Personal (Micah)

| Do | Don't |
|----|-------|
| Repost CREATE SOMETHING with context | Originate methodology posts |
| Repost WORKWAY with endorsement | Scatter across unrelated topics |
| Add practitioner perspective | Post without thesis connection |
| Share Webflow-adjacent insights | Mix Webflow employer content |
| Be transparent about the system | Pretend accounts are separate |

**Voice**: "I've been working on..." / "This is why..." / "Here's what I'm learning..."

### Transparency Principle

Be open about the multi-account strategy. The community respects authenticity over performance.

Sample transparency post:
> "I've been posting scattered content for months. Papers, LMS promos, random thoughts. It diluted the message.
>
> Here's the new approach: CREATE SOMETHING posts research. WORKWAY posts practice. I repost and add context.
>
> Why? Each account should serve one purpose. Mine was trying to serve all three. Now it synthesizes instead of originates.
>
> Less, but better—applied to LinkedIn itself."

---

### Post Types (All Connecting to Thesis)

| Type | Example | Thesis Connection | Primary Account |
|------|---------|-------------------|-----------------|
| **Norvig validation** | Empirical findings, 20x speed | External authority proves thesis | CREATE SOMETHING |
| **Case studies** | Kickstand, Arc | Partnership methodology in production | CREATE SOMETHING |
| **Methodology** | Subtractive Triad, quality gates | How the partnership actually works | CREATE SOMETHING |
| **Anti-patterns** | What fails with replacement mindset | Contrast reinforces thesis | CREATE SOMETHING |
| **Building-in-public** | WORKWAY decisions, template evolution | Methodology applied | WORKWAY |
| **Synthesis** | Connecting insights to practice | Hermeneutic circle | Personal |

### What NOT to Post

| Content Type | Why Stop | Any Account |
|--------------|----------|-------------|
| LMS promotional content | Doesn't connect to partnership thesis | All |
| Pure aesthetic images | Demands attention without argument | All |
| Scattered updates | Fragments rather than serves whole | Personal |
| Daily volume for its own sake | Dilutes signal with noise | All |
| Webflow employer content | Separate concern, different context | Personal |

### The Heideggerian Test

Before posting, ask:

1. **Does this recede into the thesis?** (Zuhandenheit) Or does it demand attention for itself?
2. **Does this serve the hermeneutic whole?** (Heidegger) Or is it a fragment?
3. **Does this earn its existence?** (Rams) Or is it posting for posting's sake?
4. **Is this the right account?** Each account has one purpose.

If any answer is wrong, don't post (or move to correct account).

### Cadence

| Account | Frequency | Focus |
|---------|-----------|-------|
| CREATE SOMETHING | 1-2/week | Papers, experiments, methodology |
| WORKWAY | 1-2/week | Building-in-public, applied methodology |
| Personal | 2-3/week | Reposts with context, synthesis |

Total visible activity: ~5-6 posts/week, but coherent across three voices.

### Posting Modes

| Mode | Use Case | When |
|------|----------|------|
| `longform` | Thesis-connected insights | Default for all content |
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
