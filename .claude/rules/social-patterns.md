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

---

## X (Twitter) Strategy

Discovery platform for the AI practitioner community. Where the "partnership not replacement" conversation lives.

### Why X, Not Medium/Instagram

| Platform | Verdict | Rationale |
|----------|---------|-----------|
| **X** | ✓ Primary | Algorithmic discovery, AI community lives here, thread format fits methodology |
| **Medium** | ✗ Skip | Declining engagement, SEO better served by createsomething.io |
| **Instagram** | ✗ Skip | Visual/lifestyle platform, wrong audience entirely |
| **Facebook** | ✗ Skip | B2C demographic, doesn't serve technical thesis |

**Canon justification**: Each platform must earn its existence. X earns it because the AI development conversation—Claude Code, Cursor, agentic workflows—happens there daily.

### X Best Practices (2025 Research)

| Factor | Best Practice | Notes |
|--------|---------------|-------|
| **Algorithm preference** | Replies > Retweets > Likes | Engagement begets reach |
| **Thread sweet spot** | 4-7 tweets | Long enough for depth, short enough to finish |
| **Optimal timing** | 8-10am or 4-6pm local | Commute/lunch breaks |
| **Image boost** | Posts with images get 2x engagement | Screenshots, diagrams |
| **First hour** | Critical for algorithm pickup | Seed engagement early |
| **Hashtags** | 1-2 max, or none | Overuse signals spam |

### Multi-Account Strategy (X Version)

Same hermeneutic structure as LinkedIn, adapted for X's format:

| Account | Handle (Suggested) | Purpose | Content Style |
|---------|-------------------|---------|---------------|
| **CREATE SOMETHING** | `@createsmthng` | Research threads | Methodological, cites papers |
| **WORKWAY** | `@workway_dev` | Build logs | "Day 12: Here's what broke..." |
| **Personal (Micah)** | existing handle | Quote tweets + synthesis | "This is why I think..." |

### Account-Specific Content

#### @createsmthng (Research)

**Thread format for papers:**
```
1/ New paper: "The Norvig Partnership"

Peter Norvig's Advent of Code 2025 experiments prove something counterintuitive about AI development.

🧵 Thread on the key findings:

2/ Finding 1: 20x speed improvement came from PARTNERSHIP, not replacement.

Norvig didn't ask Claude to solve problems. He solved them WITH Claude.

The difference matters.

3/ Finding 2: The methodology is reproducible.

We've tested the same approach across 47 client projects.

Results: [specific metrics]

4/ Finding 3: Most teams fail because they treat LLMs as tools.

Tools you use. Partners you work with.

The mindset shift changes everything.

5/ Full paper with methodology:
[link to createsomething.io/papers/norvig-partnership]

What's your experience—tool or partner?
```

**Single tweets for quick insights:**
```
The Subtractive Triad:

1. DRY (Implementation) → Eliminate duplication
2. Rams (Artifact) → Eliminate excess
3. Heidegger (System) → Eliminate disconnection

One principle—subtractive revelation—at three scales.

Less, but better.
```

#### @workway_dev (Practice)

**Build log format:**
```
Day 14 of building WORKWAY in public:

Today I applied the Subtractive Triad to our pricing page.

Before: 6 pricing tiers, feature comparison matrix, FAQ accordion
After: 2 tiers, one sentence each

Conversion: TBD but the page feels *honest* now.

Screenshot attached.
```

**Methodology applied:**
```
Just deleted 400 lines of "just in case" code from the template system.

The Canon question: "Does this earn its existence?"

Those 400 lines didn't. They existed because I *might* need them.

Less, but better. Even in code.
```

#### Personal Account (Synthesis)

**Quote tweets with context:**
```
[QT of @createsmthng paper announcement]

I've been working on this methodology for 2 years.

Here's what I've learned: the hardest part isn't the framework. It's unlearning the "AI will do it for me" mindset.

Partnership requires showing up differently.
```

**Webflow-adjacent (careful boundary):**
```
10 years at Webflow taught me one thing about tools:

The best ones disappear.

You don't think about Webflow when you're designing. You think about the design.

That's what we're building with WORKWAY. AI that recedes into the work.
```

### Content Types for X

| Type | Format | Account | Example |
|------|--------|---------|---------|
| **Paper announcement** | 4-7 tweet thread | CREATE SOMETHING | New research + key findings |
| **Methodology bite** | Single tweet | CREATE SOMETHING | One principle, explained simply |
| **Build log** | Single tweet + image | WORKWAY | "Day N: What I learned..." |
| **Hot take** | Single tweet | Personal | Opinionated, invites reply |
| **Quote synthesis** | Quote tweet | Personal | Adding context to others' posts |
| **Reply engagement** | Reply | Any | Substantive responses to AI community |

### The X-Specific Heideggerian Test

Before posting, ask:

1. **Does this invite conversation?** X rewards replies. One-way broadcasts underperform.
2. **Can this stand alone?** Unlike LinkedIn, X posts get seen out of context.
3. **Is this screenshot-worthy?** The best X content gets screenshotted and shared.
4. **Would I reply to this?** If not, why would anyone else?

### Engagement Strategy (Critical for Algorithm)

**Reply to these accounts/topics:**
- AI development practitioners (Claude Code users, Cursor community)
- Automation builders (n8n, Make, Zapier critique)
- Indie hackers building with AI
- Philosophy of technology discussions

**Engagement pattern:**
```
See relevant post → Substantive reply (not "great post!")
                  → If response, continue thread
                  → If really good, quote tweet with synthesis
```

**The 10-reply rule**: Before posting original content each day, leave 10 substantive replies. This warms the algorithm and builds genuine connection.

### Cadence

| Account | Frequency | Content Mix |
|---------|-----------|-------------|
| CREATE SOMETHING | 3-4/week | 1 thread + 2-3 single tweets |
| WORKWAY | 4-5/week | Daily build logs during active development |
| Personal | 5-7/week | Quote tweets + replies + occasional original |

**Total visible activity**: Higher than LinkedIn because X rewards frequency. But each post still serves the thesis.

### Thread Templates

#### Research Finding Thread
```
1/ [Hook: Counterintuitive finding or question]

2/ [Context: Why this matters]

3/ [Finding 1 with specific example]

4/ [Finding 2 with specific example]

5/ [Finding 3 with specific example]

6/ [Implication: What to do differently]

7/ [CTA: Link + question to invite replies]
```

#### Build Log Thread
```
1/ [What I built/broke/learned today]

2/ [The decision I faced]

3/ [How Canon/methodology informed the choice]

4/ [Result: What happened]

5/ [Reflection: What I'd do differently]
```

#### Anti-Pattern Thread
```
1/ Most [X] fails because of [common mistake].

Here's what I've seen across [N] projects:

2/ Mistake 1: [Description]
   Why it fails: [Explanation]

3/ Mistake 2: [Description]
   Why it fails: [Explanation]

4/ The alternative: [Partnership approach]

5/ Specific example: [Case study]

6/ The mindset shift: [Core insight]
```

### What NOT to Post on X

| Content Type | Why Avoid |
|--------------|-----------|
| Threads that are really LinkedIn posts | Different format, different rhythm |
| "🧵 Thread" without immediate value | Hook must be in tweet 1 |
| Promotional without insight | X audience detects and punishes |
| Hot takes without substance | Controversy without contribution |
| Engagement bait ("Reply with X") | Feels manipulative |

### Cross-Platform Flow

```
X (discovery)
    ↓ Thread gets traction
LinkedIn (professional relationship)
    ↓ Deeper engagement
createsomething.io (full depth)
    ↓ Papers, methodology
Newsletter (ongoing relationship)
```

**Each platform serves one purpose:**
- X: "This is interesting, I'll follow"
- LinkedIn: "This person/company is credible"
- Site: "I want to understand deeply"
- Newsletter: "Keep me updated"

### Account Setup

#### @createsmthng

**Bio** (160 char max):
```
Research on AI partnership methodology. Less replacement, more collaboration. Papers, experiments, the Subtractive Triad.

createsomething.io
```

**Pinned Tweet** (thread follows below):
```
The thesis:

AI development works when you treat LLMs as partners, not tools.

Peter Norvig proved it empirically—20x speed improvement through collaboration, not replacement.

We've spent 2 years building the methodology. Here's what we've learned:

🧵
```

---

### The Norvig Partnership Thread (Full)

**Tweet 1 (Hook):**
```
Peter Norvig—author of THE AI textbook, decades at Google—just published his Advent of Code 2025 analysis.

His finding: LLMs made him "maybe 20 times faster."

But the HOW matters more than the number.

Here's what most people miss: 🧵
```

**Tweet 2 (The setup):**
```
Norvig tested three approaches:
• Manual coding (his default for 30 years)
• LLM-first (paste puzzle, get solution)
• Hybrid (LLM assists, human directs)

The hybrid approach won. Not because the LLM did more—because Norvig stayed in the loop.
```

**Tweet 3 (Finding 1: Speed):**
```
Finding 1: "Maybe 20 times faster"

Tasks that took 30-60 minutes manually → 2-3 minutes with LLM assistance.

But here's the thing: Norvig wasn't passive.

He reviewed every solution. Tested it. Provided feedback when it failed.

The speed came from PARTNERSHIP, not delegation.
```

**Tweet 4 (Finding 2: Correctness through correction):**
```
Finding 2: The LLM solved every puzzle.

Not always on the first try.

Day 1 Part 2 failed. Norvig diagnosed the bug, gave feedback. The LLM adjusted. It worked.

This is the key insight:

The tool doesn't need to be perfect. It needs to be CORRECTABLE.
```

**Tweet 5 (What humans retain):**
```
What Norvig retained:
• Problem selection (what to solve)
• Architectural direction (how to approach)
• Error diagnosis (what went wrong)
• Quality judgment (is this good enough?)

What the LLM handled:
• Code generation
• Pattern recall
• Execution speed

Neither replaces the other.
```

**Tweet 6 (The mindset shift):**
```
Norvig's conclusion:

"I should use an LLM as an assistant for all my coding."

Not "as an experiment." Not "for simple tasks."

ALL his coding.

When the author of the canonical AI textbook says this, it's worth paying attention.
```

**Tweet 7 (CTA + question):**
```
We've spent 2 years building methodology around this insight.

Partnership, not replacement. Humans direct, AI executes. Quality gates catch failures early.

Full analysis of Norvig's findings:
createsomething.io/papers/norvig-partnership

What's your experience—tool or partner?
```

---

**Thread notes:**
- Total: 7 tweets
- Hook establishes authority (Norvig) immediately
- Each tweet is self-contained but builds
- Technical audience doesn't need over-explanation
- Ends with question to invite replies
- Link in final tweet (not earlier—X deprioritizes external links)

**Header image**: Monochrome, typography-forward. The Canon aesthetic.

---

#### @workway_dev

**Bio** (160 char max):
```
Workflow automation marketplace for TypeScript devs. Build outcomes, not integrations. Open source SDK. By @createsmthng.

workway.co
```

**Pinned Tweet** (thread follows below):
```
Day 1 of building WORKWAY in public.

A workflow automation marketplace where developers build, publish, and monetize automations.

The philosophy: Users don't want "workflow automation." They want outcomes.

Follow along as we build.

🧵
```

---

### WORKWAY Day 1 Thread (Full)

**Tweet 1 (Hook):**
```
Day 1 of building WORKWAY in public.

We're building a workflow automation marketplace for TypeScript developers.

But here's the thing: we're not building another Zapier clone.

We're building around one insight: Users don't want automations. They want outcomes.

🧵
```

**Tweet 2 (The problem):**
```
The automation space is broken:

• Zapier: 5,000 integrations, $50/mo, still takes hours to set up
• n8n: Powerful, but you're staring at node graphs
• Make: 47 modules for one workflow

Developers build integrations. Users want outcomes.

"My CRM updates itself" > "I connected Salesforce to Gmail via webhook"
```

**Tweet 3 (The philosophy):**
```
Heidegger called it Zuhandenheit—"ready-to-hand."

The best tools disappear. You don't think about the hammer when you're hammering.

Applied to automation:
❌ "I built a workflow that syncs Gmail labels to Notion"
✓ "Label an email, it appears in my CRM"

The automation recedes. The outcome remains.
```

**Tweet 4 (The architecture):**
```
Two layers, one product:

Open source (@workwayco/sdk):
• TypeScript SDK for building integrations
• CLI for local development
• Apache 2.0 licensed

Proprietary (workway.co):
• Marketplace for publishing
• Execution engine (Cloudflare Workers)
• Billing + revenue sharing

Developers build. Users install. Everyone wins.
```

**Tweet 5 (Real example):**
```
First workflow we're shipping: Gmail → Notion

What users see:
"Label an email 'Log to Notion' → it appears in your Interactions database"

What developers build:
OAuth flow, Gmail webhook, Notion API, error handling, retry logic...

Users don't see the plumbing. That's the point.
```

**Tweet 6 (The method):**
```
Every decision filtered through @createsmthng's Subtractive Triad:

1. Have I built this before? → Don't reinvent OAuth
2. Does this earn its existence? → No admin dashboards nobody uses
3. Does this serve the whole? → Every feature serves outcome delivery

Less infrastructure. More outcomes.
```

**Tweet 7 (The invitation):**
```
Why build in public?

Because the automation space needs a different philosophy—not more features.

WORKWAY is the test case. Zuhandenheit applied to workflows.

Open source SDK: github.com/workwayco/workway
Follow the build: @workway_dev

What outcome would you want automated?
```

---

**Thread notes:**
- Total: 7 tweets
- Targets TypeScript developers / automation builders
- Positions against Zapier/n8n/Make (known pain points)
- Zuhandenheit philosophy applied to outcomes
- Shows open source + proprietary split
- Real example (Gmail → Notion) makes it concrete
- Links to @createsmthng for methodology depth
- Ends with question to surface use cases

**Header image**: Terminal screenshot with SDK code, or workflow diagram.

---

#### Personal Account (Micah)

**Bio suggestion** (adapt to existing):
```
Building @createsmthng. 10 years @webflow. Exploring AI partnership, not replacement.

Opinions mine.
```

**Pinned Tweet**:
```
I've been working with AI for 2 years. Here's the mindset shift that changed everything:

Stop asking "what can AI do for me?"
Start asking "what can we do together?"

Tools you use. Partners you work with.

The difference is everything.
```

---

### Personal Account Quote-Tweets

These add personal context to institutional content. The hermeneutic synthesis layer.

#### Quote-Tweet: Norvig Thread

When @createsmthng posts the Norvig Partnership thread:

**Option A (The practitioner lens):**
```
[QT @createsmthng Norvig thread]

I've been saying "partnership not replacement" for 2 years. Easy to dismiss as philosophy.

Then Peter Norvig—THE Peter Norvig—publishes empirical data showing exactly this pattern.

Sometimes the theory just needs validation from the right source.
```

**Option B (The learning frame):**
```
[QT @createsmthng Norvig thread]

What struck me most about Norvig's analysis:

He didn't abandon the LLM when it failed. He gave feedback. It adjusted. They continued.

That's the whole methodology in one interaction.

The tool doesn't need to be perfect. It needs to be correctable.
```

**Option C (The Webflow connection):**
```
[QT @createsmthng Norvig thread]

10 years at Webflow taught me: the best tools disappear.

You don't think about Webflow when designing. You think about the design.

Norvig's finding is the same pattern. The LLM disappeared into the coding. That's when you know it works.
```

---

#### Quote-Tweet: WORKWAY Day 1 Thread

When @workway_dev posts the Day 1 thread:

**Option A (The automation fatigue):**
```
[QT @workway_dev Day 1 thread]

I've built dozens of automations over 10 years.

Every time: "This will save so much time!"
Every time: Hours configuring, debugging, maintaining.

WORKWAY is the bet that the problem isn't the tools—it's the abstraction layer.

Outcomes, not integrations.
```

**Option B (The philosophy connection):**
```
[QT @workway_dev Day 1 thread]

Zuhandenheit sounds academic until you've used a tool that just works.

You don't think about it. You think about what you're doing.

That's what automation should feel like. Not "I set up a Zap." Just... it happens.

WORKWAY is the attempt to build that.
```

**Option C (The developer angle):**
```
[QT @workway_dev Day 1 thread]

For developers who've built integrations:

You know how much work goes into OAuth, webhooks, error handling, retries...

Users shouldn't have to understand any of that.

WORKWAY lets developers do what they're good at. Users get outcomes.
```

**Option D (The honest struggle):**
```
[QT @workway_dev Day 1 thread]

The temptation with automation platforms: add more integrations.

"We support 5,000 apps!"

But that's not the problem. The problem is the 4 hours you spend connecting 3 of them.

WORKWAY is betting on depth over breadth. Outcomes over integrations.

Let's see if it works.
```

---

#### Quote-Tweet: When Someone Engages

When a thread gets meaningful engagement, amplify with personal context:

**On agreement:**
```
[QT of reply agreeing with thesis]

This is exactly it.

The shift from "AI will do this for me" to "AI will do this with me" sounds subtle.

In practice, it changes everything about how you work.
```

**On skepticism:**
```
[QT of skeptical reply]

Fair pushback.

The Norvig data is one data point. But it's a significant one—he's not selling anything, he's just documenting what worked.

I've seen the same pattern across 40+ client projects. Partnership outperforms delegation.
```

**On questions:**
```
[QT of question about methodology]

Good question. The short answer:

[concise response]

Longer answer in the paper: [link]

But honestly, the best way to understand is to try it. The methodology becomes intuitive after a few cycles.
```

---

### Quote-Tweet Guidelines

| Do | Don't |
|----|-------|
| Add personal context | Just say "great thread" |
| Share what YOU learned | Repeat the thread's points |
| Be honest about struggles | Pretend it's easy |
| Connect to your experience | Make it abstract |
| Acknowledge good pushback | Get defensive |

**Voice check**: Every quote-tweet should sound like it's from a practitioner learning alongside the audience, not a founder promoting their company.

**Transparency rule**: If asked about the multi-account strategy, be open:
```
"Yes, I run @createsmthng and @workway_dev. Each serves a different purpose.

CREATE SOMETHING: research and methodology
WORKWAY: practice and application
This account: synthesis and personal context

Clearer than mixing everything in one feed."
```

---

### Launch Sequence

**Week 1: Establish presence**
- Create @createsmthng and @workway_dev accounts
- Set bios and pinned tweets per above
- Header images: Canon-aligned (monochrome, typography-forward)
- Follow 50-100 relevant accounts
- Leave 10 substantive replies/day

**Week 2-3: Build rhythm**
- First research thread (Norvig paper)
- First build log (WORKWAY day 1)
- Personal account starts quote-tweeting
- Continue reply engagement

**Week 4+: Steady state**
- Cadence established
- Threads when genuinely new insight exists
- Build logs during active development
- Personal synthesis ongoing

### Metrics That Matter

| Metric | Target | Why |
|--------|--------|-----|
| Replies per thread | 10+ | Indicates genuine engagement |
| Profile visits | Growing | Discovery is working |
| Follower quality | AI practitioners | Right audience, not vanity |
| Link clicks | Track via UTM | Actual interest in depth |

**Metrics that don't matter:**
- Raw follower count (vanity)
- Impressions without engagement (empty reach)
- Likes without replies (passive consumption)

### Subtractive Triad (X Application)

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Am I repeating myself? | Each thread offers NEW insight |
| **Rams** | Does this tweet earn existence? | No filler, no engagement bait |
| **Heidegger** | Does this serve the whole? | Every post connects to partnership thesis |

The feed should feel like a coherent body of work, not scattered thoughts.
