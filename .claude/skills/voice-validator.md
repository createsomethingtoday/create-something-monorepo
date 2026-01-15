---
name: voice-validator
description: Validate content against CREATE SOMETHING's Five Principles of Communication
category: quality-assurance
triggers:
  - "*.md publish"
  - "content review"
  - "before deployment"
related:
  - canon-maintenance
  - experiment-scaffold
  - voice-audit-worker
composable: true
priority: P0
---

# Voice Validator

Validate content against CREATE SOMETHING's Five Principles of Communication.

## Philosophy

**"Clarity over cleverness. Specificity over generality."**

The voice is isomorphic to the principles—form matches content. Write like the masters wrote: declarative, empirical, compressed.

## The Five Principles

### 1. Clarity Over Cleverness

Code is read 10x more than written. Writing is read 100x more than written. **Serve the reader.**

**Check for**:
- Jargon that excludes
- Clever wordplay that obscures
- Complex sentence structures
- Passive voice hiding agency

**Example**:
```
❌ "Significantly improved development velocity through AI-native paradigms"
✅ "Built in 6 hours vs 15-20 hours estimated (60-70% savings)"
```

### 2. Specificity Over Generality

Every claim must be measurable. Vagueness is dishonest.

**Check for**:
- Numbers missing where they should exist
- Relative terms without baselines ("faster", "better", "improved")
- Claims without evidence

**Example**:
```
❌ "Saved significant time"
✅ "26 hours actual vs 120 estimated (78% savings)"
```

### 3. Honesty Over Polish

Document failures alongside successes. Acknowledge limitations transparently.

**Required sections** (for experiments/papers):
- "What This Proves"
- "What This Doesn't Prove"
- "Where User Intervention Was Needed"
- "Limitations"

**Check for**:
- Cherry-picked results
- Glossed-over failures
- Missing limitation acknowledgments

### 4. Useful Over Interesting

Not "interesting" or "novel"—**useful**. Can readers implement this?

**Check for**:
- Actionable takeaways
- Clear prerequisites
- Reproducibility information
- Implementation guidance

**Required** (for experiments):
- Starting prompts
- Expected challenges
- Prerequisites checklist

### 5. Grounded Over Trendy

Connect technical decisions to timeless principles. Use patterns that withstand technological change.

**Check for**:
- Master/principle citations when relevant
- Connection to canonical foundations
- Timeless vocabulary over buzzwords

## Forbidden Patterns

### Marketing Jargon (Never Use)

```
Cutting-edge       Revolutionary      Game-changing
AI-powered         Leverage           Synergy
Solutions          Best-in-class      Disruptive
Next-generation    Scalable           Innovative (as adjective)
```

### Vague Claims (Always Replace)

| Forbidden | Required |
|-----------|----------|
| "Significantly improved performance" | "Reduced load time from 3.2s to 0.8s (75%)" |
| "Many users benefited" | "47 active users across 12 organizations" |
| "Much faster development" | "6 hours vs 20 hours estimated (70% savings)" |
| "Works great" | "Passes 47/47 test cases, handles 1000 req/s" |

### Decoration (Remove)

- Emoji (except terminal aesthetic: ✅/❌)
- Stock photos for visual interest
- Color accents for "brand personality"
- Flourishes that don't inform

## Preferred Terminology

### AI Development
| Use | Don't Use |
|-----|-----------|
| AI-native development | AI-assisted, AI-powered |
| Agentic systems | AI agents (generic) |
| Claude Code (specific) | AI tools (vague) |
| Development partners | AI helpers |

### Research
| Use | Don't Use |
|-----|-----------|
| Experiments | Projects, case studies |
| Papers | Blog posts, articles |
| Tracked experiments | Documented work |
| Reproducible results | Proven results |
| Rigorous methodology | Best practices |

### Quality
| Use | Don't Use |
|-----|-----------|
| Production-ready | Functional |
| Business-critical | Important |
| Systems thinking | Holistic approach |
| Canonical standards | Best practices |

### Philosophy
| Use | Don't Use |
|-----|-----------|
| "Less, but better" | Minimalist |
| Modes of Being | Properties, websites |
| The Canon (capitalized) | Standards document |
| Masters | Influences, inspirations |

## Sentence Patterns

### Embrace
- **Short declarative**: "This isn't minimalism for aesthetics. It's discipline for clarity."
- **Paired constructions**: "Not blog posts about AI, but real data from building real systems."
- **Em-dashes for emphasis**: "Built in 6 hours — 65% faster than manual development."
- **Interrogative probes**: "Is my design good design?" / "What must remain?"

### Avoid
- Long compound sentences with multiple clauses
- Hedging language ("might", "could potentially", "it seems")
- Passive constructions hiding agency
- Exclamation points for emphasis

## Required Elements for Experiments

Every experiment must include:

```
✓ ASCII Art Header with metrics
✓ Hypothesis → Validation structure
✓ Success Criteria with ✅/❌ outcomes
✓ Metrics Table (time, cost, savings, ROI)
✓ Honest Assessment section
✓ "Where Intervention Was Needed"
✓ Reproducibility: prerequisites, starting prompts, expected challenges
✓ Master Citation connecting to canonical principles
✓ Hypothesis Outcome: ✅ VALIDATED or ❌ INVALIDATED
```

## Validation Workflow

### Pass 1: Forbidden Pattern Scan

Search for marketing jargon and vague claims. Flag all instances.

### Pass 2: Specificity Audit

For each claim:
1. Is there a number?
2. Is there a baseline for comparison?
3. Is it verifiable?

### Pass 3: Honesty Check

- Are failures documented?
- Are limitations acknowledged?
- Is intervention documented?

### Pass 4: Utility Test

- Can a reader implement this?
- Are prerequisites listed?
- Is it reproducible?

### Pass 5: Grounding Verification

- Is a master/principle cited when relevant?
- Does vocabulary avoid trends?
- Will this read well in 5 years?

## Pre-Publish Checklist

- [ ] All claims backed by specific metrics?
- [ ] Time/cost comparisons included?
- [ ] Methodology transparent?
- [ ] Failures documented?
- [ ] Limitations acknowledged?
- [ ] Reproducible by others?
- [ ] Solves a real problem?
- [ ] Readers can implement?
- [ ] Prerequisites clear?
- [ ] Master/principle cited when relevant?
- [ ] Connected to the canon?
- [ ] No marketing jargon?
- [ ] Direct, declarative sentences?
- [ ] Specific over vague?

## The Masters' Voice

Match form to content. Write like they wrote:

| Master | Style | Example |
|--------|-------|---------|
| **Dieter Rams** | Declarative principles, no fluff, compressed | "Good design is as little design as possible." |
| **Mies van der Rohe** | Aphoristic, architectural, essential | "Less is more." / "God is in the details." |
| **Edward Tufte** | Empirical + visual proof, high data density | "Above all else show the data." |
| **Charles & Ray Eames** | Functional elegance, reader-serving | "The best for the most for the least." |

## When to Use

- **Before publishing** any experiment, paper, or documentation
- **During writing** to maintain voice discipline
- **When reviewing** content from others
- **When editing** existing content for voice consistency

## Integration

This skill connects to:
- `canon-maintenance` — Philosophical integrity
- `experiment-scaffold` — Generates structure with required elements
- `technical-report-writing` — Formal paper generation

## Reference

- `.ltd/voice` — Full voice guidelines
- `.ltd/ethos` — Application methodology
