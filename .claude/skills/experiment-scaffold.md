# Experiment Scaffold

Generate experiment structure with all required elements from the CREATE SOMETHING methodology.

## Philosophy

**"Not interesting. Not novel. Useful."**

Every experiment is a hypothesis under test. The structure reveals whether the hypothesis validated. No decoration. No marketing. Just evidence.

## Required Structure

Every experiment must include these sections:

```
┌─────────────────────────────────────────────────────┐
│  1. ASCII Art Header                                │
│     - Experiment name                               │
│     - Key metric (one number)                       │
│     - Property (.space/.io)                         │
├─────────────────────────────────────────────────────┤
│  2. Hypothesis                                      │
│     - Testable claim                                │
│     - Success criteria (measurable)                 │
├─────────────────────────────────────────────────────┤
│  3. Methodology                                     │
│     - What was built                                │
│     - How it was measured                           │
│     - Time boundaries                               │
├─────────────────────────────────────────────────────┤
│  4. Results                                         │
│     - Metrics table                                 │
│     - Success criteria outcomes (✅/❌)              │
├─────────────────────────────────────────────────────┤
│  5. Honest Assessment                               │
│     - What This Proves                              │
│     - What This Doesn't Prove                       │
│     - Where Intervention Was Needed                 │
├─────────────────────────────────────────────────────┤
│  6. Reproducibility                                 │
│     - Prerequisites                                 │
│     - Starting prompts                              │
│     - Expected challenges                           │
├─────────────────────────────────────────────────────┤
│  7. Canonical Connection                            │
│     - Master/principle cited                        │
│     - Property connection                           │
├─────────────────────────────────────────────────────┤
│  8. Outcome Declaration                             │
│     - ✅ VALIDATED or ❌ INVALIDATED                 │
└─────────────────────────────────────────────────────┘
```

## ASCII Art Header

### .space Dialect (Simple)

```
+------------------------------------------+
|  EXPERIMENT: [Name]                      |
|  [Key Metric]: [Value]                   |
|  createsomething.space                   |
+------------------------------------------+
```

### .io Dialect (Unicode)

```
╔══════════════════════════════════════════╗
║  EXPERIMENT: [Name]                      ║
║  [Key Metric]: [Value]                   ║
║  createsomething.io                      ║
╚══════════════════════════════════════════╝
```

### Key Metric Selection

Choose ONE number that captures the experiment's value:

| Experiment Type | Key Metric |
|-----------------|------------|
| Time savings | "6h vs 20h (70% savings)" |
| Cost reduction | "$12.50 vs $847 (98% savings)" |
| Performance | "0.8s load time (75% faster)" |
| Accuracy | "94.2% accuracy" |
| Coverage | "47/47 tests passing" |

## Hypothesis Section

### Format

```markdown
## Hypothesis

**Claim**: [Testable statement about what will happen]

**Success Criteria**:
1. [ ] [Measurable criterion 1]
2. [ ] [Measurable criterion 2]
3. [ ] [Measurable criterion 3]
```

### Good vs Bad Hypotheses

```
❌ "AI can help with development"
✅ "Claude Code can complete a CRUD API in under 4 hours with <5 manual interventions"

❌ "This approach will be faster"
✅ "Motion extraction via Puppeteer will capture 90%+ of CSS animations"

❌ "Users will like this"
✅ "Completion rate will exceed 80% for beginner exercises"
```

## Methodology Section

### Required Elements

```markdown
## Methodology

**Built**: [Specific description of what was created]

**Measured**:
- [Metric 1]: [How measured]
- [Metric 2]: [How measured]

**Boundaries**:
- Start: [Date/time]
- End: [Date/time]
- Duration: [Total time]
```

### Time Tracking

Always track:
- **Estimated time** (before starting)
- **Actual time** (after completion)
- **Savings** (percentage)

## Results Section

### Metrics Table Format

```markdown
## Results

| Metric | Estimated | Actual | Savings |
|--------|-----------|--------|---------|
| Development time | 20h | 6h | 70% |
| API cost | $50 | $12.50 | 75% |
| Lines of code | 2000 | 847 | 58% |
```

### Success Criteria Outcomes

```markdown
**Success Criteria**:
1. [x] ✅ [Criterion 1 - met because...]
2. [x] ✅ [Criterion 2 - met because...]
3. [ ] ❌ [Criterion 3 - not met because...]
```

## Honest Assessment Section

### Required Subsections

```markdown
## Honest Assessment

### What This Proves
- [Specific, bounded claim supported by evidence]
- [Another claim with evidence]

### What This Doesn't Prove
- [Limitation 1 - why this doesn't generalize]
- [Limitation 2 - what wasn't tested]

### Where User Intervention Was Needed
- [Intervention 1]: [Why AI couldn't handle this]
- [Intervention 2]: [What manual work was required]
```

### Honesty Patterns

```
✅ "Proved: Claude Code can scaffold a basic CRUD API quickly"
✅ "Didn't prove: This approach works for complex business logic"
✅ "Intervention: Had to manually debug OAuth state mismatch"

❌ "This proves AI can do anything"
❌ "No limitations found"
❌ "Fully autonomous with no intervention"
```

## Reproducibility Section

### Format

```markdown
## Reproducibility

### Prerequisites
- [ ] [Tool/access requirement 1]
- [ ] [Tool/access requirement 2]
- [ ] [Knowledge requirement]

### Starting Prompt
```
[Exact prompt that initiated the experiment]
```

### Expected Challenges
1. [Challenge 1]: [How to handle]
2. [Challenge 2]: [How to handle]
```

### What Makes It Reproducible

- **Exact prompts** — Not paraphrased
- **Tool versions** — Specific versions used
- **Environment** — OS, Node version, etc.
- **Data** — Sample data or how to obtain
- **Expected failures** — What will go wrong and how to fix

## Canonical Connection Section

### Format

```markdown
## Canonical Connection

**Master**: [Rams/Mies/Eames/Tufte/Heidegger]

**Principle**: "[Exact quote from master]"

**Application**: [How this experiment embodies the principle]

**Property Connection**:
- This experiment serves .[property] by [specific contribution]
- It feeds back to .ltd through [what it validates]
```

### Master Selection Guide

| If the experiment is about... | Cite |
|-------------------------------|------|
| Removing unnecessary features | Rams: "As little design as possible" |
| Structural elegance | Mies: "Less is more" |
| Serving users efficiently | Eames: "The best for the most for the least" |
| Data visualization/evidence | Tufte: "Above all else show the data" |
| System coherence | Heidegger: The Hermeneutic Circle |

## Outcome Declaration

### Final Section

```markdown
## Outcome

### Hypothesis: ✅ VALIDATED

The experiment [proved/demonstrated] that [restate hypothesis in past tense].

**Evidence**: [Key metric that proves it]

**Next**: [What this enables or what should be explored next]
```

Or if invalidated:

```markdown
## Outcome

### Hypothesis: ❌ INVALIDATED

The experiment [failed to prove/demonstrated against] that [restate hypothesis].

**Evidence**: [What failed]

**Learning**: [What was learned from the failure]

**Next**: [Revised hypothesis or new direction]
```

## File-Based Experiment Template

For experiments implemented as Svelte components:

```typescript
// src/lib/config/fileBasedExperiments.ts
{
  id: 'file-[slug]',
  slug: '[slug]',
  title: '[Experiment Title]',
  is_file_based: true,
  reading_time_minutes: [number],
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  tests_principles: ['[Principle 1]', '[Principle 2]'],
  ascii_art: `
+------------------------------------------+
|  EXPERIMENT: [Name]                      |
|  [Key Metric]: [Value]                   |
+------------------------------------------+
  `,
}
```

## Scaffold Workflow

### 1. Initialize

Create experiment directory structure:

```
src/routes/experiments/[slug]/
├── +page.svelte       # Experiment UI
├── +page.server.ts    # Data loading (if needed)
└── README.md          # Full methodology documentation
```

### 2. Generate Header

Choose dialect based on property (.space vs .io)

### 3. Draft Hypothesis

Make it testable and measurable before building

### 4. Build and Measure

Track time from start, document interventions as they happen

### 5. Complete Documentation

Fill in all sections honestly after completion

### 6. Declare Outcome

Validated or invalidated—no hedge

## When to Use

- **Starting a new experiment** — Generate full structure
- **Reviewing experiment documentation** — Check for missing sections
- **Converting informal work to experiments** — Add required rigor
- **Planning research** — Structure hypothesis before building

## Integration

This skill connects to:
- `voice-validator` — Validates content in experiment docs
- `canon-maintenance` — Ensures philosophical alignment
- `create-something-experiments` — Tracking and paper generation

## Reference

- `.ltd/voice` — Required elements documentation
- `.ltd/standards` — Property-specific criteria
- `packages/space/src/lib/config/fileBasedExperiments.ts` — Example implementations
