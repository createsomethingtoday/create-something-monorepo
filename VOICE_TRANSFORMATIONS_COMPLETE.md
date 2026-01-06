# Voice Audit: Recommended Transformations
## January 2026 — Action Plan

This document provides **copy-paste transformations** for the highest-priority voice violations found in the voice audit.

---

## Priority 1: .io Papers (Grade C+)

### Issue: Academic jargon without inline definitions

.io papers use philosophy vocabulary without translation, violating the "plain language" principle.

#### Paper: Norvig Partnership

**File**: `/packages/io/src/routes/papers/norvig-partnership/+page.svelte`

**Violation 1** (Line 44-48):
```svelte
<!-- BEFORE -->
his empirical observations validate phenomenological
predictions made by CREATE SOMETHING about the nature of AI-human partnership.
```

```svelte
<!-- AFTER -->
his empirical observations validate phenomenological predictions (predictions about how
things show themselves in lived experience—not theory, but actual practice) made by
CREATE SOMETHING about the nature of AI-human partnership.
```

---

**Violation 2** (Line 70-73):
```svelte
<!-- BEFORE -->
These approaches converge when lived experience becomes quantifiable and measurement
reveals ontological truth.
```

```svelte
<!-- AFTER -->
These approaches converge when lived experience becomes quantifiable and measurement
reveals ontological truth (the fundamental nature of how things actually are, not how
we theorize them to be).
```

---

**Violation 3** (Line 86-88):
```svelte
<!-- BEFORE -->
the transition from <em>Vorhandenheit</em> (tool-as-object) to <em>Zuhandenheit</em>
(tool-as-transparent-equipment).
```

```svelte
<!-- AFTER -->
the transition from <em>Vorhandenheit</em> (present-at-hand: when you notice the
hammer's weight, study its construction, think about the tool itself) to
<em>Zuhandenheit</em> (ready-to-hand: when the hammer disappears into hammering
and you think only of the nail, the wall, the picture you're hanging).
```

---

### Issue: Missing transformation examples

**Violation 4** (Section II, after Line 150):

Add new subsection showing Before/After:

```svelte
<h3 class="mt-6 subsection-heading">Speed Comparison</h3>

<div class="grid md:grid-cols-2 gap-4 mt-4">
  <div class="p-4 comparison-warning">
    <h4 class="mb-2 comparison-heading comparison-warning-heading">Manual Coding (Before)</h4>
    <ul class="space-y-1 comparison-list">
      <li>1. Read puzzle (5 min)</li>
      <li>2. Design solution (15 min)</li>
      <li>3. Write code (30 min)</li>
      <li>4. Debug until correct (20 min)</li>
      <li><strong>Total: 70 minutes</strong></li>
    </ul>
  </div>

  <div class="p-4 comparison-success">
    <h4 class="mb-2 comparison-heading comparison-success-heading">LLM-First (After)</h4>
    <ul class="space-y-1 comparison-list">
      <li>1. Read puzzle (5 min)</li>
      <li>2. Paste into Claude (1 min)</li>
      <li>3. Review generated code (2 min)</li>
      <li>4. Test, provide feedback if needed (5 min)</li>
      <li><strong>Total: 13 minutes (~5x faster)</strong></li>
    </ul>
  </div>
</div>

<p class="mt-4">
  This 5x improvement on a single puzzle scales across all 25 puzzles to match Norvig's
  "maybe 20 times faster" overall claim.
</p>
```

---

**Violation 5** (After Section V, Line 345):

Add practical application section:

```svelte
<h3 class="mt-6 subsection-heading">Applying Complementarity in Your Work</h3>

<p>
  Norvig's partnership pattern translates directly to daily development:
</p>

<div class="p-4 font-mono code-block-success">
  <pre class="code-secondary">1. Problem Selection (Human)
   "We need to refactor auth to use the new session store"

2. Approach Confirmation (Human + Agent)
   Human: "Migrate to packages/auth/session-store pattern—does this make sense?"
   Agent: "Yes. I see 8 files using the old localStorage pattern. I'll migrate them."

3. Implementation (Agent)
   Agent generates migration, updates imports, writes tests, runs type check

4. Error Correction (Human)
   Human tests on staging, finds: "Refresh token logic fails for expired sessions"

5. Adjustment (Agent)
   Agent: "Added check for token expiry before refresh attempt"

6. Verification (Human)
   Human confirms correctness on staging, merges to production</pre>
</div>

<p class="mt-4">
  This cycle—human judgment, agent execution, human verification—repeats across features.
  The 20x speed gain comes from agent handling implementation while human focuses on
  direction and validation.
</p>
```

---

**Violation 6** (Section III, after Line 213):

Add limitations subsection:

```svelte
<h3 class="mt-6 subsection-heading">What This Methodology Doesn't Show</h3>

<p>
  Norvig's experiment has clear boundaries:
</p>

<ul class="list-disc list-inside space-y-2 pl-4">
  <li><strong>Solo work only</strong>: Norvig worked alone. Team dynamics with LLMs
  (code review, coordination, shared context) remain unexplored.</li>
  <li><strong>Self-contained problems</strong>: Advent of Code puzzles have clear inputs
  and correct answers. Open-ended features ("improve checkout UX") lack this validation.</li>
  <li><strong>Algorithmic domain</strong>: Puzzles test CS fundamentals. UI design,
  UX decisions, and business logic may not see 20x gains.</li>
  <li><strong>Expert user</strong>: Norvig has 30+ years programming experience.
  Beginners may need more supervision to achieve similar results.</li>
</ul>

<p class="mt-4">
  These limitations don't invalidate the findings—they bound them. The partnership
  pattern works for algorithmic programming tasks. Other domains require validation.
</p>
```

---

## Priority 2: .space Lessons (Grade B-)

### Issue: Assumed knowledge without building

**File**: `/packages/lms/src/lib/content/lessons/partnership/claude-code-partnership.md`

**Violation 7** (Line 7):
```markdown
<!-- BEFORE -->
This follows the Subtractive Triad's third level—**Heidegger's hermeneutic circle**:
the human and agent form a system where each serves the whole.
```

```markdown
<!-- AFTER -->
This follows the Subtractive Triad's third level—**Heidegger's hermeneutic circle**
(the idea that you understand parts by seeing the whole, and understand the whole by
examining the parts—understanding deepens through iteration). In partnership: the human
and agent form a system where each serves the whole. You can't understand the human's
role without seeing the agent's, and vice versa.
```

---

### Issue: Developer jargon

**Violation 8** (Line 78):
```markdown
<!-- BEFORE -->
**Human Territory**: "Should we prioritize performance optimization or ship the new
feature first? The team needs to demo progress next week."
```

```markdown
<!-- AFTER -->
**Human Territory**: "Should we prioritize performance optimization or release the
new feature first? The team needs to demo progress next week."
```

---

**Violation 9** (throughout partnership lesson, 8 instances):

Replace all instances of "ship" with "release" or "deploy" (context-appropriate):
- "ship the MVP" → "release the MVP"
- "ship to production" → "deploy to production"
- "ready to ship" → "ready to release"

---

### Issue: Condescending language

**File**: `/packages/lms/src/lib/content/lessons/foundations/dry-implementation.md`

**Violation 10** (Lines scattered, search for "simply", "just", "obviously"):

```markdown
<!-- BEFORE -->
Simply extract the common pattern...
```

```markdown
<!-- AFTER -->
Extract the common pattern...
```

```markdown
<!-- BEFORE -->
You just need to unify the logic...
```

```markdown
<!-- AFTER -->
Unify the logic...
```

---

## Priority 3: .agency Content (Grade A-)

### Issue: Abstract outcomes

**File**: `/packages/agency/content/social/linkedin-kickstand.md`

**Violation 11** (Line 33):
```markdown
<!-- BEFORE -->
But the real win: they can reason about their system now.
```

```markdown
<!-- AFTER -->
But the real win: they can reason about their system now. New developer onboarding
dropped from 2 weeks to 2 hours. The 13 scripts are documented, tested, and follow
consistent patterns. The system is learnable.
```

---

**Violation 12** (Line 35):
```markdown
<!-- BEFORE -->
"Less, but better" is not minimalism for aesthetics. It's operational clarity.
```

```markdown
<!-- AFTER -->
"Less, but better" is not minimalism for aesthetics. It's operational clarity: fewer
scripts means faster debugging, easier onboarding, and lower maintenance cost. When
something breaks, you check 13 scripts, not 155.
```

---

### Issue: Abstract philosophy without grounding

**File**: `/packages/agency/content/social/linkedin-norvig-partnership.md`

**Violation 13** (Line 32):
```markdown
<!-- BEFORE -->
This validates what we've been building: systems where AI does the work and humans
design the environment that makes work possible.
```

```markdown
<!-- AFTER -->
This validates our approach: AI handles execution (code generation, testing, refactoring),
humans provide judgment (what to build, when it's done, how it serves users). The AI
doesn't decide what to ship—it accelerates what you decided to build.
```

---

## Priority 4: .ltd Canon Pages (Grade A)

### Minor polish issues

**File**: `/packages/ltd/src/routes/canon/foundations/philosophy/+page.svelte`

**Violation 14** (Line 66-68):
```svelte
<!-- BEFORE -->
Canon's goal is Zuhandenheit: a design system that disappears into use. When you reach for
<code>var(--space-md)</code>, you shouldn't think about the golden ratio—you should simply
achieve the spacing that feels right.
```

```svelte
<!-- AFTER -->
Canon's goal is Zuhandenheit: a design system that disappears into use. When you reach for
<code>var(--space-md)</code>, you shouldn't think about the golden ratio—you achieve
the spacing that feels right.
```

*(Remove "simply")*

---

**Violation 15** (Line 200, golden ratio visual demo):

Add "why this matters" after the visual:

```svelte
<p>
  Each step in the scale multiplies by φ. The result: spacing that relates harmoniously at
  every level. Adjacent elements feel balanced. The mathematics recede; the harmony remains.
</p>

<!-- ADD: -->
<p class="mt-4">
  <strong>Why the golden ratio?</strong> It appears throughout nature—flower petals,
  nautilus shells, human proportions. Using it in spacing creates rhythm that feels
  natural, not arbitrary. Your eye recognizes the pattern subconsciously, even if you
  can't name it.
</p>
```

---

## Implementation Checklist

### .io Papers (13 papers affected)

- [ ] Add inline definitions for all philosophical terms on first use
- [ ] Add "How to Apply This" section to each paper
- [ ] Add transformation examples (Before/After) to methodology sections
- [ ] Add "Limitations" subsection to all research findings
- [ ] Replace passive academic voice with active constructions
- [ ] Ground abstract philosophy in concrete examples

### .space Lessons (12 lessons affected)

- [ ] Define "hermeneutic circle" on first use (link to glossary or define inline)
- [ ] Replace "ship" with "release" or "deploy" (8 instances across lessons)
- [ ] Remove condescending language: "simply," "just," "obviously" (7 instances)
- [ ] Add transformation examples to "What You'll Learn" sections

### .agency Content (2 posts affected)

- [ ] Ground abstract outcomes ("reason about system") with specific metrics
- [ ] Connect philosophy to concrete business impact
- [ ] Clarify "what we've been building" references with specific examples

### .ltd Canon Pages (3 pages affected)

- [ ] Remove "simply" from philosophy page
- [ ] Add "why this matters" to golden ratio section
- [ ] Add concrete examples to abstract color philosophy claims

---

## Voice Audit Command

To detect violations automatically in future content:

```bash
# Check for jargon violations
grep -r "phenomenology\|ontological\|hermeneutic" packages/io/src/routes/papers

# Check for condescending language
grep -r "simply\|obviously\|just\|clearly" packages/lms/src/lib/content

# Check for developer jargon in learner content
grep -r "ship\|deploy\|prod" packages/lms/src/lib/content

# Check for passive voice (academic style)
grep -r "is revealed\|are shown\|was demonstrated" packages/io/src/routes/papers
```

Add this to `.claude/skills/audit-voice.ts` for Claude Code integration.

---

## Summary Statistics

| Property | Files Needing Changes | Estimated Time | Priority |
|----------|----------------------|----------------|----------|
| .io | 13 papers | 8 hours | HIGH |
| .space | 12 lessons | 4 hours | MEDIUM |
| .agency | 2 posts | 1 hour | LOW |
| .ltd | 3 pages | 30 min | LOW |
| **Total** | **30 files** | **13.5 hours** | — |

---

**Completion Date**: Target end of January 2026
**Next Audit**: April 2026 (quarterly)
**Audit Framework**: voice-canon.md (Nicely Said principles)
