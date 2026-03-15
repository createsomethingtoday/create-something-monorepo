# Paper & Experiment Content Requirements

Quality gate standards for CREATE SOMETHING research papers and experiments.

## Why This Exists

Generated papers were sparse (164 lines) compared to exemplary papers (700-1000+ lines). This document defines both the structural requirements AND the narrative patterns that make papers "nicely said" - clear, comprehensive, and useful.

---

## The "Nicely Said" Narrative Requirements

**Structure is not content.** A paper with all the right sections can still be sparse and unhelpful. "Nicely said" papers tell a story.

### The Narrative Arc

Every paper follows this story structure:

```
HOOK → CONTEXT → PROBLEM → APPROACH → FINDINGS → IMPLICATIONS → LIMITATIONS
```

| Story Beat | Content | Example |
|------------|---------|---------|
| **Hook** | Opening insight that earns attention | "155 scripts → 13. Same functionality." |
| **Context** | What the reader needs to understand | "Kickstand monitors venues for artist data..." |
| **Problem** | The tension that drives the paper | "Each migration left artifacts behind..." |
| **Approach** | How we addressed it | "Applied the Subtractive Triad framework..." |
| **Findings** | What we discovered | "92% reduction in scripts, 0 TypeScript errors" |
| **Implications** | Why it matters | "Validates the framework for production audits" |
| **Limitations** | What we didn't cover | "Only tested on one system..." |

### Section-Level Storytelling

Each major section follows its own mini-arc:

```
QUESTION → FINDING → EVIDENCE → ACTION → OUTCOME
```

**Example from Kickstand paper:**

```markdown
## 4. Level 2: Rams (Artifact) — Remove

**Question (callout box):**
> "Does this earn its existence?"
> Score: 6/10 — Significant excess found

**Finding (problem statement):**
155 JavaScript files in the scripts directory, with only ~20 actively needed.

**Evidence (before/after cards):**
Before: 155 scripts, 35 archived, ~70 obsolete...
After: 13 active, 153 archived, organized into categories...

**Action (what we did):**
- Moved 153 scripts to organized archive directories
- Created archive README documenting restoration

**Outcome (implied in metrics):**
92% reduction in active scripts
```

### The Before/After Pattern

Transform abstract claims into concrete comparisons:

| Vague (Don't) | Specific (Do) |
|---------------|---------------|
| "Significantly reduced code" | "1,594 lines → 644 lines (60% reduction)" |
| "Improved system health" | "Health score: 6.2 → 9.2 (48% improvement)" |
| "Removed unnecessary files" | "155 scripts → 13 active (92% reduction)" |
| "Fixed many errors" | "30 TypeScript errors → 0" |

### Content Density Guidelines

Each section needs **substance**, not just structure:

| Section Type | Minimum Content |
|--------------|-----------------|
| Introduction | 2-3 paragraphs explaining context and stakes |
| Methodology | Numbered steps OR table showing approach |
| Findings | Data table + before/after cards + specific metrics |
| Discussion | 2-3 paragraphs interpreting what findings mean |
| Limitations | 3-5 specific bullet points of what wasn't covered |

### The "What We Did" Pattern

Every findings section needs an action component:

```markdown
### What We Did
- [Concrete action 1 with specific detail]
- [Concrete action 2 with file paths or commands]
- [Concrete action 3 with measurable result]
```

**Example:**
```markdown
### What We Did
- Marked Node.js services with `@deprecated` notices
- Fixed 30 TypeScript errors in Workers implementation
- Updated Cloudflare Workflow API usage (`event.payload` not `event.params`)
- Added proper type annotations throughout
```

### Voice Requirements

Papers must follow Voice Canon:

| Principle | Application |
|-----------|-------------|
| **Clarity Over Cleverness** | Lead with outcomes, explain as you go |
| **Specificity Over Generality** | Every claim has a number or file path |
| **Honesty Over Polish** | Include what didn't work in Limitations |
| **Useful Over Interesting** | Show actual code, commands, file paths |

### Transformation Examples

**Before (sparse, no story):**
```markdown
## Integration Patterns

Beads provides several integration patterns for AI agents.

### Context Survival
Preserve work across session restarts.

### Work Extraction
Convert findings into issues.
```

**After (nicely said, tells a story):**
```markdown
## II. Integration Patterns

When Claude Code sessions end—whether from context limits, crashes, or
simply closing the terminal—work disappears. This is the fundamental
challenge Beads solves.

### Context Survival: The Core Problem

**The problem:** A Claude Code session can end at any moment. Context
windows fill (at ~50k tokens). Crashes happen. How do you pick up where
you left off?

**The solution:** Beads issues live in Git. When a session restarts,
the new instance reads `.beads/issues.jsonl` and reconstructs context.
Work survives restarts because it's persisted, not remembered.

**What this enables:**
- Session 1: Creates issue, starts implementation
- [Session crashes]
- Session 2: Reads issue, sees file modifications, continues work

**Measured impact:** In 6 months of production use, zero work items
lost to session interruption.

### Work Extraction: From Findings to Issues

During code review, Claude often discovers secondary work...
```

**Key differences:**
1. Opens with the *problem* being solved
2. Explains *why* it matters before *what* it does
3. Includes concrete example scenario
4. Ends with measured impact
5. Flows into next section

---

## Paper Requirements

### Minimum Structure

Every paper MUST include:

| Section | Required | Purpose |
|---------|----------|---------|
| Paper ID | Yes | `PAPER-YYYY-NNN` format, monospace |
| Title | Yes | H1 with `--text-h1` token |
| Subtitle | Yes | Brief description, `--text-body-lg` |
| Meta line | Yes | Type • Read time • Difficulty |
| Abstract | Yes | 3-5 sentences, border-left: 4px solid |
| Numbered sections | Yes | Minimum 5 sections, Roman numerals |
| Visual elements | Yes | Minimum 3 (tables, cards, code blocks) |
| Quote box | Recommended | Key insight, centered italic |
| References | Yes | Numbered list of sources |
| Footer | Yes | Navigation links, related papers |

### Section Requirements

**Minimum 5-7 sections** following this pattern:

```
I. Introduction (or Background)
II. [Problem/Context Section]
III. [Methodology/Approach Section]
IV. [Findings/Analysis Section]
V. [Results/Outcomes Section]
VI. Discussion (or Implications)
VII. Limitations (or Future Work)
```

Each section MUST have:
- H2 heading with Roman numeral
- Minimum 2-3 paragraphs OR equivalent visual content
- At least one of: table, card grid, code block, or list

### Visual Element Requirements

**Minimum 3 visual elements** from:

| Element | Purpose | When to Use |
|---------|---------|-------------|
| Data table | Compare options, show metrics | Quantitative findings |
| Comparison cards | Before/after, success/failure | Transformations |
| Info cards | Feature grids, capability lists | Overview sections |
| Code blocks | Implementation examples | Methodology |
| Quote box | Key insights, principles | Abstract, conclusions |
| Callout box | Warnings, tips, notes | Throughout |
| Metric cards | Numbers with context | Results |

### Sizing Guidelines

| Metric | Minimum | Target | Exemplary |
|--------|---------|--------|-----------|
| Lines of code | 400 | 600-800 | 1000+ |
| Read time | 10 min | 12-15 min | 18+ min |
| Sections | 5 | 6-7 | 8+ |
| Visual elements | 3 | 5-7 | 10+ |
| References | 2 | 4-6 | 8+ |

### Paper Types

#### Case Study Paper

Focus on real implementation with measurable outcomes.

**Required sections**:
1. Context/Background
2. Initial State (metrics, problems)
3. Methodology/Approach
4. Transformation Process
5. Results (before/after metrics)
6. Lessons Learned
7. Limitations

**Must include**:
- Specific project name
- Quantitative before/after metrics
- At least 2 comparison cards
- Code examples from actual implementation

#### Theoretical Paper

Focus on concepts, patterns, or principles.

**Required sections**:
1. Introduction
2. Background/Context
3. Conceptual Framework
4. Analysis
5. Implications
6. Related Work
7. Conclusion

**Must include**:
- Clear thesis statement in abstract
- Philosophical grounding where relevant
- At least 2 quote boxes
- References to source materials

#### Technical Paper

Focus on implementation patterns or architecture.

**Required sections**:
1. Overview
2. Architecture/Design
3. Implementation
4. Usage Patterns
5. Performance/Trade-offs
6. Alternatives Considered
7. Future Work

**Must include**:
- Architecture diagram or table
- Minimum 3 code blocks
- Before/after examples
- Integration patterns

---

## Experiment Requirements

### Minimum Structure

Every experiment MUST include:

| Section | Required | Purpose |
|---------|----------|---------|
| Title | Yes | H1 with experiment name |
| Status banner | Yes | Current state with visual indicator |
| Stats grid | Yes | 4+ key metrics |
| Status cards | Yes | Individual component status |
| Data section | Yes | Tables or logs |
| Architecture | Yes | How it works |
| Footer | Yes | Links to related resources |

### Live Data Requirements

Experiments MUST fetch real data:

```typescript
// +page.server.ts pattern
export const load: PageServerLoad = async ({ fetch }) => {
  const [result1, result2] = await Promise.allSettled([
    fetch(ENDPOINT_1).then(r => r.ok ? r.json() : null),
    fetch(ENDPOINT_2).then(r => r.ok ? r.json() : null),
  ]);

  return { data1, data2, error: null };
};
```

### Visual Requirements

| Element | Required | Purpose |
|---------|----------|---------|
| Status banner | Yes | Overall health indicator |
| Stats grid | Yes | Key metrics (4+ items) |
| Status cards | Yes | Per-component status |
| Activity log | Recommended | Recent events |
| Error display | If applicable | Failure information |

### Sizing Guidelines

| Metric | Minimum | Target |
|--------|---------|--------|
| Lines of code | 300 | 500-800 |
| Data endpoints | 1 | 2-3 |
| Status cards | 3 | 5-8 |
| Stat metrics | 4 | 6-8 |

---

## Style Requirements

### Canon Token Usage

All papers/experiments MUST use Canon tokens:

```css
/* Colors - NEVER hardcoded hex values */
color: var(--color-fg-primary);
background: var(--color-bg-surface);
border-color: var(--color-border-default);

/* Typography */
font-size: var(--text-h1);  /* Not 'text-4xl' */
font-size: var(--text-body);

/* Spacing */
margin-bottom: var(--space-md);
padding: var(--space-lg);

/* Radius */
border-radius: var(--radius-lg);
```

### Component Patterns

**Abstract section**:
```svelte
<section class="abstract-section">
  <h2>Abstract</h2>
  <p class="abstract-text">...</p>
</section>

<style>
  .abstract-section {
    padding-left: var(--space-md);
    border-left: 4px solid var(--color-border-emphasis);
  }
</style>
```

**Quote box**:
```svelte
<div class="quote-box">
  <p class="quote-text">"Key insight here."</p>
  <p class="quote-attribution">— Source</p>
</div>

<style>
  .quote-box {
    text-align: center;
    padding: var(--space-lg);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
  }
  .quote-text {
    font-style: italic;
    font-size: var(--text-body-lg);
  }
</style>
```

**Comparison cards**:
```svelte
<div class="card-grid">
  <div class="card success">
    <h3>What Worked</h3>
    <p>...</p>
  </div>
  <div class="card warning">
    <h3>Challenges</h3>
    <p>...</p>
  </div>
</div>

<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-md);
  }
  .card.success { border-left: 4px solid var(--color-success); }
  .card.warning { border-left: 4px solid var(--color-warning); }
</style>
```

---

## Quality Gate Checklist

### Paper Checklist

Before publication, verify:

- [ ] Paper ID present (PAPER-YYYY-NNN)
- [ ] Meta line complete (Type • Read time • Difficulty)
- [ ] Abstract with border-left styling
- [ ] Minimum 5 numbered sections
- [ ] Minimum 3 visual elements
- [ ] References section with 2+ sources
- [ ] Footer with navigation
- [ ] All claims cite sources (file:line or measurement)
- [ ] No hardcoded colors (use Canon tokens)
- [ ] 400+ lines of code

### Experiment Checklist

Before publication, verify:

- [ ] Live data from real endpoint(s)
- [ ] Status banner present
- [ ] Stats grid with 4+ metrics
- [ ] Status cards for components
- [ ] Architecture section
- [ ] Footer with links
- [ ] Error handling for failed fetches
- [ ] No hardcoded colors (use Canon tokens)
- [ ] 300+ lines of code

---

## Voice Canon Integration

Papers must follow Voice Canon principles:

| Principle | Application to Papers |
|-----------|----------------------|
| Clarity Over Cleverness | Lead with outcomes, not jargon |
| Specificity Over Generality | Every claim has a number or citation |
| Honesty Over Polish | Include limitations section |
| Useful Over Interesting | Code examples, not just theory |
| Grounded Over Trendy | Reference timeless principles |

### Transformation Examples

| Before (vague) | After (specific) |
|----------------|------------------|
| "Significantly improved performance" | "Response time: 450ms → 12ms (97% reduction)" |
| "Many users benefited" | "Adopted by 3 client projects in first month" |
| "Best practices suggest" | "Per OWASP guidelines (2024), section 4.2..." |

---

## Related Documentation

- [Voice Canon](./voice-canon.md) - Writing style guidelines
- [CSS Canon](./css-canon.md) - Design token reference
- [SvelteKit Conventions](./sveltekit-conventions.md) - Component patterns
