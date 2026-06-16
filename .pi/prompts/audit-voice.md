---
description: Run Voice compliance check on content files
argument-hint: "[path]"
---

# Voice Compliance Audit

Audit `$@` for CREATE SOMETHING Voice compliance.

## The Five Principles

1. **Clarity Over Cleverness** — Write for your reader, not yourself
2. **Specificity Over Generality** — Show what you mean
3. **Honesty Over Polish** — Document both successes and failures
4. **Useful Over Interesting** — Help readers implement, not just understand
5. **Grounded Over Trendy** — Connect to timeless principles

## Orwell's Rules

1. Never use a metaphor, simile, or figure of speech you've seen in print
2. Never use a long word where a short one will do
3. If it's possible to cut a word, cut it
4. Never use the passive where you can use the active
5. Never use jargon if you can think of an everyday equivalent
6. Break any of these rules sooner than say anything outright barbarous

## Banned Marketing Jargon

These words should NEVER appear: cutting-edge, revolutionary, game-changing, AI-powered (use "AI-native development"), leverage, synergy, solutions, best-in-class, world-class, industry-leading, transformative, innovative, seamless, robust, scalable

## Vague Claims to Flag

- "significantly improved/reduced" → Needs specific number
- "many users/customers" → Needs count
- "fast/faster performance" → Needs ms or %
- "substantial savings" → Needs dollar amount
- "enhanced experience" → Needs measurable outcome

## Terminology Corrections

| Wrong | Correct |
|-------|---------|
| AI-assisted / AI-powered | AI-native development |
| projects | experiments |
| blog posts / articles | papers |
| best practices | canonical standards |
| style guide | canonical standards |
| influences / inspiration | masters |

## Output Format

```
## Voice Audit: [path]

### Marketing Jargon (N)
1. **[file:line]**: `cutting-edge` — What do you actually mean?

### Vague Claims (N)
1. **[file:line]**: `Fast load times` → Replace with specific metric

### Orwell Violations (N)
1. **[file:line]**: `utilize` → Use `use` (Rule 2)

### Terminology (N)
1. **[file:line]**: `AI-powered` → Use `AI-native development`
```

Scan `.svelte`, `.md`, `.ts` files with content. Skip `node_modules`, `dist`, `build`.
