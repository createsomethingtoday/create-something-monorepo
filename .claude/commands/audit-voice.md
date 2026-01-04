---
description: Run Voice compliance check on content files
allowed-tools: Read, Grep, Glob
---

# Audit Voice Command

Run CREATE SOMETHING Voice compliance check on content.

This audit helps you recognize patterns to transform.

## Usage

```
/audit-voice [path]
```

## What It Checks

### Marketing Jargon

These words feel professional but communicate little. When you notice them, ask: what do I actually mean?

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
- transformative
- innovative
- seamless
- robust
- scalable

### Vague Claims

Vague claims feel safe—they can't be disproven. But they also can't help readers.

Flag these patterns for manual review:

- "significantly improved/reduced/increased" → Needs specific number
- "many users/customers/clients" → Needs count
- "fast/faster load/performance" → Needs ms or %
- "substantial savings" → Needs dollar amount or percentage
- "enhanced experience" → Needs measurable outcome
- "better outcomes" → Needs comparison metric
- "various benefits" → Needs enumeration

### Terminology Corrections

| You might write | What serves readers better |
|-----------------|---------------------------|
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

### Patterns to Transform (N)

1. **[file:line]**: `cutting-edge` — What do you actually mean?
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

### Dual-Format Compliance

For content that serves both humans and AI agents, check for:

**Human layer** (Fenton/Lee warmth):
- Reader-centered framing: "You might..." not "One should..."
- Transformation examples: Before/after pairs
- Recognition patterns: Help readers notice, then transform

**AI layer** (Structured for parsing):
- Tables with clear headers
- Checklists with explicit criteria
- Terminology rules as substitution patterns

### Recognition Markers

Look for Fenton/Lee-style patterns. If missing from principle statements, voice may be too abstract:

- "You might..."
- "Here's what works better..."
- "Try this..."
- "Notice..."

### Heideggerian Connection

Human-accessible bridge to philosophical concepts:

| What It Feels Like | Canon Term | Heidegger Term |
|-------------------|------------|----------------|
| You don't notice the prose | Transparent writing | Zuhandenheit |
| You notice the prose | Writing breakdown | Vorhandenheit |
| Words that sound important but mean little | Marketing jargon | — |
| Safe statements that can't be disproven | Vague claims | — |
| Elements for "interest" not function | Decoration | — |

## Philosophy

The Voice is not a brand guideline—it's a philosophical commitment to clarity, honesty, and empirical rigor.

This audit helps enforce the Five Principles:

1. **Clarity Over Cleverness** — Write for your reader, not yourself.
2. **Specificity Over Generality** — Show what you mean.
3. **Honesty Over Polish** — Document both successes and failures.
4. **Useful Over Interesting** — Help readers implement, not just understand.
5. **Grounded Over Trendy** — Connect to timeless principles.

## Reference

- [voice-canon.md](../.claude/rules/voice-canon.md) — Ecosystem voice guidelines
- [taste-reference.md](../.claude/rules/taste-reference.md) — Writing style masters
