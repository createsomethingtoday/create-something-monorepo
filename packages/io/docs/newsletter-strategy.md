# Newsletter Content Strategy

Content strategy for the CREATE SOMETHING newsletter. This document defines what we send, when, why, and how—aligned with the Voice guidelines at [createsomething.ltd/voice](https://createsomething.ltd/voice).

**Philosophy**: "Weniger, aber besser" — Fewer emails, but genuinely valuable ones.

---

## Content Pillars

The newsletter exists to share validated experiments and reproducible results. Not thought leadership. Not tips and tricks. Documented work.

### 1. Experiment Reports

What we built, what we measured, what we learned.

**Required elements**:
- Hypothesis stated upfront
- Time/cost metrics with comparisons
- What This Proves / What This Doesn't Prove
- Reproducibility notes

**Example subject**: "26 hours vs 120 estimated: Gmail-to-Notion sync agent results"

### 2. Pattern Documentation

Canonical patterns extracted from production work.

**Required elements**:
- Problem statement with specifics
- Solution with code examples
- Where it fails (limitations)
- Master citation where applicable

**Example subject**: "Pattern: AbortController cleanup in agentic systems"

### 3. Tool Announcements

New releases from the component library or agent library.

**Required elements**:
- What it does (one sentence)
- Installation instructions
- Usage example
- Breaking changes (if applicable)

**Example subject**: "@create-something/tufte v0.3.0: Sparklines component"

### 4. Canon Updates

Philosophical refinements and methodology changes.

**Required elements**:
- What changed
- Why it changed (validation through practice)
- Impact on existing work

**Example subject**: "Canon update: Progressive disclosure in educational content"

---

## Cadence

No fixed schedule. Content ships when validated.

| Constraint | Rationale |
|------------|-----------|
| Maximum 2 emails/month | Respect subscriber attention |
| Minimum 1 email/quarter | Maintain relationship |
| No "just checking in" | Every email must provide value |

**Exception**: Critical updates (security, breaking changes) send immediately.

---

## Voice Guidelines

All newsletter content follows the [Voice](https://createsomething.ltd/voice) standards. Summary for quick reference:

### Five Principles Applied to Email

1. **Clarity Over Cleverness**
   - Subject lines state what's inside
   - No clickbait, no curiosity gaps
   - First paragraph summarizes the email

2. **Specificity Over Generality**
   - Include metrics: "Built in 6 hours vs 15-20 estimated"
   - Name specific tools: "Claude Code" not "AI"
   - Reference exact versions

3. **Honesty Over Polish**
   - Document failures alongside successes
   - Acknowledge limitations
   - "What This Doesn't Prove" is mandatory

4. **Useful Over Interesting**
   - Every email answers: Can the reader do something with this?
   - Include prerequisites
   - Link to full documentation

5. **Grounded Over Trendy**
   - Connect to canonical principles
   - Cite masters where relevant
   - Avoid hype language

### Forbidden Language

Never use in email copy:

| Forbidden | Why |
|-----------|-----|
| "Exciting news" | Editorializing |
| "Game-changing" | Marketing jargon |
| "Quick update" | Implies low value |
| "Don't miss" | Creates artificial urgency |
| "Just wanted to..." | Passive, apologetic |
| "Significantly improved" | Vague; use metrics |
| "AI-powered" | Use "AI-native" or specific tool |

### Preferred Terminology

| Use | Instead of |
|-----|------------|
| Experiments | Projects |
| Papers | Blog posts |
| AI-native development | AI-powered |
| Agentic systems | AI agents |
| Production-ready | Working |
| Canonical standards | Best practices |

---

## Template Structure

### Welcome Email (on subscription confirmation)

```
Subject: Welcome to CREATE SOMETHING

---

"Weniger, aber besser."

Less, but better. This guides everything we build.

You'll receive occasional updates on experiments in AI-native development—what works, what doesn't, why it matters.

[Read the Ethos →]

---

CREATE SOMETHING
[Unsubscribe]
```

### Experiment Report Email

```
Subject: [Experiment title with key metric]

---

## Summary

[1-2 sentences: What we built, primary outcome]

## Key Metrics

| Metric | Value |
|--------|-------|
| Development time | X hours (vs Y estimated) |
| [Other metric] | [Value] |

## What This Proves

[2-3 bullet points]

## What This Doesn't Prove

[1-2 bullet points]

[Read the full experiment →]

---

CREATE SOMETHING
[Unsubscribe]
```

### Tool Release Email

```
Subject: [Package name] [version]: [Primary feature]

---

## What's New

[1 sentence description]

## Installation

```bash
pnpm add [package]@[version]
```

## Usage

[Minimal code example]

## Breaking Changes

[List if any, or "None"]

[Full changelog →]

---

CREATE SOMETHING
[Unsubscribe]
```

### Canon Update Email

```
Subject: Canon update: [Change summary]

---

## What Changed

[Specific description of change]

## Why

[Validation evidence: experiment results, user feedback, pattern observation]

## Impact

[What subscribers should do differently, if anything]

[Read the updated canon →]

---

CREATE SOMETHING
[Unsubscribe]
```

---

## Anti-Patterns

### Content Anti-Patterns

| Anti-Pattern | Problem | Alternative |
|--------------|---------|-------------|
| "Newsletter roundup" | Low-value aggregation | Single-topic depth |
| Sending before validation | Speculation vs evidence | Wait for results |
| Vague preview text | Doesn't respect reader time | Specific summary |
| Multiple CTAs | Diffuses attention | One primary action |
| External links only | No original value | Add synthesis |

### Subject Line Anti-Patterns

| Anti-Pattern | Example | Problem |
|--------------|---------|---------|
| Curiosity gaps | "You won't believe..." | Manipulative |
| Vague descriptors | "Big announcement" | No information |
| ALL CAPS emphasis | "IMPORTANT UPDATE" | Shouting |
| Emoji overuse | "New release!" | Decoration |
| Personal urgency | "I wanted to share..." | Self-centered |

### Design Anti-Patterns

| Anti-Pattern | Problem |
|--------------|---------|
| Hero images | Decoration without function |
| Gradient backgrounds | Violates Canon minimalism |
| Multiple font families | Visual noise |
| Color for "brand personality" | Fails Rams Principle 5 |
| Tracking pixels for vanity metrics | Violates subscriber trust |

---

## Technical Implementation

### Email Styling

Emails use Canon tokens inline (email clients strip `<style>` tags):

```html
<body style="
  background-color: #000000;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
```

| Element | Style |
|---------|-------|
| Background | `#000000` (`--color-bg-pure`) |
| Text primary | `#ffffff` (`--color-fg-primary`) |
| Text secondary | `rgba(255,255,255,0.7)` (`--color-fg-secondary`) |
| Text muted | `rgba(255,255,255,0.46)` (`--color-fg-muted`) |
| Links | `#ffffff` with underline |
| Border | `rgba(255,255,255,0.1)` (`--color-border-default`) |

### Required Footer Elements

Every email must include:

1. **Sender identity**: "CREATE SOMETHING"
2. **Unsubscribe link**: `https://createsomething.io/unsubscribe?token=[token]`
3. **No physical address** (not required for non-commercial, informational newsletters in most jurisdictions)

### Segmentation

| Segment | Criteria | Use |
|---------|----------|-----|
| `source:space` | Signed up from .space | Practice-focused content |
| `source:io` | Signed up from .io | Research-focused content |
| `source:agency` | Signed up from .agency | Service-focused content |
| `confirmed:true` | Completed double opt-in | All sends |

---

## Metrics That Matter

### Track

| Metric | Why |
|--------|-----|
| Unsubscribe rate | Quality signal |
| Click rate on primary CTA | Content relevance |
| Reply rate | Engagement depth |

### Ignore

| Metric | Why |
|--------|-----|
| Open rate | Unreliable (privacy features) |
| Total subscribers | Vanity metric |
| Growth rate | Irrelevant to value delivery |

---

## Pre-Send Checklist

Before every send:

```
[ ] Subject line states specific content
[ ] First paragraph summarizes the email
[ ] All claims have metrics
[ ] "What This Doesn't Prove" included (if applicable)
[ ] No forbidden language (grep for patterns)
[ ] Single primary CTA
[ ] Unsubscribe link present
[ ] Test email renders correctly in dark mode
[ ] Sent to self first
```

---

## Hermeneutic Test

Every newsletter must pass:

1. **Does this part reveal the whole?**
   Can someone read this email and understand what CREATE SOMETHING stands for?

2. **Does the whole explain this part?**
   Can you trace this content to a canonical principle?

3. **Does this strengthen the circle?**
   Does it validate or evolve the methodology?

If any answer is "no," revise or delay sending.

---

*This strategy evolves through the hermeneutic circle—validated by subscriber feedback and content performance, not marketing trends.*
