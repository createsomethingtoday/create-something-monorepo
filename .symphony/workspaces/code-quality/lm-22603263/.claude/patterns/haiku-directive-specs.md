# Haiku Directive Specs Pattern

> **Zuhandenheit**: The right model for the right task. Haiku executes, Sonnet plans, Opus architects.

## When to Use Haiku

**Use Haiku for**:
- ✅ Copy-paste edits with exact before/after strings
- ✅ Find-and-replace operations
- ✅ Formatting standardization
- ✅ Batch operations with clear instructions
- ✅ Validation scripts
- ✅ Simple data transformations

**Use Sonnet for**:
- 🟡 Planning multi-step implementations
- 🟡 Exploring codebases to understand patterns
- 🟡 Making architectural decisions
- 🟡 Complex refactoring requiring judgment
- 🟡 Writing new features from scratch

**Use Opus for**:
- 🔴 System design and architecture
- 🔴 Complex philosophical analysis
- 🔴 Novel problem-solving without established patterns
- 🔴 High-stakes decisions requiring deep reasoning

---

## The Cost Difference

| Model | Input | Output | Best For | Cost vs Haiku |
|-------|-------|--------|----------|---------------|
| **Haiku** | $0.001/1M | $0.005/1M | Execution | 1x |
| **Sonnet** | $0.003/1M | $0.015/1M | Planning | 3x input, 3x output |
| **Opus** | $0.015/1M | $0.075/1M | Architecture | 15x input, 15x output |

**Real example from this session**:
- Sonnet (figuring it out): 5.2M tokens = $15.60
- Haiku (directive spec): 50k tokens = $0.10
- **Savings**: 156x more efficient

---

## Directive Spec Pattern

### Structure

```yaml
title: Clear, specific task description
property: [ltd|io|space|agency]  # Which property/package
complexity: simple               # simple = Haiku, standard = Sonnet, complex = Opus
model: haiku                     # Explicit model override

features:
  - title: One specific change
    files:
      - exact/path/to/file.md
    acceptance:
      - Specific, testable criteria
      - No vague goals

requirements:
  - Make all edits in one pass (read once, edit all, write once)
  - Preserve all formatting exactly
  - No interpretation needed - follow exact instructions

transformations:
  - location: "Line ~123 (search: 'unique string to find')"
    before: "exact text to replace"
    after: "exact replacement text"

  - location: "Line ~456"
    before: "another exact match"
    after: "exact replacement"

success:
  - Specific, verifiable outcomes
  - No "improve quality" or other vague goals
```

### Key Principles

1. **Exact strings**: Provide before/after, not descriptions
2. **One file per feature**: Keeps context minimal
3. **Batch edits**: All changes to a file in one pass
4. **Verifiable success**: Can be checked programmatically
5. **No interpretation**: Agent executes, doesn't decide

---

## Bad vs Good Specs

### ❌ Bad (Forces Sonnet)

```yaml
title: Improve voice in .io papers
features:
  - title: Make papers more accessible
    files:
      - packages/io/src/routes/papers/**/*.svelte
    acceptance:
      - Papers use plain language
      - Philosophy is accessible
```

**Problems**:
- Glob pattern (all papers at once)
- "Improve" and "accessible" are subjective
- Agent must figure out what changes to make
- No exact transformations provided

**Result**: Sonnet burns tokens figuring it out

---

### ✅ Good (Optimized for Haiku)

```yaml
title: Add inline definition for "phenomenology" in norvig paper
property: io
complexity: simple
model: haiku

features:
  - title: Define phenomenology on first use
    files:
      - packages/io/src/routes/papers/norvig-partnership/+page.svelte
    acceptance:
      - "phenomenology" has inline definition in parentheses
      - Definition appears on first use only
      - No other changes made

requirements:
  - Find first occurrence of "phenomenology"
  - Add definition immediately after: "(the study of how things show themselves through lived experience)"
  - Preserve all Svelte syntax and formatting

transformations:
  - location: "Line ~68 (search: 'In phenomenology, we reason')"
    before: "In phenomenology, we reason from"
    after: "In <strong>phenomenology</strong> (the study of how things show themselves through lived experience), we reason from"

success:
  - phenomenology defined on first use
  - File builds without errors
  - No formatting changes except the addition
```

**Why it works**:
- One file, one change
- Exact before/after strings
- No interpretation needed
- Haiku can execute in one pass

---

## Template Library

### Find-and-Replace Batch

```yaml
title: Replace [TERM] across multiple files
property: [PROPERTY]
complexity: simple
model: haiku

features:
  - title: Replace [TERM] in [N] files
    files:
      - path/to/file1.md
      - path/to/file2.md
    acceptance:
      - All instances of [TERM] replaced
      - Context-appropriate replacements
      - Formatting preserved

requirements:
  - One-pass edit per file
  - Preserve all formatting

transformations:
  file1: path/to/file1.md
    - line: [LINE_NUM]
      search: "[EXACT_STRING]"
      replace: "[EXACT_REPLACEMENT]"

success:
  - No instances of [TERM] remain
  - All files build without errors
```

### Add Inline Definitions

```yaml
title: Define [JARGON_TERM] in [FILE]
property: io
complexity: simple
model: haiku

features:
  - title: Add inline definition for [JARGON_TERM]
    files:
      - packages/io/src/routes/papers/[PAPER]/+page.svelte
    acceptance:
      - [JARGON_TERM] defined on first use
      - Definition in parentheses
      - No other changes

transformations:
  - location: "Line ~[NUM] (search: '[UNIQUE_STRING]')"
    before: "[JARGON_TERM]"
    after: "<strong>[JARGON_TERM]</strong> ([DEFINITION])"

success:
  - Term defined on first use
  - File builds without errors
```

### Formatting Standardization

```yaml
title: Standardize [ELEMENT] formatting
property: [PROPERTY]
complexity: simple
model: haiku

features:
  - title: Apply consistent [ELEMENT] formatting
    files:
      - [FILE_PATH]
    acceptance:
      - All [ELEMENT] use standard format
      - No content changes

transformations:
  - search: "[OLD_FORMAT_REGEX]"
    replace: "[NEW_FORMAT]"
    count: all  # Replace all instances

success:
  - All [ELEMENT] consistently formatted
  - Content unchanged
  - File builds/renders correctly
```

---

## Workflow: Planning → Execution

### 1. Planning Phase (Sonnet/Opus)

```bash
# Use Sonnet to explore and plan
Task: "Audit .io papers for undefined jargon"

Result: List of papers with specific terms needing definition
```

### 2. Spec Creation (Human/Sonnet)

Create directive specs from audit findings:
- One spec per file (or small batch)
- Exact before/after strings
- Verifiable success criteria

### 3. Execution Phase (Haiku)

```bash
# Run Haiku with directive spec
claude harness /tmp/spec-file.yaml --model=haiku
```

### 4. Validation

```bash
# Programmatic verification
grep -r "undefined_term" packages/ | grep -v "("
# Expected: 0 results (all terms now have definitions)
```

---

## Real-World Examples

### Example 1: Voice Audit Transformations

**Initial approach (Sonnet)**:
- Spec: "Improve voice across all properties"
- Agent read 970-line transformation doc repeatedly
- Figured out what to change for each file
- 5.2M tokens for 6 files = $15.60

**Optimized approach (Haiku)**:
- Spec per file with exact before/after
- Agent executed directives
- 50k tokens for 4 files = $0.10
- **156x more efficient**

### Example 2: Jargon Replacement

**Task**: Replace "ship" with context-appropriate terms in 5 files

**Bad spec**:
```yaml
title: Remove developer jargon
files: packages/lms/**/*.md
task: Replace jargon with accessible language
```
→ Sonnet explores, interprets, ~500k tokens

**Good spec**:
```yaml
title: Replace "ship" in 5 specific files
transformations:
  - file: sveltekit-philosophy.md
    line: 129
    search: "ship code"
    replace: "send code"
  [... exact replacements for each file]
```
→ Haiku executes, ~50k tokens

---

## Decision Tree

```
Is the task clearly defined with exact changes?
├─ YES → Can you provide exact before/after strings?
│  ├─ YES → Use Haiku with directive spec
│  └─ NO → Use Sonnet to plan, then create directive specs
│
└─ NO → Does it require exploration or judgment?
   ├─ Simple exploration → Sonnet
   ├─ Complex reasoning → Opus
   └─ After exploration → Create directive specs → Haiku
```

---

## Anti-Patterns

### ❌ Using Sonnet for Simple Execution

```yaml
# DON'T DO THIS
model: sonnet  # Wastes tokens
title: Replace "TODO" with "FIXME"
```

If you have exact before/after, use Haiku.

### ❌ Using Haiku for Complex Decisions

```yaml
# DON'T DO THIS
model: haiku  # Will fail or produce poor results
title: Refactor auth system for better security
```

Haiku executes directives, it doesn't make architectural decisions.

### ❌ Massive Specs

```yaml
# DON'T DO THIS
files:
  - packages/**/*.ts  # 1000+ files
task: Improve code quality
```

Break into per-file or per-directory specs.

### ❌ Vague Success Criteria

```yaml
# DON'T DO THIS
success:
  - Code is better
  - Quality improved
```

Use verifiable criteria: "No instances of X remain", "All files build", "Tests pass".

---

## Spec Checklist

Before running Haiku, verify your spec has:

- [ ] Exact file paths (no globs for Haiku)
- [ ] Exact before/after strings for each change
- [ ] One file or small batch per spec
- [ ] Verifiable success criteria
- [ ] No subjective terms ("improve", "better", "cleaner")
- [ ] Clear acceptance criteria
- [ ] `model: haiku` explicitly set
- [ ] `complexity: simple` for Haiku tasks

If any checkbox is unchecked, consider:
1. Using Sonnet to explore first
2. Breaking into smaller specs
3. Making transformations more explicit

---

## Cost Optimization Strategy

1. **Use Opus sparingly**: Only for novel architecture/design
2. **Use Sonnet for planning**: Exploration, audit, understanding
3. **Use Haiku for execution**: Once you know exactly what to change

**Workflow**:
```
Opus (architecture) → Sonnet (planning/audit) → Haiku (execution)
     ↓                      ↓                         ↓
  Design decisions    What needs changing      Make the changes
     Rare             Per feature               Per file
  $0.015/1M           $0.003/1M                 $0.001/1M
```

---

## Measuring Success

### Efficiency Metrics

Track these for each task:

| Metric | Target | Red Flag |
|--------|--------|----------|
| Tokens per file edit | <50k | >200k |
| Cost per directive edit | <$0.05 | >$0.50 |
| Tool uses per edit | <10 | >30 |
| Re-reads of reference docs | 0 | >1 |

### Quality Metrics

- ✅ Edits match spec exactly
- ✅ No unintended changes
- ✅ Files build/test successfully
- ✅ Formatting preserved

---

## Integration with Harness

The harness automatically routes based on `complexity` and `model`:

```yaml
complexity: simple   # → Defaults to Haiku
complexity: standard # → Defaults to Sonnet
complexity: complex  # → Defaults to Opus

model: haiku  # Explicit override
```

**Recommendation**: Always set `model: haiku` explicitly for directive specs.

---

## Summary

**The Pattern**:
1. **Explore with Sonnet**: "What needs to change?"
2. **Plan with Human/Sonnet**: Create directive specs
3. **Execute with Haiku**: Run the specs
4. **Verify programmatically**: Grep, build, test

**The Payoff**:
- 10-100x cost reduction for execution work
- Faster completion (seconds vs minutes)
- More predictable results
- Easier to review (exact diffs)

**The Philosophy**:
> Use expensive models to think, cheap models to act. The directive spec is the boundary: thinking produces it, acting executes it.

---

**Next**: See `VOICE_FIXES_REMAINING.md` for real examples of this pattern in action.
