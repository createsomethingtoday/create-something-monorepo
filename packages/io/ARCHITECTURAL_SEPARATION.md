# Architectural Separation: .io vs SPACE
## The Library vs The Laboratory

**Date:** November 2025
**Status:** ✅ Implemented
**Philosophy:** Heidegger's Hermeneutic Circle Applied to Software Architecture

---

## Executive Summary

We've implemented a **clear ontological separation** between two distinct platforms:

| Platform | Purpose | Being-as | Primary Function |
|----------|---------|----------|------------------|
| **createsomething.io** | Research Library | Document | **Read & Learn** |
| **createsomething.space** | Interactive Lab | Experience | **Do & Build** |

This separation creates a **productive hermeneutic cycle** where users oscillate between theory (reading) and practice (doing), deepening understanding through the interplay.

---

## The Architecture

### **createsomething.io** — The Canonical Research Platform

**Location:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-svelte`

**Purpose:**
- Authoritative source of research papers
- Deep-dive reading experience
- SEO-optimized for discovery
- Comprehensive methodology & findings

**What Users Find:**
```
/experiments/cloudflare-kv-quick-start
├── Full research paper (comprehensive)
├── Complete methodology
├── Analysis & conclusions
├── Prerequisites & context
├── Banner CTA → "Try This on SPACE"
└── Sticky floating CTA (appears on scroll)
```

**Key Components:**
- `ArticleContent.svelte` — Full markdown/HTML rendering
- `InteractiveExperimentCTA.svelte` — Banner CTA at top
- `StickyCTA.svelte` — Floating CTA on scroll
- Full paper content remains the focus

**User Experience:**
1. Discover paper (SEO, social sharing)
2. Read comprehensive content
3. See prominent CTAs to try hands-on
4. Click to launch experiment on SPACE
5. Return to continue deep reading

---

### **createsomething.space** — The Interactive Laboratory

**Location:** `/Users/micahjohnson/Documents/Github/Create Something/create-something-space-svelte`

**Purpose:**
- Hands-on experimentation
- Real-time execution
- Learning by doing
- Metrics & completion tracking

**What Users Find:**
```
/experiments/cloudflare-kv-quick-start
├── Brief summary (2-3 paragraphs)
├── Prerequisites
├── Expected outcome
├── Link → "Read Full Paper on .io"
├── ⚡ MAIN FOCUS: Interactive Runtime ⚡
└── Terminal / Code Editor experience
```

**Key Components:**
- `ExperimentSummary.svelte` — Brief context only
- `ExperimentRuntime.svelte` — Terminal-based experiments
- `ExperimentCodeEditor.svelte` — Code lesson experiments
- Metrics tracking in `experiment_executions` table

**User Experience:**
1. Arrive from .io CTA link
2. See brief context summary
3. Launch interactive terminal/editor
4. Complete hands-on experiment
5. Link back to .io for deeper understanding

---

## The Hermeneutic Cycle

### Part → Whole → Part (Understanding Through Oscillation)

```
┌─────────────────────────────────────────────────────────────┐
│                    THE LEARNING CYCLE                       │
└─────────────────────────────────────────────────────────────┘

1. READ on .io
   "I understand the concept theoretically"
   ↓
2. TRY on SPACE
   "Wait, this is harder than I thought..."
   ↓
3. RETURN to .io
   "Ah! Now I see why they mentioned X"
   ↓
4. TRY AGAIN on SPACE
   "Got it! This makes sense now"
   ↓
5. DEEPER READING on .io
   "Let me understand the implications..."
```

This oscillation creates **deeper understanding** than either platform alone could provide.

---

## Implementation Details

### Files Created/Modified

#### On createsomething.io (create-something-svelte):

**NEW FILES:**
1. `src/lib/components/InteractiveExperimentCTA.svelte`
   - Banner CTA shown at top of article content
   - 3 variants: default, banner, compact

2. `src/lib/components/StickyCTA.svelte`
   - Floating sticky CTA on scroll
   - Minimizable
   - Appears after scrolling 400px

**MODIFIED FILES:**
1. `src/lib/components/ArticleContent.svelte`
   - Added InteractiveExperimentCTA at top
   - Shows when `paper.interactive_demo_url` exists

2. `src/routes/experiments/[slug]/+page.svelte`
   - Added StickyCTA import
   - Renders sticky CTA when `hasInteractive`

#### On createsomething.space (create-something-space-svelte):

**NEW FILES:**
1. `src/lib/components/ExperimentSummary.svelte`
   - Brief context (2-3 paragraphs)
   - Prerequisites display
   - Expected outcome
   - Prominent link back to .io

**MODIFIED FILES:**
1. `src/routes/experiments/[slug]/+page.svelte`
   - Replaced `ArticleContent` with `ExperimentSummary`
   - Removed ShareButtons sidebar (not needed for experiments)
   - Focus on ExperimentRuntime/ExperimentCodeEditor

---

## Database Design

Both platforms share the **same D1 database** but use different fields:

```sql
CREATE TABLE papers (
  -- Used by BOTH:
  id TEXT PRIMARY KEY,
  title TEXT,
  slug TEXT UNIQUE,
  category TEXT,

  -- Used by .io (reading):
  content TEXT,              -- Full markdown content
  html_content TEXT,         -- Rendered HTML
  excerpt_long TEXT,         -- Long description
  reading_time INTEGER,      -- Reading time estimate

  -- Used by SPACE (doing):
  is_executable INTEGER,     -- Flag for interactive
  terminal_commands TEXT,    -- JSON: terminal steps
  code_lessons TEXT,         -- JSON: code exercises
  setup_instructions TEXT,   -- What you'll learn
  expected_output TEXT,      -- What success looks like

  -- Linking between platforms:
  interactive_demo_url TEXT, -- Link from .io → SPACE

  -- Pathways to Mastery:
  pathway TEXT,              -- ID of the pathway (e.g., 'automation-mastery')
  "order" INTEGER            -- Position in the pathway
);
```

### The Key Field: `interactive_demo_url`

This field creates the **hermeneutic bridge**:

```sql
UPDATE papers
SET interactive_demo_url = 'https://createsomething.space/experiments/cloudflare-kv-quick-start'
WHERE slug = 'cloudflare-kv-quick-start';
```

When set:
- ✅ .io shows banner CTA + sticky CTA
- ✅ SPACE shows link back to .io
- ✅ Clear user journey between platforms

---

## User Journey Mapping

### Scenario 1: Discovery via .io

```
1. Google search → lands on createsomething.io/experiments/...
2. Reads full paper, sees banner CTA
3. Scrolls down, sticky CTA appears
4. Clicks "Launch on SPACE"
5. New tab opens → SPACE experiment
6. Completes hands-on exercise
7. Clicks "Read Full Paper" → back to .io
8. Finishes reading with deeper understanding
```

### Scenario 2: Direct to SPACE

```
1. Social media link → createsomething.space/experiments/...
2. Sees brief summary + "Read Full Paper on .io"
3. Jumps into hands-on terminal
4. Gets stuck at step 3
5. Clicks "Read Full Paper" → .io
6. Finds detailed explanation of the concept
7. Returns to SPACE, completes experiment
```

### Scenario 3: Returning User

```
1. Bookmark on .io → reads new paper
2. Sees sticky CTA (already familiar)
3. One-click to SPACE
4. Completes experiment
5. Browser back button → returns to .io
6. Continues reading related sections
```

---

## Benefits of This Architecture

### 1. Clear Separation of Concerns

**createsomething.io optimizes for:**
- ✅ SEO (canonical URLs, rich metadata)
- ✅ Reading (typography, layout, focus)
- ✅ Shareability (Open Graph, Twitter cards)
- ✅ Authority (comprehensive, well-researched)
- ✅ Discovery (categories, search, browse)

**createsomething.space optimizes for:**
- ✅ Runtime performance (fast terminal)
- ✅ Interactivity (real-time feedback)
- ✅ Completion (step-by-step guidance)
- ✅ Low friction (no setup required)
- ✅ Metrics (execution tracking)

### 2. No Content Duplication

- .io has FULL content (authoritative)
- SPACE has SUMMARY only (contextual)
- No conflicts, clear single source of truth

### 3. Platform-Specific Features

**.io can add:**
- Author bios
- Citation export
- Print-friendly view
- RSS feeds
- Academic references

**SPACE can add:**
- Live collaboration
- Community variations
- Leaderboards
- Achievement badges
- Experiment forking

### 4. Optimized for Purpose

Each platform does **one thing excellently** rather than trying to be everything.

---

## Testing Checklist

### On createsomething.io:

- [ ] Banner CTA appears when `interactive_demo_url` is set
- [ ] Banner CTA does NOT appear when URL is null/empty
- [ ] Sticky CTA appears after scrolling 400px
- [ ] Sticky CTA minimizes/expands correctly
- [ ] Sticky CTA links to correct SPACE URL
- [ ] Clicking CTA opens SPACE in new tab
- [ ] Full article content displays correctly
- [ ] Reading experience is not disrupted

### On createsomething.space:

- [ ] ExperimentSummary shows brief context
- [ ] "Read Full Paper on .io" link works
- [ ] Link opens .io in new tab
- [ ] ExperimentRuntime displays for terminal experiments
- [ ] ExperimentCodeEditor displays for code experiments
- [ ] No full article content is shown
- [ ] Focus is entirely on interactive experience

### Cross-Platform:

- [ ] URLs match (same slug on both platforms)
- [ ] Database query returns `interactive_demo_url`
- [ ] Bi-directional linking works both ways
- [ ] User journey is smooth and intuitive
- [ ] No broken links or 404s

---

## Deployment Instructions

### 1. Update Database

Set `interactive_demo_url` for papers with interactive versions:

```bash
# Using Wrangler CLI
npx wrangler d1 execute create-something-db --command="
  UPDATE papers
  SET interactive_demo_url = 'https://createsomething.space/experiments/cloudflare-kv-quick-start'
  WHERE slug = 'cloudflare-kv-quick-start';
"
```

### 2. Deploy .io

```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-svelte
git add .
git commit -m "feat: add clear architectural separation with SPACE"
npm run deploy
```

### 3. Deploy SPACE

```bash
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-space-svelte
git add .
git commit -m "feat: focus on interactive experience, link to .io for full content"
npm run deploy
```

### 4. Verify

- Visit .io experiment page → verify CTA appears
- Click CTA → verify opens SPACE
- On SPACE → verify "Read Full Paper" link
- Click link → verify returns to .io

---

## Future Enhancements

### 1. Smart Recommendations

Track which experiments users complete on SPACE, recommend related papers on .io.

### 2. Progress Sync

If user is logged in on both platforms, sync completion status.

### 3. Cross-Platform Analytics

```sql
-- Papers that drive most SPACE experiments
SELECT
  p.title,
  p.slug,
  COUNT(e.id) as space_attempts,
  SUM(e.completed) as completions,
  (SUM(e.completed) * 100.0 / COUNT(e.id)) as completion_rate
FROM papers p
JOIN experiment_executions e ON p.id = e.paper_id
GROUP BY p.id
ORDER BY space_attempts DESC;
```

### 4. A/B Testing CTAs

Test different CTA copy, placement, styling to optimize click-through rates.

### 5. Paper Quality Signals

Low completion rates on SPACE indicate paper needs better explanation on .io.

---

## Philosophy: Why This Matters

From our Heideggerian analysis:

> "The meaning of interactive experiments emerges through their relational context within the whole ecosystem. They are not merely 'code examples' (parts in isolation) but **participatory research instruments** (parts understood through the whole)."

The separation creates:

1. **Distinct Modes of Being**
   - Being-as-Document (.io)
   - Being-as-Experience (SPACE)

2. **Hermeneutic Understanding**
   - Theory illuminates practice
   - Practice reveals gaps in theory
   - Oscillation deepens comprehension

3. **Productive Tension**
   - Reading without doing = incomplete
   - Doing without reading = shallow
   - Together = mastery

---

## Summary

We've created two platforms that are:

- **Architecturally distinct** (different purposes)
- **Tightly integrated** (shared database)
- **Mutually reinforcing** (each enhances the other)
- **User-centric** (smooth journey between them)

The result is a **research ecosystem** where:
- .io is the authoritative source of knowledge
- SPACE is the laboratory for application
- Users gain deeper understanding through the interplay

---

**Status:** ✅ Ready for Production
**Next Steps:** Database updates → Deploy → User testing
**Success Metric:** Increased experiment completion rates + return visits to .io
