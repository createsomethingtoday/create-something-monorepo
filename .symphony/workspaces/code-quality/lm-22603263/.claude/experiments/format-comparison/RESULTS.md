# Format Comparison: JSON vs TOON vs CSV

**Hypothesis**: TOON offers token savings over JSON while maintaining structured data integrity for agent harness files.

## Measured Results

| Format | Bytes | Lines | Tokens~ | Savings |
|--------|-------|-------|---------|---------|
| JSON   | 1616  | 58    | 462     | —       |
| TOON   | 868   | 18    | 248     | 46.3%   |
| CSV    | 855   | 17    | 245     | 47.0%   |

## Practical Usability (Agent Perspective)

| Capability | JSON | TOON | CSV |
|------------|------|------|-----|
| Parse natively | ✓ | ○ | ✓ |
| Generate natively | ✓ | ○ | ✓ |
| Express hierarchy | ✓ | ✓ | ✗ |
| Tooling ecosystem | ✓ | ○ | ✓ |
| Human readable | ○ | ✓ | ✓ |

Legend: ✓ = Strong, ○ = Partial, ✗ = Weak

## Analysis: Subtractive Triad

### DRY (Implementation)
- **JSON**: Universal. Every tool, every language, every agent.
- **TOON**: Requires library. Creates dependency.
- **CSV**: Universal for tabular data. Built-in everywhere.

**Winner**: JSON/CSV (tie) — No new dependencies.

### Rams (Artifact)
Does the format earn its existence by removing redundancy?

- **JSON**: Repeats keys for every record. Verbose for tabular data.
- **TOON**: Headers declared once. Minimal redundancy.
- **CSV**: Headers declared once. Minimal redundancy.

**Winner**: TOON/CSV (tie) — ~47% token reduction.

### Heidegger (System)
Does the format serve the whole? Does it recede into transparent use?

- **JSON**: I can parse, generate, and modify without thinking about the format. It disappears.
- **TOON**: I must remember the syntax. The format becomes visible (Vorhandenheit).
- **CSV**: I understand it instantly, but metadata goes in comments. Partial hierarchy loss.

**Winner**: JSON — The tool recedes completely.

## Recommendation

**For agent harness files: CSV with structured comments.**

```csv
# project: create-something-monorepo
# session: 2025-12-08T16:30:00Z

id,description,status,tests_passing,complexity
auth-login,User login with email/password,completed,true,medium
dashboard-metrics,Display user activity metrics,in_progress,false,high

# progress: completed=2, in_progress=1, pending=2, total=5
# notes:
# - Dashboard metrics failing on aggregation query
```

**Rationale**:
1. **Token efficiency** matches TOON (~47% savings)
2. **Universal parsing** — No library needed
3. **Zuhandenheit preserved** — I don't think about CSV, I think through it
4. **Hierarchy via convention** — Metadata in comments, data in rows

For **deeply nested** data (e.g., configuration, ASTs), JSON remains correct.
For **tabular session state** (features, todos, progress), CSV wins.

## The Insight

TOON solves the wrong problem. Token efficiency matters, but **cognitive transparency** matters more. A format that saves 47% tokens but requires 10% more attention is a net loss for agent continuity.

CSV achieves the same savings while remaining invisible. The tool recedes.

> "The less we just stare at the hammer-thing, and the more we seize hold of it and use it, the more primordial does our relationship to it become."
> — Heidegger, Being and Time §15

CSV is the hammer that disappears.
