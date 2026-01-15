# Skill Composability Patterns

Skills can be combined (composed) to create comprehensive workflows. This document defines how skills layer together.

## Philosophy

**"The whole is greater than the sum of its parts."** — Aristotle

Composability follows the Hermeneutic Circle: each skill informs the others, creating a coherent whole that validates itself.

---

## Composability Matrix

| Skill | Can Layer With | Cannot Layer With |
|-------|----------------|-------------------|
| voice-validator | All quality-assurance skills | photo-cleanup |
| canon-maintenance | voice-validator, subtractive-review | photo-cleanup |
| subtractive-review | canon-maintenance, voice-validator | orchestration workers |
| experiment-auditor | canon-maintenance, voice-validator | paper-auditor |
| paper-auditor | canon-maintenance, voice-validator | experiment-auditor |
| experiment-scaffold | experiment-auditor, voice-validator | paper-auditor |

**Rule**: Orchestration skills (`orchestration-worker`, `voice-audit-worker`) run in isolation and cannot be composed.

---

## Standard Compositions

### Content Publication Stack

**Purpose**: Ensure all content meets CREATE SOMETHING standards before publishing.

```
┌─────────────────────────────────────────────────────────┐
│  1. experiment-scaffold (if new experiment)             │
│     └── Generates required structure                    │
├─────────────────────────────────────────────────────────┤
│  2. voice-validator                                     │
│     └── Validates Five Principles compliance            │
├─────────────────────────────────────────────────────────┤
│  3. experiment-auditor OR paper-auditor                 │
│     └── Validates structure & Canon tokens              │
├─────────────────────────────────────────────────────────┤
│  4. canon-maintenance                                   │
│     └── Final Subtractive Triad audit                   │
└─────────────────────────────────────────────────────────┘
```

**Workflow**:
```bash
# For experiments
1. Create experiment structure (experiment-scaffold)
2. Write content
3. Run voice validation (voice-validator)
4. Run structure audit (experiment-auditor)
5. Final Canon check (canon-maintenance)

# For papers
1. Create paper structure
2. Write content
3. Run voice validation (voice-validator)
4. Run structure audit (paper-auditor)
5. Final Canon check (canon-maintenance)
```

---

### Code Review Stack

**Purpose**: Apply Subtractive Triad to pull requests.

```
┌─────────────────────────────────────────────────────────┐
│  1. subtractive-review                                  │
│     └── DRY → Rams → Heidegger passes                   │
├─────────────────────────────────────────────────────────┤
│  2. canon-maintenance                                   │
│     └── CSS/design token compliance                     │
├─────────────────────────────────────────────────────────┤
│  3. voice-validator (for documentation in PR)           │
│     └── Ensures docs follow voice guidelines            │
└─────────────────────────────────────────────────────────┘
```

**Workflow**:
```bash
# On PR review
1. Run subtractive-review (all three passes)
2. If .svelte/.css changed: run canon-maintenance
3. If .md changed: run voice-validator
```

---

### Knowledge Documentation Stack

**Purpose**: Create and maintain understanding documentation.

```
┌─────────────────────────────────────────────────────────┐
│  1. understanding-graphs                                │
│     └── Create UNDERSTANDING.md for package             │
├─────────────────────────────────────────────────────────┤
│  2. voice-validator                                     │
│     └── Ensure documentation follows voice principles   │
├─────────────────────────────────────────────────────────┤
│  3. graph-relationship-audit                            │
│     └── Verify graph relationships are accurate         │
└─────────────────────────────────────────────────────────┘
```

---

### Quality Gate Stack

**Purpose**: Pre-deployment validation.

```
┌─────────────────────────────────────────────────────────┐
│  1. canon-maintenance (Subtractive Triad)               │
│     └── DRY, Rams, Heidegger checks                     │
├─────────────────────────────────────────────────────────┤
│  2. experiment-auditor OR paper-auditor                 │
│     └── Route-specific validation                       │
├─────────────────────────────────────────────────────────┤
│  3. voice-validator                                     │
│     └── Content voice compliance                        │
└─────────────────────────────────────────────────────────┘
```

**Pre-deployment checklist**:
```
[ ] canon-maintenance passes (Triad audit)
[ ] Structure audit passes (experiment/paper)
[ ] voice-validator passes (content quality)
[ ] All tests passing
[ ] No linter errors
```

---

## Composition Rules

### Rule 1: Order Matters

Skills should be composed in dependency order:

```
Generation → Validation → Audit → Final Check

experiment-scaffold → voice-validator → experiment-auditor → canon-maintenance
```

**Why**: Generation creates structure, validation checks content, audit verifies compliance, final check ensures nothing was missed.

### Rule 2: Same-Category Mutual Exclusion

Skills in the same category that serve the same purpose should not be combined:

```
❌ experiment-auditor + paper-auditor  (both audit routes)
✅ experiment-auditor + voice-validator  (different purposes)
```

**Why**: They validate the same aspect from incompatible perspectives.

### Rule 3: Orchestration Isolation

Orchestration skills run in isolated contexts and cannot be composed:

```
❌ orchestration-worker + voice-validator
❌ voice-audit-worker + canon-maintenance
✅ voice-audit-worker (runs alone, outputs to voice-validator-compatible format)
```

**Why**: Workers execute in forked contexts with limited tool access.

### Rule 4: Specialized Skills Stand Alone

Domain-specific skills typically don't compose:

```
photo-cleanup (standalone image processing)
architectural-visualization (standalone rendering)
prd-to-ralph (standalone PRD generation)
doc-generator (standalone documentation)
```

**Why**: They serve specific, bounded purposes that don't benefit from layering.

---

## Composition Examples

### Example 1: New Experiment

**Task**: Create and publish a new experiment.

```bash
# Step 1: Scaffold (experiment-scaffold)
Agent creates:
- src/routes/experiments/[slug]/+page.svelte
- Required sections (hypothesis, methodology, results)
- ASCII art header

# Step 2: Write content
Agent/human writes experiment content

# Step 3: Voice validation (voice-validator)
Agent checks:
- No marketing jargon
- Claims are specific/measurable
- Failures documented
- Master citations present

# Step 4: Structure audit (experiment-auditor)
Agent verifies:
- SEO meta tags present
- Container width correct
- Canon tokens used (not Tailwind design utilities)
- Tracking function present

# Step 5: Final check (canon-maintenance)
Agent runs Subtractive Triad:
- DRY: No duplication
- Rams: Everything earns existence
- Heidegger: Serves the whole
```

### Example 2: PR Review for UI Component

**Task**: Review a PR adding a new component.

```bash
# Step 1: Subtractive review (subtractive-review)
Reviewer checks:
- Pass 1 (DRY): Component not duplicated
- Pass 2 (Rams): Every prop earns existence
- Pass 3 (Heidegger): Serves the design system

# Step 2: Canon compliance (canon-maintenance)
Reviewer verifies:
- Uses Canon tokens
- No hardcoded colors
- Follows component patterns

# Step 3: Voice check (voice-validator) — if docs included
Reviewer ensures:
- README follows voice guidelines
- JSDoc comments are clear
```

### Example 3: Publishing a Research Paper

**Task**: Publish a paper to createsomething.io.

```bash
# Step 1: Write paper content

# Step 2: Voice validation (voice-validator)
Check Five Principles:
- Clarity over cleverness
- Specificity over generality
- Honesty over polish
- Useful over interesting
- Grounded over trendy

# Step 3: Paper audit (paper-auditor)
Verify structure:
- svelte:head with title + description
- paper-container class
- max-w-4xl container
- Pure black background (--color-bg-pure)
- Standard class names (paper-header, section-heading, etc.)

# Step 4: Canon maintenance (canon-maintenance)
Final Triad check:
- All elements earn existence
- No decoration
- Serves the hermeneutic circle
```

---

## Composition Metadata

Skills declare composability in their frontmatter:

```yaml
---
name: voice-validator
composable: true
related:
  - canon-maintenance
  - experiment-scaffold
  - voice-audit-worker
---
```

**`composable: true`**: Can be layered with other skills
**`composable: false`**: Runs standalone or in isolation
**`related`**: Skills commonly used together

---

## Creating Composable Skills

When creating a new skill, consider:

1. **Input/Output Compatibility**: Does your skill's output make sense as input to another skill?

2. **Context Preservation**: Does your skill modify context that other skills need?

3. **Order Independence**: Can your skill run at any position in a composition?

4. **Failure Handling**: If your skill fails, can subsequent skills still provide value?

### Composability Checklist

```
[ ] Skill has clear, bounded purpose
[ ] Output format documented
[ ] Can run independently
[ ] Doesn't destroy context needed by others
[ ] Related skills listed in frontmatter
[ ] Composition order documented
```

---

## Anti-Patterns

### Anti-Pattern 1: Over-Composition

```
❌ Running all 14 skills on every task
✅ Running the 3-4 skills relevant to the context
```

**Fix**: Use trigger patterns to determine which skills apply.

### Anti-Pattern 2: Ignoring Composition Order

```
❌ Running canon-maintenance before experiment-scaffold
   (checking compliance before content exists)
✅ Running experiment-scaffold, then voice-validator, then canon-maintenance
   (generation → validation → audit)
```

**Fix**: Follow the Generation → Validation → Audit → Check order.

### Anti-Pattern 3: Forcing Incompatible Compositions

```
❌ Composing photo-cleanup with voice-validator
   (image processing + text validation make no sense together)
✅ Using photo-cleanup standalone for image tasks
```

**Fix**: Respect category boundaries and skill purposes.

---

## Reference

- [SKILLS.md](./SKILLS.md) — Full skill registry with composability flags
- [RULES.md](./RULES.md) — Rules that inform skill application
- `skills/*.md` — Individual skill documentation with related skills
