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

## Strategy: Unified Thesis

**Core Thesis** (every post connects to this):

> "Better outcomes through systematic discipline. Norvig achieved 20x improvement. Kickstand reduced 155 scripts to 13. Here's the methodology—and why it works."

**Gateway Paper**: [The Norvig Partnership](https://createsomething.io/papers/norvig-partnership)

### Presentation Order

| Position | Content | Example |
|----------|---------|---------|
| First sentence | Metric or outcome | "155 scripts → 13" |
| Middle | Concrete methodology | "Bounded tasks, quality gates, systematic review" |
| Closing (optional) | Philosophy anchor | "Rooted in design discipline" |

**The Earned Depth Principle**: Philosophy earns its place after outcomes establish credibility.

### Terminology Boundaries

| Context | Lead With | Philosophy Use |
|---------|-----------|----------------|
| LinkedIn/X posts | Outcome, metric, or problem | Brief anchor after proof |
| .agency content | Business value, case study | Name frameworks after demonstrating |
| .io papers | Research question or finding | Full vocabulary |
| .ltd | Philosophy is the content | Unrestricted |

**Reserve for .ltd only**: "Heidegger," "phenomenology," "hermeneutic," "Zuhandenheit," "Vorhandenheit"

---

## Multi-Account Strategy

Three accounts, three purposes. Each recedes into its function.

| Account | Purpose | Content Origin | Voice |
|---------|---------|----------------|-------|
| **CREATE SOMETHING** | Research institution | Papers, methodology, experiments | Evidence-first |
| **WORKWAY** | Methodology in practice | Vertical template, business building | Practical, applied |
| **Personal (Micah)** | Practitioner perspective | Reposts + commentary | Learning alongside |

### Account Guidelines

**CREATE SOMETHING**: Post papers with insights, share experiments, announce findings. Voice: "155 scripts → 13. Here's the systematic approach..."

**WORKWAY**: Share building-in-public updates, show methodology applied. Voice: "We're building..." / "Day 14: Here's what we shipped..."

**Personal**: Repost with context, add practitioner perspective, be transparent about the system. Voice: "I've been working on..." / "Here's what I'm learning..."

### Post Types (Priority Order)

| Priority | Type | Lead With | Primary Account |
|----------|------|-----------|-----------------|
| 1 | Case studies | Metrics, before/after | CREATE SOMETHING |
| 2 | Methodology bites | Concrete steps | CREATE SOMETHING |
| 3 | Anti-patterns | Relatable problems | CREATE SOMETHING |
| 4 | Norvig validation | Earned credibility | CREATE SOMETHING |
| — | Building-in-public | What we shipped/learned | WORKWAY |
| — | Synthesis | Personal context | Personal |

### What NOT to Post

| Content Type | What Serves Readers Better |
|--------------|---------------------------|
| LMS promotional content | Content connecting to partnership thesis |
| Pure aesthetic images | Argument with supporting visuals |
| Scattered updates | Coherent posts serving the whole |
| Daily volume for its own sake | Signal over noise |

### Pre-Post Checklist

1. Does this lead with outcome or insight?
2. Does this serve the unified thesis?
3. Does this earn its existence?
4. Is this the right account?

### Cadence

| Account | Frequency | Focus |
|---------|-----------|-------|
| CREATE SOMETHING | 1-2/week | Papers, experiments, methodology |
| WORKWAY | 1-2/week | Building-in-public |
| Personal | 2-3/week | Reposts with context |

---

## Content Format

```markdown
# LinkedIn Post: Title

**Campaign:** identifier
**Target:** LinkedIn
**Type:** Longform post
**CTA:** url

---

## Post

Your complete post content here. 1500+ characters recommended.

---

## Comment (Post after publishing)

CTA link and hashtags go here. #Hashtag1 #Hashtag2

---

## Voice Compliance

- [x] Claims backed by methodology
- [x] Self-contained (no thread references)
- [x] No marketing jargon
```

---

## API Reference

### Schedule Posts

```bash
curl -X POST https://createsomething.agency/api/social/schedule \
  -H "Content-Type: application/json" \
  -d '{"platform":"linkedin","content":"<markdown>","mode":"longform"}'
```

**Request**: `{ platform, content, mode?: 'longform'|'drip', timezone?, dryRun? }`

### Check Status

```bash
curl https://createsomething.agency/api/social/status
curl https://createsomething.agency/api/social/status?status=pending
```

### Cancel Posts

```bash
curl -X DELETE "https://createsomething.agency/api/social/cancel?id=sp_xxx"
```

## D1 Schema

```sql
CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_for INTEGER NOT NULL,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  status TEXT DEFAULT 'pending',  -- pending|queued|posted|failed|cancelled
  post_id TEXT,
  post_url TEXT,
  error TEXT,
  campaign TEXT,
  created_at INTEGER NOT NULL,
  posted_at INTEGER,
  metadata TEXT
);
```

## Authentication

LinkedIn OAuth at `https://createsomething.io/api/linkedin/auth`. Token stored in KV `SESSIONS`, valid ~60 days.

---

## X (Twitter) Strategy

Discovery platform for AI practitioner community.

### Why X

| Platform | Verdict | Rationale |
|----------|---------|-----------|
| **X** | ✓ Primary | AI community lives here, thread format fits methodology |
| **Medium** | ✗ Skip | SEO better served by createsomething.io |
| **Instagram** | ✗ Skip | Wrong audience |

### X Best Practices

| Factor | Best Practice |
|--------|---------------|
| **Algorithm** | Replies > Retweets > Likes |
| **Threads** | 4-7 tweets |
| **Timing** | 8-10am or 4-6pm local |
| **Images** | 2x engagement |
| **Hashtags** | 1-2 max, or none |

### Multi-Account (X Version)

| Account | Handle | Purpose |
|---------|--------|---------|
| CREATE SOMETHING | @createsmthng | Research threads |
| WORKWAY | @workway_dev | Build logs |
| Personal | existing | Quote tweets + synthesis |

### Thread Templates

**Research Finding Thread:**
```
1/ [Hook: Metric or outcome that surprises]
2/ [Context: What was tried, what worked]
3/ [Finding 1 with specific metric]
4/ [Finding 2 with specific metric]
5/ [Finding 3 with specific metric]
6/ [Methodology: What to do differently]
7/ [CTA: Link + question to invite replies]
```

**Build Log Thread:**
```
1/ [Outcome: What shipped, what broke, specific result]
2/ [The decision I faced]
3/ [What I tried / systematic approach]
4/ [Result: What happened, with numbers]
5/ [What I'd do differently]
```

**Anti-Pattern Thread:**
```
1/ [Relatable problem with specific failure]
2/ Mistake 1: [Description + what happens]
3/ Mistake 2: [Description + what happens]
4/ The alternative: [Concrete approach]
5/ Specific example: [Case study with metrics]
6/ What to do instead: [Actionable steps]
```

### X Pre-Post Checklist

1. Does this invite conversation?
2. Can this stand alone?
3. Does it lead with insight or outcome?
4. Would I reply to this?

### Engagement Strategy

**The 10-reply rule**: Before posting original content each day, leave 10 substantive replies.

**Reply to**: AI development practitioners, automation builders, indie hackers, philosophy of technology discussions.

### X Cadence

| Account | Frequency | Content Mix |
|---------|-----------|-------------|
| @createsmthng | 3-4/week | 1 thread + 2-3 single tweets |
| @workway_dev | 4-5/week | Daily build logs during active dev |
| Personal | 5-7/week | Quote tweets + replies |

### Account Bios

**@createsmthng** (160 char):
```
Research on AI partnership methodology. Less replacement, more collaboration. Papers, experiments, the Subtractive Triad.

createsomething.io
```

**@workway_dev** (160 char):
```
Workflow automation marketplace for TypeScript devs. Build outcomes, not integrations. Open source SDK. By @createsmthng.

workway.co
```

### Quote-Tweet Guidelines

| Do | Don't |
|----|-------|
| Add personal context | Just say "great thread" |
| Share what YOU learned | Repeat the thread's points |
| Be honest about struggles | Pretend it's easy |
| Connect to your experience | Make it abstract |
| Acknowledge good pushback | Get defensive |

### Cross-Platform Flow

```
X (discovery) → LinkedIn (professional) → createsomething.io (depth) → Newsletter (ongoing)
```

### Metrics That Matter

| Metric | Target | Why |
|--------|--------|-----|
| Replies per thread | 10+ | Genuine engagement |
| Profile visits | Growing | Discovery working |
| Follower quality | AI practitioners | Right audience |
| Link clicks | Track via UTM | Interest in depth |

**Ignore**: Raw follower count, impressions without engagement, likes without replies.

---

## Subtractive Triad

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I built this before? | Reuses io's OAuth, shared KV |
| **Rams** | Does this earn existence? | Each post self-contained, 1500+ chars |
| **Heidegger** | Does this serve the whole? | Daily insights enable GTM at scale |

The infrastructure disappears; the content distributes itself.
