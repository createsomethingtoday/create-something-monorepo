---
description: Run Voice compliance check on content files
allowed-tools: Read, Grep, Glob
---

# Audit Voice Command

Run CREATE SOMETHING Voice compliance check on content.

## Usage

```
/audit-voice [path]
```

## What It Checks

### Forbidden Patterns (Marketing Jargon)

These words should NEVER appear:

- cutting-edge
- revolutionary
- game-changing
- AI-powered (use "AI-native development")
- leverage
- synergy
- solutions
- best-in-class
- world-class
- industry-leading

### Vague Claims Without Metrics

Flag these patterns for manual review:

- "significantly improved/reduced/increased" → Needs specific number
- "many users/customers/clients" → Needs count
- "fast/faster load/performance" → Needs ms or %
- "substantial savings" → Needs dollar amount or percentage

### Terminology Violations

| Violation | Should Be |
|-----------|-----------|
| AI-assisted | AI-native development |
| AI-powered | AI-native development |
| projects | experiments |
| blog posts | papers |
| articles | papers |
| best practices | canonical standards |
| style guide | canonical standards |
| influences | masters |
| inspiration | masters |

### Required Sections (Case Studies)

Case studies SHOULD include:
- [ ] Specific time metrics (hours, days)
- [ ] Cost metrics (dollars or percentage)
- [ ] "What This Proves" section
- [ ] "What This Doesn't Prove" section (honesty over polish)

### Required Sections (Papers)

Papers SHOULD include:
- [ ] Hypothesis or research question
- [ ] Methodology
- [ ] Limitations acknowledged
- [ ] Reproducibility section

## Output Format

```markdown
## Voice Audit: [path]

### Forbidden Patterns (N)

1. **[file:line]**: `cutting-edge` — Remove or replace
2. **[file:line]**: `solutions` — Replace with specific description

### Vague Claims (N)

1. **[file:line]**: `Fast load times` — Replace with specific metric (e.g., "0.8s load time")
2. **[file:line]**: `Many users` — Replace with count (e.g., "47 active users")

### Terminology (N)

1. **[file:line]**: `AI-powered` → Use `AI-native development`

### Missing Sections

1. **[file]**: Case study missing "What This Doesn't Prove" section

### Manual Review Required

These need human judgment:
- Does this pass the Hermeneutic Test?
- Is the specificity meaningful in context?
- Is the master citation relevant or forced?

### Reference

See https://createsomething.ltd/voice for full Voice standards.
```

## Scope

- No argument: Current file or directory
- File path: Specific file
- Directory: All `.svelte`, `.md`, `.ts` files with content

## Philosophy

The Voice is not a brand guideline—it's a philosophical commitment to clarity, honesty, and empirical rigor. This audit helps enforce:

1. **Clarity Over Cleverness** — Serve the reader
2. **Specificity Over Generality** — Every claim measurable
3. **Honesty Over Polish** — Document failures
4. **Useful Over Interesting** — Reproducible results
5. **Grounded Over Trendy** — Connected to timeless principles
